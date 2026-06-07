# Commit Message Themes

This analysis tags the 2,208 commits in `data/commits_5y.tsv` with a fixed message taxonomy. The labels were generated with `scripts/tag_commits.py` using `gpt-5.4-mini`, validated against a structured schema, and written into the commit TSV as `message_theme`, `message_subtheme`, `commit_kind`, `theme_confidence`, and `theme_source`.

## Raw measurements

| Theme | Commits |
| --- | ---: |
| Feature additions | 357 |
| Visual UI / layout | 279 |
| Docs / instructions | 178 |
| Content / writing | 174 |
| Branding / media assets | 149 |
| Initial setup / bootstrap | 132 |
| Data extraction / datasets | 119 |
| Pages deploy / domains | 115 |
| Fixes / stabilization | 109 |
| Cleanup / removal | 79 |
| Dependencies / config | 78 |
| Refactor / organization | 74 |
| Analytics / charts | 69 |
| Tests / quality checks | 57 |
| Navigation / routing | 57 |
| Crawler / SEO / metadata | 54 |
| AI / model experiments | 35 |
| Maps / graph views | 29 |
| Games / interactive demos | 29 |
| Portfolio / showcase | 23 |
| Search / filtering | 9 |
| Unclassified | 3 |

The old `Other` bucket is gone. The model tagged every row directly, with no rule fallback needed. Three commits remain `Unclassified`; all three are branch merge messages without enough message detail to infer a theme.

## Fine-grained columns

The dashboard plots major themes to keep the chart readable. The TSV also keeps `message_subtheme` for row-level inspection. These subthemes capture smaller units of work such as favicon changes, CNAME/domain edits, crawler metadata passes, tests, README updates, graph navigation, model experiments, and deployment refreshes.

The tag source is recorded in `theme_source`. In the current run all 2,208 rows have `theme_source=model`.

## Interpretation

The largest category is feature additions, followed by interface/layout work. This suggests a pattern of building usable pieces, then spending substantial time on the way those pieces read, behave, and present themselves.

Documentation, content, branding, bootstrap, data extraction, and deployment work all appear as meaningful repeated activities. The activity is spread across product surfaces, source data, public presentation, and project maintenance rather than concentrated in one narrow kind of commit.

These tags describe observable commit-message traces. They should be read as activity signals, not as a complete record of intent.
