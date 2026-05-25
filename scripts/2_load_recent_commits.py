#!/usr/bin/env python3
"""Load commits from the last 90 days for a list of repositories.

Input is TSV on stdin with a header row containing at least:
repo\tupdated_at\tprivate\tfork

Outputs TSV to stdout:
repo\tsha\tauthor_date\tcommitter_date\tmessage\turl
"""

from __future__ import annotations

import csv
import json
import sys
import subprocess
from datetime import datetime, timedelta, timezone

DAYS = 90
COMMIT_LIMIT = 100


def run_gh(args: list[str]) -> str:
    result = subprocess.run(["gh", *args], check=True, capture_output=True, text=True)
    return result.stdout


def fetch_commits(repo_full_name: str, cutoff: datetime) -> list[dict]:
    url = (
        f"repos/{repo_full_name}/commits"
        f"?per_page={COMMIT_LIMIT}&since={cutoff.isoformat().replace('+00:00', 'Z')}"
    )
    return json.loads(run_gh(["api", url]))


def main() -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=DAYS)
    reader = csv.DictReader(sys.stdin, delimiter="\t")

    print("repo\tsha\tauthor_date\tcommitter_date\tmessage\turl")
    for row in reader:
        repo_full_name = row.get("repo", "").strip()
        if not repo_full_name:
            continue

        try:
            commits = fetch_commits(repo_full_name, cutoff)
        except subprocess.CalledProcessError:
            continue

        for item in commits:
            commit = item.get("commit", {})
            author = commit.get("author", {})
            committer = commit.get("committer", {})
            message = (commit.get("message") or "").splitlines()[0]
            url = item.get("html_url") or item.get("url", "")
            print(
                "\t".join(
                    [
                        repo_full_name,
                        item.get("sha", ""),
                        author.get("date", ""),
                        committer.get("date", ""),
                        message,
                        url,
                    ]
                )
            )


if __name__ == "__main__":
    main()
