import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ActivityBarChart from '../components/ActivityBarChart'
import InsightCard from '../components/InsightCard'
import SectionChart from '../components/SectionChart'
import SectionText from '../components/SectionText'
import StatCard from '../components/StatCard'
import SummarySection from '../components/SummarySection'
import ThemeStackedBarChart from '../components/ThemeStackedBarChart'
import {
  bedtimeCounts,
  dayCounts,
  hourCounts,
  monthCounts,
  parseTsv,
  recentCommits,
  themeCounts,
  themeMixByWeek,
  totalStats,
  weekCounts,
  yearCounts,
} from '../data'
import { bestIndex, bedtimeHours, days, hours, sourcePath, within, zone } from '../utils/activity'
import { getRepoChartData } from '../utils/repoCharts'

const emptyStats = { commits: 0, repos: 0, activeDays: 0, longestStreak: 0, additions: 0, deletions: 0, changedFiles: 0 }
const tooltipProps = {
  contentStyle: { background: '#07110f', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' },
  labelStyle: { color: '#cbd5e1', fontWeight: 600 },
}

export default function HomePage() {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [normalizeRepos, setNormalizeRepos] = useState(false)
  const [chartsReady, setChartsReady] = useState(false)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    fetch(sourcePath, { cache: 'no-store' })
      .then(async (res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text() })
      .then((text) => { if (!alive) return; setRows(parseTsv(text).filter((row) => row && row.committer_date && row.repo)); setStatus('ready') })
      .catch((err) => { if (!alive) return; setError(`Failed to load ${sourcePath}: ${err.message}`); setStatus('error') })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (status !== 'ready') return undefined
    const frame = window.requestAnimationFrame(() => setChartsReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [status])

  const hourData = useMemo(() => hourCounts(rows, zone.key), [rows])
  const dayData = useMemo(() => dayCounts(rows, zone.key), [rows])
  const bedtimeData = useMemo(() => bedtimeCounts(rows, zone.key), [rows])
  const repoChartData = useMemo(() => getRepoChartData(rows, normalizeRepos), [rows, normalizeRepos])
  const stats = useMemo(() => totalStats(rows, zone.key), [rows])
  const monthData = useMemo(() => monthCounts(rows, zone.key), [rows])
  const yearData = useMemo(() => yearCounts(rows, zone.key), [rows])
  const weekData = useMemo(() => weekCounts(rows, zone.key).slice(-52), [rows])
  const themes = useMemo(() => themeCounts(rows), [rows])
  const themeMix = useMemo(() => themeMixByWeek(rows, { timeZone: zone.key }), [rows])
  const latest = useMemo(() => recentCommits(rows), [rows])
  const recent24h = rows.filter((row) => within(row.committer_date, now, 24)).length
  const recent7d = rows.filter((row) => within(row.committer_date, now, 24 * 7)).length
  const recent30d = rows.filter((row) => within(row.committer_date, now, 24 * 30)).length
  const bestHour = bestIndex(hourData)
  const bestDay = bestIndex(dayData)
  const bedtimeTotal = bedtimeData.reduce((sum, value) => sum + value, 0)
  const busiestRepo = repoChartData[0]
  const maxMonth = monthData.reduce((best, item) => (item.commits > (best?.commits || 0) ? item : best), null)

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:items-start">
          <div className="flex flex-col gap-5">
            <p className="text-sm uppercase tracking-[0.35em] text-teal-200/80">self investigation</p>
            <h1 className="max-w-4xl text-4xl font-semibold text-white sm:text-6xl">Five years of GitHub attention</h1>
            <SectionText />
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-100/60">
              Last refreshed {formatLastUpdated(import.meta.env.VITE_APP_UPDATED_AT)}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard title="Code added" value={formatNumber(stats.additions)} subtitle="Lines reported by GitHub" />
              <StatCard title="Code removed" value={formatNumber(stats.deletions)} subtitle="Public owned repositories" />
              <StatCard title="Files touched" value={formatNumber(stats.changedFiles)} subtitle="Files changed in commits" />
            </div>
          </div>
          <SummarySection recent24h={recent24h} recent7d={recent7d} recent30d={recent30d} stats={status === 'ready' ? stats : emptyStats} />
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <SectionChart title="Activity over time" subtitle="Monthly commits from the five-year export" eyebrow="Timeline" status={status} error={error}>
            <div className="h-80 w-full">
              {chartsReady ? <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={monthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="commitArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...tooltipProps} />
                  <Area type="monotone" dataKey="commits" stroke="#5eead4" strokeWidth={2} fill="url(#commitArea)" />
                </AreaChart>
              </ResponsiveContainer> : null}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <InsightCard label="Most active month" value={maxMonth?.month || '...'} detail={`${maxMonth?.commits || 0} commits`} />
              <InsightCard label="Most active repo" value={shortRepo(busiestRepo?.repo)} detail={`${busiestRepo?.commits || 0} commits in this view`} />
            </div>
          </SectionChart>

          <SectionChart title="Annual shape" subtitle="Commit volume by year" eyebrow="Years" status={status} error={error}>
            <div className="h-80 w-full">
              {chartsReady ? <ActivityBarChart data={yearData} xKey="year" yKey="commits" barRadius={[8, 8, 0, 0]} colorOffset={1} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} /> : null}
            </div>
          </SectionChart>
        </div>

        <SectionChart title="Repository activity" subtitle="Repositories receiving the most commits" eyebrow="Top 10" status={status} error={error}>
          <label className="mb-4 flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={normalizeRepos} onChange={(event) => setNormalizeRepos(event.target.checked)} className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-teal-400 accent-teal-400" />Remove days without commits</label>
          <div className="h-[30rem] w-full">{chartsReady ? <ActivityBarChart data={repoChartData} layout="vertical" xKey="commits" yKey="repoLabel" xAxisProps={{ type: 'number' }} yAxisProps={{ width: 170 }} barRadius={[0, 8, 8, 0]} colorOffset={0} /> : null}</div>
        </SectionChart>

        <div className="grid gap-8 xl:grid-cols-2">
          <SectionChart title="Weekly cadence" subtitle="Commit volume by weekday" eyebrow="Paris" status={status} error={error}>
            <div className="h-72 w-full">{chartsReady ? <ActivityBarChart data={days.map((day, i) => ({ day, commits: dayData[i] }))} xKey="day" yKey="commits" barRadius={[8, 8, 0, 0]} colorOffset={2} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} /> : null}</div>
            <div className="mt-4"><InsightCard label="Most active day" value={days[bestDay]} detail={`${Math.max(...dayData)} commits`} /></div>
          </SectionChart>

          <SectionChart title="Time of day" subtitle="Commit volume by hour" eyebrow="Paris" status={status} error={error}>
            <div className="h-72 w-full">{chartsReady ? <ActivityBarChart data={hours.map((hour, i) => ({ hour, commits: hourData[i] }))} xKey="hour" yKey="commits" barRadius={[6, 6, 0, 0]} colorOffset={3} margin={{ top: 10, right: 10, left: 0, bottom: 40 }} /> : null}</div>
            <div className="mt-4"><InsightCard label="Most active hour" value={`${String(bestHour).padStart(2, '0')}:00`} detail={`Paris commits: ${hourData[bestHour]}`} /></div>
          </SectionChart>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <SectionChart title="Evening and night" subtitle="Commit activity from late day into early morning" eyebrow="Paris, 20:00-03:00" status={status} error={error}>
            <div className="h-72 w-full">{chartsReady ? <ActivityBarChart data={bedtimeHours.map((hour, i) => ({ hour, commits: bedtimeData[i] }))} xKey="hour" yKey="commits" barRadius={[6, 6, 0, 0]} colorOffset={4} margin={{ top: 10, right: 10, left: 0, bottom: 40 }} /> : null}</div>
            <div className="mt-4"><InsightCard label="Night window" value={bedtimeTotal} detail="Combined activity from 20:00 to 03:00 Paris time" /></div>
          </SectionChart>

          <SectionChart title="Last 52 weeks" subtitle="Recent weekly volume in a compact line" eyebrow="Weeks" status={status} error={error}>
            <div className="h-72 w-full">
              {chartsReady ? <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={weekData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...tooltipProps} />
                  <Line type="monotone" dataKey="commits" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer> : null}
            </div>
          </SectionChart>
        </div>

        <SectionChart title="Message themes" subtitle="Model-assisted categories from commit messages" eyebrow="Top tags" status={status} error={error}>
          <div className="h-[38rem] w-full">{chartsReady ? <ActivityBarChart data={themes} layout="vertical" xKey="commits" yKey="theme" xAxisProps={{ type: 'number' }} yAxisProps={{ width: 220, interval: 0, tick: { width: 220, textAnchor: 'end' } }} barRadius={[0, 8, 8, 0]} colorOffset={5} /> : null}</div>
        </SectionChart>

        <SectionChart title="Theme mix by week" subtitle="Top recurring message themes across the five-year export" eyebrow="Weekly stack" status={status} error={error}>
          <div className="h-[44rem] min-h-0 w-full min-w-0">{chartsReady ? <ThemeStackedBarChart data={themeMix.data} themes={themeMix.themes} /> : null}</div>
        </SectionChart>

        <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Recent commits</p>
              <h2 className="text-xl font-semibold text-white">Latest commits in the export</h2>
            </div>
            <p className="text-sm text-slate-300">Commit time uses the committer timestamp. Push time requires a separate GitHub source.</p>
          </div>
          <div className="grid gap-3">
            {latest.map((row) => (
              <a key={`${row.repo}-${row.sha}`} href={row.url} className="grid gap-2 rounded-xl border border-white/10 bg-black/15 p-4 hover:border-teal-200/40 sm:grid-cols-[1fr_auto]">
                <span>
                  <span className="block text-sm font-semibold text-white">{row.message || 'Untitled commit'}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                    <span>{row.repo}</span>
                    <span className="rounded-md border border-teal-200/20 bg-teal-300/10 px-2 py-0.5 text-xs font-medium text-teal-100">{row.message_theme || 'Unclassified'}</span>
                  </span>
                </span>
                <span className="text-sm text-slate-400">{formatDate(row.committer_date)}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200/15 bg-amber-200/[0.06] p-6 text-sm leading-7 text-amber-50/85">
          <p className="font-semibold text-amber-50">Measurement notes</p>
          <p>Author time and committer time are available in the export. The dashboard groups by committer time in Europe/Paris. Push timestamps and PR merge timestamps require separate GitHub sources, so they are treated as distinct measurements.</p>
        </section>
      </section>
    </main>
  )
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { notation: value > 99999 ? 'compact' : 'standard' }).format(value || 0)
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: zone.key }).format(new Date(value))
}

function formatLastUpdated(value) {
  if (!value) return ''
  const formatted = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: zone.key,
  }).format(new Date(value))
  return `${formatted} Paris time`
}

function shortRepo(repo = '') {
  return repo.split('/').pop() || '...'
}
