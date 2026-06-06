# AGENTS.md

## Project overview

This project is for investigating your GitHub activity using the local `gh` CLI. The goal is to analyze:

- which commits were pushed
- when they were pushed
- when GitHub Pages deployments finished
- which project they belong to
- how often you push
- how often you deploy public Pages projects
- commit message themes and inspirations
- commit and deployment timestamp patterns, including:
  - time of day you commit most
  - time of day you deploy most
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
- GitHub Pages configuration and deployment statuses

## Notes

- This is an empty project; create files as needed for analysis.
- Be careful to distinguish commit author time, commit commit time, push time, and PR merge time.
- Be careful to distinguish deployment creation time from successful deployment status time.
- When presenting results, separate raw measurements from interpretations.
- Read `tone_of_voice.md` before writing or revising app copy.
