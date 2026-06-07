export const minuteLabels = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0'))
export const secondLabels = minuteLabels

export const seasonOrder = ['winter', 'spring', 'summer', 'autumn']
export const seasonLabels = {
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
}

export const halfYearOrder = ['h1', 'h2']
export const halfYearLabels = {
  h1: 'H1',
  h2: 'H2',
}

export function minuteCounts(rows, field = 'committer_date') {
  return unitCounts(rows, field, minuteIndex)
}

export function secondCounts(rows, field = 'committer_date') {
  return unitCounts(rows, field, secondIndex)
}

export function averageHourRows(commitRows, deploymentRows = []) {
  const commits = minuteCounts(commitRows)
  const deployments = minuteCounts(deploymentRows, 'deploy_at')
  const totalCommits = commits.reduce((sum, value) => sum + value, 0)

  return minuteLabels.map((label, minute) => ({
    minute,
    label: `:${label}`,
    commits: commits[minute],
    deployments: deployments[minute],
    total: commits[minute] + deployments[minute],
    commitProbability: totalCommits ? (commits[minute] / totalCommits) * 100 : 0,
  }))
}

export function averageSecondRows(commitRows, deploymentRows = []) {
  const commits = secondCounts(commitRows)
  const deployments = secondCounts(deploymentRows, 'deploy_at')

  return secondLabels.map((label, second) => ({
    second,
    label: `:${label}`,
    commits: commits[second],
    deployments: deployments[second],
    total: commits[second] + deployments[second],
  }))
}

export function yearSeasonProfiles(rows, { field = 'committer_date', timeZone = 'Europe/Paris' } = {}) {
  return groupedProfiles(rows, {
    field,
    timeZone,
    groupForParts: (parts) => seasonForMonth(parts.month),
    groupOrder: seasonOrder,
    labelForGroup: (group) => seasonLabels[group],
  })
}

export function yearHalfProfiles(rows, { field = 'committer_date', timeZone = 'Europe/Paris' } = {}) {
  return groupedProfiles(rows, {
    field,
    timeZone,
    groupForParts: (parts) => (Number(parts.month) <= 6 ? 'h1' : 'h2'),
    groupOrder: halfYearOrder,
    labelForGroup: (group) => halfYearLabels[group],
  })
}

export function averageHourRecords(commitRows, deploymentRows = [], { timeZone = 'Europe/Paris' } = {}) {
  const minuteRows = averageHourRows(commitRows, deploymentRows)
  const secondRows = averageSecondRows(commitRows, deploymentRows)
  const events = normalizeEvents(commitRows, deploymentRows)

  return {
    busiestMinuteOfHour: maxBy(minuteRows, (row) => row.commits),
    busiestSecondOfMinute: maxBy(secondRows, (row) => row.commits),
    busiestRealMinute: busiestEventBucket(events, (event) => localMinuteKey(event.timestamp, timeZone)),
    busiestRealHour: busiestEventBucket(events, (event) => localHourKey(event.timestamp, timeZone)),
    busiestRealDay: busiestEventBucket(events, (event) => localDayKey(event.timestamp, timeZone)),
  }
}

