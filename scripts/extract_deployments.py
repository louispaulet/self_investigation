#!/usr/bin/env python3
"""Export GitHub Pages deployments for public owned repositories to TSV.

Full mode rewrites all GitHub Pages deployments available through GitHub.
Iterative mode starts from the latest stored deployment creation timestamp,
with a small overlap window, then merges and deduplicates by repo + deployment id.
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

import extract_repos

USER = "louispaulet"
ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = ROOT / "data" / "deployments_gh_pages.tsv"
WEB_OUTPUT = ROOT / "web" / "public" / "data" / "deployments_gh_pages.tsv"
OVERLAP_DAYS = 2
FIELDS = [
    "repo",
    "deployment_id",
    "sha",
    "ref",
    "deployment_created_at",
    "deployment_updated_at",
    "latest_status",
    "status_created_at",
    "deploy_at",
    "environment_url",
    "log_url",
    "creator_login",
    "pages_url",
    "pages_cname",
    "pages_build_type",
    "pages_source_branch",
]


def run_gh(args: list[str], allow_not_found: bool = False) -> str | None:
    result = subprocess.run(["gh", *args], capture_output=True, text=True)
    if result.returncode == 0:
        return result.stdout
    if allow_not_found and ("HTTP 404" in result.stderr or "Not Found" in result.stderr):
        return None
    raise subprocess.CalledProcessError(result.returncode, ["gh", *args], result.stdout, result.stderr)


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


def latest_deployment_created_at(rows: list[dict[str, str]]) -> datetime | None:
    dates = [parse_dt(row.get("deployment_created_at", "")) for row in rows]
    dates = [date for date in dates if date]
    return max(dates) if dates else None


def fetch_pages(repo: str) -> dict | None:
    payload = run_gh(["api", f"repos/{repo}/pages"], allow_not_found=True)
    return json.loads(payload) if payload else None


def fetch_deployment_page(repo: str, page: int) -> list[dict]:
    endpoint = f"repos/{repo}/deployments?environment=github-pages&per_page=100&page={page}"
    payload = run_gh(["api", endpoint])
    return json.loads(payload or "[]")


def fetch_statuses(repo: str, deployment_id: str) -> list[dict]:
    rows = []
    page = 1
    while True:
        endpoint = f"repos/{repo}/deployments/{deployment_id}/statuses?per_page=100&page={page}"
        payload = run_gh(["api", endpoint])
        statuses = json.loads(payload or "[]")
        rows.extend(statuses)
        if len(statuses) < 100:
            break
        page += 1
    return sorted(rows, key=lambda item: item.get("created_at", ""), reverse=True)


def pick_success_status(statuses: list[dict]) -> dict:
    successful = [status for status in statuses if status.get("state") == "success"]
    return successful[0] if successful else {}


def deployment_row(repo: str, pages: dict, deployment: dict, statuses: list[dict]) -> dict[str, str]:
    latest_status = statuses[0] if statuses else {}
    success_status = pick_success_status(statuses)
    display_status = success_status or latest_status
    source = pages.get("source") or {}
    creator = deployment.get("creator") or {}
    return {
        "repo": repo,
        "deployment_id": str(deployment.get("id", "")),
        "sha": deployment.get("sha", ""),
        "ref": deployment.get("ref", ""),
        "deployment_created_at": deployment.get("created_at", ""),
        "deployment_updated_at": deployment.get("updated_at", ""),
        "latest_status": latest_status.get("state", ""),
        "status_created_at": latest_status.get("created_at", ""),
        "deploy_at": success_status.get("created_at", ""),
        "environment_url": display_status.get("environment_url", "") or pages.get("html_url", ""),
        "log_url": display_status.get("log_url", "") or display_status.get("target_url", ""),
        "creator_login": creator.get("login", ""),
        "pages_url": pages.get("html_url", ""),
        "pages_cname": sanitize(pages.get("cname", "") or ""),
        "pages_build_type": pages.get("build_type", ""),
        "pages_source_branch": source.get("branch", ""),
    }


def fetch_repo_deployments(repo: str, pages: dict, since: datetime | None, delay: float) -> list[dict[str, str]]:
    rows = []
    page = 1
    while True:
        deployments = fetch_deployment_page(repo, page)
        if not deployments:
            break
        print(f"{repo}: page {page}, {len(deployments)} deployments", file=sys.stderr)
        page_has_new_rows = False
        for deployment in deployments:
            created_at = parse_dt(deployment.get("created_at", ""))
            if since and created_at and created_at < since:
                continue
            page_has_new_rows = True
            deployment_id = str(deployment.get("id", ""))
            statuses = fetch_statuses(repo, deployment_id) if deployment_id else []
            rows.append(deployment_row(repo, pages, deployment, statuses))
            if delay:
                time.sleep(delay)
        if len(deployments) < 100 or (since and not page_has_new_rows):
            break
        page += 1
    return rows


def merge_rows(existing: list[dict[str, str]], fresh: list[dict[str, str]]) -> list[dict[str, str]]:
    merged: dict[tuple[str, str], dict[str, str]] = {}
    for row in existing + fresh:
        repo = row.get("repo", "")
        deployment_id = row.get("deployment_id", "")
        if repo and deployment_id:
            merged[(repo, deployment_id)] = {field: row.get(field, "") for field in FIELDS}
    return sorted(
        merged.values(),
        key=lambda row: (row.get("deploy_at") or row.get("deployment_created_at", ""), row.get("repo", ""), row.get("deployment_id", "")),
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
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--sync-web", action="store_true")
    parser.add_argument("--status-delay", type=float, default=0.0)
    args = parser.parse_args()

    existing = [] if args.mode == "full" else read_existing(args.output)
    latest = latest_deployment_created_at(existing)
    since = latest - timedelta(days=OVERLAP_DAYS) if args.mode == "iterative" and latest else None
    if since:
        print(f"Fetching GitHub Pages deployments created since {gh_dt(since)}", file=sys.stderr)
    else:
        print("Fetching all available GitHub Pages deployments", file=sys.stderr)

    repos = extract_repos.load_repos(args.user)
    fresh = []
    pages_repos = 0
    for repo in repos:
        name = repo["repo"]
        pages = fetch_pages(name)
        if not pages:
            continue
        pages_repos += 1
        fresh.extend(fetch_repo_deployments(name, pages, since, args.status_delay))

    rows = merge_rows(existing, fresh)
    write_tsv(rows, args.output)
    if args.sync_web:
        write_tsv(rows, WEB_OUTPUT)
    print(f"Saved {len(rows)} deployments from {pages_repos} GitHub Pages repositories to {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
