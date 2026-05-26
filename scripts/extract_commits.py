#!/usr/bin/env python3
"""Export public owned-repository commits to TSV.

Full mode rewrites the last five years from GitHub.
Iterative mode starts from the latest stored committer_date, with a small
overlap window, then merges and deduplicates by repo + sha.
"""

from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

import extract_repos

USER = "louispaulet"
ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = ROOT / "data" / "commits_5y.tsv"
WEB_OUTPUT = ROOT / "web" / "public" / "data" / "commits_5y.tsv"
DEFAULT_SINCE = "2021-05-26T00:00:00Z"
OVERLAP_DAYS = 2
FIELDS = [
    "repo",
    "sha",
    "author_date",
    "committer_date",
    "message",
    "url",
    "author_login",
    "committer_login",
    "additions",
    "deletions",
    "changed_files",
]


def run_gh(args: list[str]) -> str:
    result = subprocess.run(["gh", *args], check=True, capture_output=True, text=True)
    return result.stdout


def parse_dt(value: str) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def gh_dt(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def sanitize(value: str) -> str:
    return " ".join((value or "").replace("\t", " ").splitlines()).strip()


def read_existing(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="") as handle:
        return list(csv.DictReader(handle, delimiter="\t"))


def latest_committer_date(rows: list[dict[str, str]]) -> datetime | None:
    dates = [parse_dt(row.get("committer_date", "")) for row in rows]
    dates = [date for date in dates if date]
    return max(dates) if dates else None


def fetch_commit_page(repo: str, since: str, page: int) -> list[dict]:
    endpoint = f"repos/{repo}/commits?since={quote(since)}&per_page=100&page={page}"
    return json.loads(run_gh(["api", endpoint]))


def fetch_commit_detail(repo: str, sha: str) -> dict:
    return json.loads(run_gh(["api", f"repos/{repo}/commits/{sha}"]))


def commit_row(repo: str, item: dict, detail: dict | None) -> dict[str, str]:
    commit = item.get("commit", {})
    author = commit.get("author", {})
    committer = commit.get("committer", {})
    detail = detail or {}
    stats = detail.get("stats") or {}
    files = detail.get("files") or []
    author_user = item.get("author") or {}
    committer_user = item.get("committer") or {}
    return {
        "repo": repo,
        "sha": item.get("sha", ""),
        "author_date": author.get("date", ""),
        "committer_date": committer.get("date", ""),
        "message": sanitize((commit.get("message") or "").splitlines()[0]),
        "url": item.get("html_url") or item.get("url", ""),
        "author_login": author_user.get("login", ""),
        "committer_login": committer_user.get("login", ""),
        "additions": str(stats.get("additions", "")),
        "deletions": str(stats.get("deletions", "")),
        "changed_files": str(len(files) if files else ""),
    }


def fetch_repo_commits(repo: str, since: str, delay: float) -> list[dict[str, str]]:
    rows = []
    page = 1
    while True:
        commits = fetch_commit_page(repo, since, page)
        if not commits:
            break
        print(f"{repo}: page {page}, {len(commits)} commits", file=sys.stderr)
        for item in commits:
            sha = item.get("sha", "")
            detail = None
            if sha:
                try:
                    detail = fetch_commit_detail(repo, sha)
                    if delay:
                        time.sleep(delay)
                except subprocess.CalledProcessError as exc:
                    print(f"Warning: failed commit detail {repo}@{sha}: {exc}", file=sys.stderr)
            rows.append(commit_row(repo, item, detail))
        if len(commits) < 100:
            break
        page += 1
    return rows


def merge_rows(existing: list[dict[str, str]], fresh: list[dict[str, str]]) -> list[dict[str, str]]:
    merged: dict[tuple[str, str], dict[str, str]] = {}
    for row in existing + fresh:
        repo = row.get("repo", "")
        sha = row.get("sha", "")
        if repo and sha:
            merged[(repo, sha)] = {field: row.get(field, "") for field in FIELDS}
    return sorted(
        merged.values(),
        key=lambda row: (row.get("committer_date", ""), row.get("repo", ""), row.get("sha", "")),
        reverse=True,
    )


def write_tsv(rows: list[dict[str, str]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, delimiter="\t", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["full", "iterative"], default="iterative")
    parser.add_argument("--user", default=USER)
    parser.add_argument("--since", default=DEFAULT_SINCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--sync-web", action="store_true")
    parser.add_argument("--detail-delay", type=float, default=0.0)
    args = parser.parse_args()

    existing = [] if args.mode == "full" else read_existing(args.output)
    since = args.since
    latest = latest_committer_date(existing)
    if args.mode == "iterative" and latest:
        since = gh_dt(latest - timedelta(days=OVERLAP_DAYS))

    repos = extract_repos.load_repos(args.user)
    fresh = []
    print(f"Fetching commits since {since} from {len(repos)} repos", file=sys.stderr)
    for repo in repos:
        fresh.extend(fetch_repo_commits(repo["repo"], since, args.detail_delay))

    rows = merge_rows(existing, fresh)
    write_tsv(rows, args.output)
    if args.sync_web:
        write_tsv(rows, WEB_OUTPUT)
    print(f"Saved {len(rows)} commits to {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
