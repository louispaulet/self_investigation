import { repoCounts } from '../data'

export function getRepoChartData(rows, normalizeRepos) {
  const top = repoCounts(rows).slice(0, 10)
  const byRepo = new Map()
  for (const row of rows) {
    const repo = row.repo?.trim()
    const date = row.author_date || row.authorDate || row.date
    if (!repo || !date) continue
    const projectDays = byRepo.get(repo) || new Set()
    projectDays.add(date.slice(0, 10))
    byRepo.set(repo, projectDays)
  }
  return top.map((item) => {
    const daysSpent = byRepo.get(item.repo)?.size || 0
    const normalized = daysSpent ? item.commits / daysSpent : 0
    return { repo: item.repo, commits: normalizeRepos ? Number(normalized.toFixed(2)) : item.commits, daysSpent }
  })
}
