import Papa from 'papaparse'

export function parseTsv(text) {
  return Papa.parse(text, {
    header: true,
    delimiter: '\t',
    skipEmptyLines: true,
    transform: (value) => value.trim(),
  }).data
}

export function hourCounts(rows, timeZone = 'UTC', field = 'committer_date') {
  const counts = Array.from({ length: 24 }, () => 0)
  for (const row of rows) {
    const date = pickDate(row, field)
    if (!date) continue
    const hour = Number(getHour(date, timeZone))
    if (!Number.isNaN(hour)) counts[hour] += 1
  }
  return counts
}

export function dayCounts(rows, timeZone = 'UTC', field = 'committer_date') {
  const counts = Array.from({ length: 7 }, () => 0)
  for (const row of rows) {
    const date = pickDate(row, field)
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
    const date = pickDate(row)
    if (!date) continue
    const hour = Number(getHour(date, timeZone))
    if (Number.isNaN(hour)) continue
    if (hour >= 20 || hour < 4) counts[bedtimeBucketIndex(hour)] += 1
  }
  return counts
}

export function totalStats(rows, timeZone = 'UTC') {
  const repos = new Set()
  const activeDays = new Set()
  let additions = 0
  let deletions = 0
  let changedFiles = 0
  for (const row of rows) {
    if (row.repo) repos.add(row.repo)
    const day = localDateKey(pickDate(row), timeZone)
    if (day) activeDays.add(day)
    additions += toNumber(row.additions)
    deletions += toNumber(row.deletions)
    changedFiles += toNumber(row.changed_files)
  }
  return {
    commits: rows.length,
    repos: repos.size,
    activeDays: activeDays.size,
    additions,
    deletions,
    changedFiles,
    longestStreak: longestStreak([...activeDays].sort()),
  }
}

export function monthCounts(rows, timeZone = 'UTC') {
  const counts = new Map()
  for (const row of rows) {
    const key = localMonthKey(pickDate(row), timeZone)
    if (key) counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, commits]) => ({ month, commits }))
}

export function yearCounts(rows, timeZone = 'UTC') {
  const counts = new Map()
  for (const row of rows) {
    const key = localYearKey(pickDate(row), timeZone)
    if (key) counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([year, commits]) => ({ year, commits }))
}

export function weekCounts(rows, timeZone = 'UTC') {
  const counts = new Map()
  for (const row of rows) {
    const day = localDateKey(pickDate(row), timeZone)
    if (!day) continue
    const week = weekKey(day)
    counts.set(week, (counts.get(week) || 0) + 1)
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, commits]) => ({ week, commits }))
}

export function themeCounts(rows) {
  const themes = [
    ['Feature work', /\b(add|create|build|implement|new|initial|support)\b/i],
    ['Fixes', /\b(fix|repair|bug|correct|resolve|patch)\b/i],
    ['Design polish', /\b(style|design|ui|visual|polish|layout|responsive|chart)\b/i],
    ['Data & analysis', /\b(data|analysis|stats|extract|load|parse|csv|tsv)\b/i],
    ['Docs & copy', /\b(doc|readme|copy|text|about|instruction|note)\b/i],
    ['Refactor & cleanup', /\b(refactor|clean|remove|split|rename|organize)\b/i],
    ['Deploy & config', /\b(deploy|publish|config|vite|package|build|workflow)\b/i],
  ]
  const counts = new Map(themes.map(([name]) => [name, 0]))
  counts.set('Other', 0)
  for (const row of rows) {
    const message = row.message || ''
    const match = themes.find(([, pattern]) => pattern.test(message))
    const key = match ? match[0] : 'Other'
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([theme, commits]) => ({ theme, commits }))
    .sort((a, b) => b.commits - a.commits || a.theme.localeCompare(b.theme))
}

export function recentCommits(rows, count = 8) {
  return [...rows]
    .sort((a, b) => new Date(pickDate(b)).getTime() - new Date(pickDate(a)).getTime())
    .slice(0, count)
}

function bedtimeBucketIndex(hour) {
  if (hour >= 20) return hour - 20
  return hour + 4
}

function pickDate(row, field = 'committer_date') {
  return row[field] || row.committer_date || row.author_date || row.authorDate || row.date
}

function getHour(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone,
  }).format(new Date(date))
}

function getDay(date, timeZone) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone,
  }).format(new Date(date))
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday)
}

function localDateKey(date, timeZone) {
  if (!date) return ''
  const parts = dateParts(date, timeZone)
  if (!parts.year) return ''
  return `${parts.year}-${parts.month}-${parts.day}`
}

function localMonthKey(date, timeZone) {
  if (!date) return ''
  const parts = dateParts(date, timeZone)
  return parts.year ? `${parts.year}-${parts.month}` : ''
}

function localYearKey(date, timeZone) {
  if (!date) return ''
  return dateParts(date, timeZone).year || ''
}

function dateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(new Date(date))
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
}

function weekKey(dayKey) {
  const date = new Date(`${dayKey}T00:00:00Z`)
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function longestStreak(dayKeys) {
  let best = 0
  let current = 0
  let previous = null
  for (const key of dayKeys) {
    const value = new Date(`${key}T00:00:00Z`).getTime()
    current = previous !== null && value - previous === 86400000 ? current + 1 : 1
    best = Math.max(best, current)
    previous = value
  }
  return best
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}
