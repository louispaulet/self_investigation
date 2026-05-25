# AGENTS.md

## Project overview

This project is for investigating your GitHub activity using the local `gh` CLI. The goal is to analyze:

- which commits were pushed
- when they were pushed
- which project they belong to
- how often you push
- commit message themes and inspirations
- commit timestamp patterns, including:
  - time of day you commit most
  - time of day you push most
  - time of day you merge PRs
  - possible bedtime patterns
  - day-of-week patterns
  - frequency by week, month, and year

## Working style

- Use the local `gh` tool and shell commands to gather data.
- Prefer reproducible commands and scripts.
- Keep intermediate data in the project directory when useful.
- Document assumptions, data sources, and limitations clearly.
- If something cannot be inferred reliably from GitHub data, say so.
- After every change, commit and push it.
- Always commit and push any new file or modification.
- Use a simple, concise commit message.

## Suggested analysis sources

- `gh repo list`
- `gh search commits`
- `gh api`
- repository commit history
- PR history and merge timestamps
- commit messages and author timestamps

## Notes

- This is an empty project; create files as needed for analysis.
- Be careful to distinguish commit author time, commit commit time, push time, and PR merge time.
- When presenting results, separate raw measurements from interpretations.
