#!/usr/bin/env python3
"""Run the GitHub data refresh pipeline."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["full", "iterative"], default="iterative")
    args = parser.parse_args()

    subprocess.run(["python3", str(ROOT / "extract_repos.py"), "--sync-web"], check=True)
    subprocess.run(
        ["python3", str(ROOT / "extract_commits.py"), "--mode", args.mode, "--sync-web"],
        check=True,
    )
    subprocess.run(
        ["python3", str(ROOT / "extract_deployments.py"), "--mode", args.mode, "--sync-web"],
        check=True,
    )


if __name__ == "__main__":
    main()
