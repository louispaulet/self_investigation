#!/usr/bin/env python3
"""List repositories updated within the last 90 days for a GitHub user.

Outputs TSV to stdout:
repo\tupdated_at\tprivate\tfork
"""

from __future__ import annotations

import json
import subprocess
from datetime import datetime, timedelta, timezone

USER = "louispaulet"
DAYS = 90
REPO_LIMIT = 200


def run_gh(args: list[str]) -> str:
    result = subprocess.run(["gh", *args], check=True, capture_output=True, text=True)
    return result.stdout


def parse_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def main() -> None:
    repos = json.loads(
        run_gh([
            "repo",
            "list",
            USER,
            "--limit",
            str(REPO_LIMIT),
            "--json",
            "nameWithOwner,updatedAt,isPrivate,isFork",
        ])
    )
    cutoff = datetime.now(timezone.utc) - timedelta(days=DAYS)

    print("repo\tupdated_at\tprivate\tfork")
    for repo in sorted(repos, key=lambda x: x["updatedAt"], reverse=True):
        updated_at = parse_dt(repo["updatedAt"])
        if updated_at >= cutoff:
            print(
                f"{repo['nameWithOwner']}\t{repo['updatedAt']}\t"
                f"{repo['isPrivate']}\t{repo['isFork']}"
            )


if __name__ == "__main__":
    main()
