#!/usr/bin/env python3
"""Export public, owned, non-fork GitHub repositories to TSV."""

from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from pathlib import Path

USER = "louispaulet"
ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = ROOT / "data" / "repos.tsv"
WEB_OUTPUT = ROOT / "web" / "public" / "data" / "repos.tsv"
FIELDS = ["repo", "updated_at", "created_at", "description", "default_branch"]


def run_gh(args: list[str]) -> str:
    result = subprocess.run(["gh", *args], check=True, capture_output=True, text=True)
    return result.stdout


def load_repos(user: str) -> list[dict[str, str]]:
    payload = run_gh(
        [
            "repo",
            "list",
            user,
            "--limit",
            "1000",
            "--json",
            "nameWithOwner,updatedAt,createdAt,description,isPrivate,isFork,defaultBranchRef",
        ]
    )
    repos = json.loads(payload)
    rows = []
    for repo in repos:
        if repo.get("isPrivate") or repo.get("isFork"):
            continue
        default_branch = repo.get("defaultBranchRef") or {}
        rows.append(
            {
                "repo": repo.get("nameWithOwner", ""),
                "updated_at": repo.get("updatedAt", ""),
                "created_at": repo.get("createdAt", ""),
                "description": sanitize(repo.get("description") or ""),
                "default_branch": default_branch.get("name", ""),
            }
        )
    return sorted(rows, key=lambda row: row["repo"])


def sanitize(value: str) -> str:
    return " ".join(value.replace("\t", " ").splitlines()).strip()


def write_tsv(rows: list[dict[str, str]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, delimiter="\t", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--user", default=USER)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--sync-web", action="store_true")
    args = parser.parse_args()

    rows = load_repos(args.user)
    write_tsv(rows, args.output)
    if args.sync_web:
        write_tsv(rows, WEB_OUTPUT)
    print(f"Saved {len(rows)} public owned repositories to {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
