export const hours = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)
export const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const bedtimeHours = ['20', '21', '22', '23', '00', '01', '02', '03']
export const sourcePath = `${import.meta.env.BASE_URL}data/commits_5y.tsv`
export const deploymentsSourcePath = `${import.meta.env.BASE_URL}data/deployments_gh_pages.tsv`
export const reposSourcePath = `${import.meta.env.BASE_URL}data/repos.tsv`
export const zone = { key: 'Europe/Paris', label: 'Paris' }
export const colors = ['#14b8a6', '#f59e0b', '#38bdf8', '#84cc16', '#f472b6', '#a78bfa', '#fb7185', '#22c55e']
export const themeColors = [
  '#14b8a6',
  '#f59e0b',
  '#38bdf8',
  '#84cc16',
  '#f472b6',
  '#a78bfa',
  '#fb7185',
  '#22c55e',
  '#f97316',
  '#06b6d4',
  '#eab308',
  '#8b5cf6',
  '#10b981',
  '#ef4444',
  '#6366f1',
  '#d946ef',
  '#0ea5e9',
  '#65a30d',
  '#f43f5e',
  '#fde047',
]

export function bestIndex(values) {
  let index = 0
  for (let i = 1; i < values.length; i += 1) if (values[i] > values[index]) index = i
  return index
}

export function within(date, now, hours) {
  if (!date) return false
  const delta = now - new Date(date).getTime()
  return delta >= 0 && delta <= hours * 60 * 60 * 1000
}