export function normalizeEvents(commitRows, deploymentRows = []) {
  const commits = commitRows
    .map((row) => eventFromRow(row, 'commit', row.committer_date))
    .filter(Boolean)
  const deployments = deploymentRows
    .map((row) => eventFromRow(row, 'deployment', row.deploy_at))
    .filter(Boolean)
  return [...commits, ...deployments].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export function profileForCounts(counts) {
  const total = counts.reduce((sum, value) => sum + value, 0)
  const beginning = sumRange(counts, 0, 20)
  const middle = sumRange(counts, 20, 40)
  const end = sumRange(counts, 40, 60)
  const peakMinute = counts.reduce((best, value, index) => (value > counts[best] ? index : best), 0)

  return {
    total,
    counts,
    beginning,
    middle,
    end,
    beginningShare: total ? beginning / total : 0,
    middleShare: total ? middle / total : 0,
    endShare: total ? end / total : 0,
    endMinusBeginning: total ? (end - beginning) / total : 0,
    peakMinute,
    peakCount: counts[peakMinute] || 0,
  }
}

export function minuteIndex(value) {
  const date = parseDate(value)
  return date ? date.getUTCMinutes() : null
}

export function secondIndex(value) {
  const date = parseDate(value)
  return date ? date.getUTCSeconds() : null
}

export function seasonForMonth(month) {
  const value = Number(month)
  if ([12, 1, 2].includes(value)) return 'winter'
  if ([3, 4, 5].includes(value)) return 'spring'
  if ([6, 7, 8].includes(value)) return 'summer'
  return 'autumn'
}

function groupedProfiles(rows, { field, timeZone, groupForParts, groupOrder, labelForGroup }) {
  const buckets = new Map()
  const years = new Set()

  for (const row of rows) {
    const timestamp = row[field]
    const parts = localParts(timestamp, timeZone)
    if (!parts) continue
    const year = parts.year
    const group = groupForParts(parts)
    years.add(year)
    const key = `${year}-${group}`
    const counts = buckets.get(key) || Array.from({ length: 60 }, () => 0)
    const minute = minuteIndex(timestamp)
    if (minute !== null) counts[minute] += 1
    buckets.set(key, counts)
  }

  return [...years]
    .sort((a, b) => Number(b) - Number(a))
    .flatMap((year) =>
      groupOrder.map((group) => ({
        year,
        group,
        label: labelForGroup(group),
        ...profileForCounts(buckets.get(`${year}-${group}`) || Array.from({ length: 60 }, () => 0)),
      })),
    )
}

function unitCounts(rows, field, indexer) {
  const counts = Array.from({ length: 60 }, () => 0)
  for (const row of rows) {
    const index = indexer(row[field])
    if (index !== null) counts[index] += 1
  }
  return counts
}

function eventFromRow(row, kind, timestamp) {
  if (!parseDate(timestamp)) return null
  return {
    kind,
    timestamp,
    repo: row.repo || '',
    message: row.message || '',
    url: row.url || row.environment_url || row.pages_url || row.log_url || '',
    theme: row.message_theme || '',
  }
}

function busiestEventBucket(events, keyForEvent) {
  const buckets = new Map()
  for (const event of events) {
    const key = keyForEvent(event)
    if (!key) continue
    const bucket = buckets.get(key) || {
      key,
      events: [],
      commitCount: 0,
      deploymentCount: 0,
      eventCount: 0,
      repos: new Set(),
      messages: [],
    }
    bucket.events.push(event)
    bucket.eventCount += 1
    if (event.kind === 'commit') {
      bucket.commitCount += 1
      if (event.message) bucket.messages.push(event.message)
    } else {
      bucket.deploymentCount += 1
    }
    if (event.repo) bucket.repos.add(event.repo)
    buckets.set(key, bucket)
  }

  const best = maxBy([...buckets.values()], (bucket) => bucket.commitCount * 100000 + bucket.eventCount)
  if (!best) return null
  return {
    ...best,
    repos: [...best.repos].sort(),
    messages: best.messages.slice(0, 8),
  }
}

function localParts(value, timeZone) {
  const date = parseDate(value)
  if (!date) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(date)
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
}

function localDayKey(value, timeZone) {
  const parts = localParts(value, timeZone)
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : ''
}

function localHourKey(value, timeZone) {
  const parts = localParts(value, timeZone)
  return parts ? `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:00` : ''
}

function localMinuteKey(value, timeZone) {
  const parts = localParts(value, timeZone)
  return parts ? `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}` : ''
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function maxBy(rows, score) {
  return rows.reduce((best, row) => {
    if (!best) return row
    return score(row) > score(best) ? row : best
  }, null)
}

function sumRange(values, start, end) {
  return values.slice(start, end).reduce((sum, value) => sum + value, 0)
}
