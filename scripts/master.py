#!/usr/bin/env python3
"""Run the repo discovery and commit loading pipeline.

This script:
1. runs 1_load_recent_repos.py
2. passes its TSV output into 2_load_recent_commits.py
3. saves the final TSV output to a file
"""

from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT.parent / "data" / "recent_commits.tsv"


def main() -> None:
    repos = subprocess.run(
        ["python3", str(ROOT / "1_load_recent_repos.py")],
        check=True,
        capture_output=True,
        text=True,
    )

    commits = subprocess.run(
        ["python3", str(ROOT / "2_load_recent_commits.py")],
        input=repos.stdout,
        check=True,
        capture_output=True,
        text=True,
    )

    OUTPUT.write_text(commits.stdout)
    print(f"Saved {OUTPUT}")


if __name__ == "__main__":
    main()
