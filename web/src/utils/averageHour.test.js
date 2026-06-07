import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  averageHourRecords,
  averageHourRows,
  averageSecondRows,
  minuteCounts,
  secondCounts,
  yearHalfProfiles,
  yearSeasonProfiles,
} from './averageHour.js'

const commits = [
  { repo: 'louispaulet/a', committer_date: '2026-01-10T10:18:03Z', message: 'Add first chart' },
  { repo: 'louispaulet/a', committer_date: '2026-01-10T10:18:15Z', message: 'Refine first chart' },
  { repo: 'louispaulet/b', committer_date: '2026-07-10T12:43:15Z', message: 'Build summer view' },
  { repo: 'louispaulet/c', committer_date: '2025-12-25T21:59:59Z', message: 'Ship winter page' },
  { repo: 'louispaulet/c', committer_date: '', message: 'Ignored' },
]

const deployments = [
  { repo: 'louispaulet/a', deploy_at: '2026-01-10T10:18:41Z' },
  { repo: 'louispaulet/b', deploy_at: '2026-07-10T12:44:10Z' },
]

describe('average hour utilities', () => {
  it('counts commits by minute while ignoring timestamp hour and day', () => {
    const counts = minuteCounts(commits)

    assert.equal(counts[18], 2)
    assert.equal(counts[43], 1)
    assert.equal(counts[59], 1)
    assert.equal(counts.reduce((sum, value) => sum + value, 0), 4)
  })

  it('counts commits by second independently from the minute', () => {
    const rows = averageSecondRows(commits, deployments)
    const counts = secondCounts(commits)

    assert.equal(counts[15], 2)
    assert.equal(rows[10].deployments, 1)
    assert.equal(rows[41].deployments, 1)
  })

  it('returns minute probabilities that sum to 100 percent for commits', () => {
    const rows = averageHourRows(commits, deployments)
    const totalProbability = rows.reduce((sum, row) => sum + row.commitProbability, 0)

    assert.equal(rows[18].commits, 2)
    assert.equal(rows[18].deployments, 1)
    assert.ok(Math.abs(totalProbability - 100) < 0.000001)
  })

  it('builds season and half-year profiles by local Paris year/month', () => {
    const seasons = yearSeasonProfiles(commits)
    const halves = yearHalfProfiles(commits)
    const winter2026 = seasons.find((row) => row.year === '2026' && row.group === 'winter')
    const summer2026 = seasons.find((row) => row.year === '2026' && row.group === 'summer')
    const h12026 = halves.find((row) => row.year === '2026' && row.group === 'h1')
    const h22026 = halves.find((row) => row.year === '2026' && row.group === 'h2')

    assert.equal(winter2026.total, 2)
    assert.equal(winter2026.beginning, 2)
    assert.equal(summer2026.total, 1)
    assert.equal(summer2026.end, 1)
    assert.equal(h12026.total, 2)
    assert.equal(h22026.total, 1)
  })

  it('finds average-hour records and real time buckets', () => {
    const records = averageHourRecords(commits, deployments)

    assert.equal(records.busiestMinuteOfHour.minute, 18)
    assert.equal(records.busiestSecondOfMinute.second, 15)
    assert.equal(records.busiestRealMinute.key, '2026-01-10 11:18')
    assert.equal(records.busiestRealMinute.commitCount, 2)
    assert.equal(records.busiestRealMinute.deploymentCount, 1)
    assert.equal(records.busiestRealHour.key, '2026-01-10 11:00')
    assert.equal(records.busiestRealDay.key, '2026-01-10')
  })
})
