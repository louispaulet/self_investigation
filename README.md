# self_investigation

A small project for investigating GitHub activity using the local `gh` CLI.

## Goal

Analyze your GitHub history to understand:

- which commits you pushed
- when you pushed them
- which project they belong to
- how often you push
- commit message themes and inspirations
- timestamp patterns, including:
  - time of day you commit most
  - time of day you push most
  - time of day you merge PRs
  - possible bedtime patterns
  - day-of-week patterns
  - frequency by week, month, and year

## Approach

This project will rely on GitHub data gathered locally with `gh`, such as:

- repository lists
- commit history
- pull request history and merge timestamps
- commit messages and author timestamps

## Data refresh

Run a full five-year refresh with:

```sh
python3 scripts/master.py --mode full
```

Run an iterative refresh every couple of weeks with:

```sh
python3 scripts/master.py --mode iterative
```

The committed dashboard data lives in `data/commits_5y.tsv` and is mirrored to
`web/public/data/commits_5y.tsv` so the website can parse it in the browser.
Private repositories and forks are excluded.

## Notes

- Distinguish between commit author time, commit time, push time, and PR merge time.
- Keep raw data and derived analysis separate.
- Document any assumptions and limitations clearly.

## Future work

Add scripts or notebooks to:

- collect GitHub data
- normalize timestamps and time zones
- analyze patterns over time
- generate summaries and charts
