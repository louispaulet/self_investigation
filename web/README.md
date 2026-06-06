# self_investigation web

React and Vite app for the GitHub activity dashboard.

## Data

The app reads TSV files from `public/data`:

- `commits_5y.tsv` for commit charts
- `deployments_gh_pages.tsv` for GitHub Pages deployment charts
- `repos.tsv` for repository context

Refresh data from the repository root with:

```sh
python3 scripts/master.py --mode iterative
```

## Local development

```sh
npm install
npm run dev
```

## Validation and deployment

```sh
npm run lint
npm run build
cd ..
make deploy
```
