export const hours = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)
export const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const bedtimeHours = ['20', '21', '22', '23', '00', '01', '02', '03']
export const sourcePath = '/self_investigation/data/recent_commits.tsv'
export const zone = { key: 'Europe/Paris', label: 'Paris' }
export const colors = ['#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa']

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
