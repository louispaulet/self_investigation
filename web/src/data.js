import Papa from 'papaparse'

export function parseTsv(text) {
  return Papa.parse(text, {
    header: true,
    delimiter: '\t',
    skipEmptyLines: true,
  }).data
}

export function hourCounts(rows, timeZone = 'UTC') {
  const counts = Array.from({ length: 24 }, () => 0)
  for (const row of rows) {
    const date = row.author_date || row.authorDate || row.date
    if (!date) continue
    const hour = getHour(date, timeZone)
    if (!Number.isNaN(hour)) counts[hour] += 1
  }
  return counts
}

export function dayCounts(rows, timeZone = 'UTC') {
  const counts = Array.from({ length: 7 }, () => 0)
  for (const row of rows) {
    const date = row.author_date || row.authorDate || row.date
    if (!date) continue
    const day = getDay(date, timeZone)
    if (!Number.isNaN(day)) counts[day] += 1
  }
  return counts
}

export function repoCounts(rows) {
  const counts = new Map()
  for (const row of rows) {
    const repo = row.repo?.trim()
    if (!repo) continue
    counts.set(repo, (counts.get(repo) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([repo, commits]) => ({ repo, commits }))
    .sort((a, b) => b.commits - a.commits || a.repo.localeCompare(b.repo))
}

export function bedtimeCounts(rows, timeZone = 'UTC') {
  const counts = Array.from({ length: 8 }, () => 0)
  for (const row of rows) {
    const date = row.author_date || row.authorDate || row.date
    if (!date) continue
    const hour = Number(getHour(date, timeZone))
    if (Number.isNaN(hour)) continue
    if (hour >= 20 || hour < 4) counts[bedtimeBucketIndex(hour)] += 1
  }
  return counts
}

function bedtimeBucketIndex(hour) {
  if (hour >= 20) return hour - 20
  return hour + 4
}

function getHour(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone,
  }).format(new Date(date))
}

function getDay(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone,
  }).formatToParts(new Date(date)).find((part) => part.type === 'weekday')?.value
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
        new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          timeZone,
        }).format(new Date(date)),
      )
    : NaN
}
