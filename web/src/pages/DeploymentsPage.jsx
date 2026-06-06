import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ActivityBarChart from '../components/ActivityBarChart'
import InsightCard from '../components/InsightCard'
import SectionChart from '../components/SectionChart'
import StatCard from '../components/StatCard'
import { dayCounts, hourCounts, monthCounts, parseTsv, recentCommits, repoCounts, weekCounts, yearCounts } from '../data'
import { bestIndex, days, deploymentsSourcePath, hours, within, zone } from '../utils/activity'

const emptyStats = { deployments: 0, repos: 0, activeDays: 0 }
const tooltipProps = {
  contentStyle: { background: '#07110f', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' },
  labelStyle: { color: '#cbd5e1', fontWeight: 600 },
}

export default function DeploymentsPage() {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    fetch(deploymentsSourcePath, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => {
        if (!alive) return
        setRows(parseTsv(text).filter((row) => row && row.repo && row.deployment_id))
        setStatus('ready')
      })
      .catch((err) => {
        if (!alive) return
        setError(`Failed to load ${deploymentsSourcePath}: ${err.message}`)
        setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [])

  const successfulRows = useMemo(() => rows.filter((row) => row.deploy_at), [rows])
  const stats = useMemo(() => deploymentStats(successfulRows, zone.key), [successfulRows])
  const monthData = useMemo(() => monthCounts(successfulRows, zone.key, 'deploy_at', 'deployments'), [successfulRows])
  const yearData = useMemo(() => yearCounts(successfulRows, zone.key, 'deploy_at', 'deployments'), [successfulRows])
  const weekData = useMemo(() => weekCounts(successfulRows, zone.key, 'deploy_at', 'deployments').slice(-52), [successfulRows])
  const repoData = useMemo(() => repoCounts(successfulRows, 'deployments').slice(0, 10), [successfulRows])
  const hourData = useMemo(() => hourCounts(successfulRows, zone.key, 'deploy_at'), [successfulRows])
  const dayData = useMemo(() => dayCounts(successfulRows, zone.key, 'deploy_at'), [successfulRows])
  const latest = useMemo(() => recentCommits(successfulRows, 8, 'deploy_at'), [successfulRows])
  const recent24h = successfulRows.filter((row) => within(row.deploy_at, now, 24)).length
  const recent7d = successfulRows.filter((row) => within(row.deploy_at, now, 24 * 7)).length
  const recent30d = successfulRows.filter((row) => within(row.deploy_at, now, 24 * 30)).length
  const bestHour = bestIndex(hourData)
  const bestDay = bestIndex(dayData)
  const busiestRepo = repoData[0]
  const maxMonth = monthData.reduce((best, item) => (item.deployments > (best?.deployments || 0) ? item : best), null)
  const displayStats = status === 'ready' ? stats : emptyStats

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:items-start">
          <div className="flex flex-col gap-5">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-200/80">github pages</p>
            <h1 className="max-w-4xl text-4xl font-semibold text-white sm:text-6xl">Deployment rhythm across projects</h1>
            <p className="max-w-3xl text-base leading-8 text-slate-300">
              This view follows successful GitHub Pages deployments across public owned repositories. It shows when finished builds reached Pages and which projects received published changes.
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-sky-100/60">
              Last refreshed {formatLastUpdated(import.meta.env.VITE_APP_UPDATED_AT)}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard title="Successful deployments" value={formatNumber(displayStats.deployments)} subtitle="GitHub Pages status success" />
              <StatCard title="Deployed repos" value={formatNumber(displayStats.repos)} subtitle="Public owned repositories" />
              <StatCard title="Active days" value={formatNumber(displayStats.activeDays)} subtitle="Paris-local deployment days" />
            </div>
          </div>

          <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-sky-950/20">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Recent pace</p>
            <div className="mt-5 grid gap-4">
              <InsightCard label="Last 24 hours" value={recent24h} detail="Successful Pages deployments" />
              <InsightCard label="Last 7 days" value={recent7d} detail="Successful Pages deployments" />
              <InsightCard label="Last 30 days" value={recent30d} detail="Successful Pages deployments" />
            </div>
          </section>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <SectionChart title="Deployments over time" subtitle="Monthly successful GitHub Pages deployments" eyebrow="Timeline" status={status} error={error}>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={monthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="deploymentArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#84cc16" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...tooltipProps} />
                  <Area type="monotone" dataKey="deployments" stroke="#7dd3fc" strokeWidth={2} fill="url(#deploymentArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <InsightCard label="Most active month" value={maxMonth?.month || '...'} detail={`${maxMonth?.deployments || 0} deployments`} />
              <InsightCard label="Most deployed repo" value={shortRepo(busiestRepo?.repo)} detail={`${busiestRepo?.deployments || 0} deployments in this view`} />
            </div>
          </SectionChart>

          <SectionChart title="Annual shape" subtitle="Successful deployments by year" eyebrow="Years" status={status} error={error}>
            <div className="h-80 w-full">
              <ActivityBarChart data={yearData} xKey="year" yKey="deployments" dataKey="deployments" barRadius={[8, 8, 0, 0]} colorOffset={2} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} />
            </div>
          </SectionChart>
        </div>

        <SectionChart title="Repository deployments" subtitle="Repositories with the most successful Pages deployments" eyebrow="Top 10" status={status} error={error}>
          <div className="h-[30rem] w-full">
            <ActivityBarChart data={repoData} layout="vertical" xKey="deployments" yKey="repo" dataKey="deployments" xAxisProps={{ type: 'number' }} yAxisProps={{ width: 180 }} barRadius={[0, 8, 8, 0]} colorOffset={2} margin={{ top: 10, right: 20, left: 190, bottom: 0 }} />
          </div>
        </SectionChart>

        <div className="grid gap-8 xl:grid-cols-2">
          <SectionChart title="Weekly cadence" subtitle="Successful deployments by weekday" eyebrow="Paris" status={status} error={error}>
            <div className="h-72 w-full">
              <ActivityBarChart data={days.map((day, i) => ({ day, deployments: dayData[i] }))} xKey="day" yKey="deployments" dataKey="deployments" barRadius={[8, 8, 0, 0]} colorOffset={3} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} />
            </div>
            <div className="mt-4"><InsightCard label="Most active day" value={days[bestDay]} detail={`${Math.max(...dayData)} deployments`} /></div>
          </SectionChart>

          <SectionChart title="Time of day" subtitle="Successful deployments by hour" eyebrow="Paris" status={status} error={error}>
            <div className="h-72 w-full">
              <ActivityBarChart data={hours.map((hour, i) => ({ hour, deployments: hourData[i] }))} xKey="hour" yKey="deployments" dataKey="deployments" barRadius={[6, 6, 0, 0]} colorOffset={4} margin={{ top: 10, right: 10, left: 0, bottom: 40 }} />
            </div>
            <div className="mt-4"><InsightCard label="Most active hour" value={`${String(bestHour).padStart(2, '0')}:00`} detail={`Paris deployments: ${hourData[bestHour]}`} /></div>
          </SectionChart>
        </div>

        <SectionChart title="Last 52 weeks" subtitle="Recent deployment volume in a compact line" eyebrow="Weeks" status={status} error={error}>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={weekData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...tooltipProps} />
                <Line type="monotone" dataKey="deployments" stroke="#84cc16" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionChart>

        <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Recent deployments</p>
              <h2 className="text-xl font-semibold text-white">Latest successful Pages deployments</h2>
            </div>
            <p className="text-sm text-slate-300">{formatNumber(rows.length)} raw deployment records in the export</p>
          </div>
          <div className="grid gap-3">
            {latest.map((row) => (
              <a key={`${row.repo}-${row.deployment_id}`} href={row.environment_url || row.pages_url || row.log_url} className="grid gap-2 rounded-xl border border-white/10 bg-black/15 p-4 hover:border-sky-200/40 sm:grid-cols-[1fr_auto]">
                <span>
                  <span className="block text-sm font-semibold text-white">{shortRepo(row.repo)}</span>
                  <span className="mt-1 block text-sm text-slate-300">{row.repo}</span>
                </span>
                <span className="text-sm text-slate-400">{formatDate(row.deploy_at)}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-sky-200/15 bg-sky-200/[0.06] p-6 text-sm leading-7 text-sky-50/85">
          <p className="font-semibold text-sky-50">Measurement notes</p>
          <p>Deployment timing uses the successful GitHub Pages deployment status timestamp in Europe/Paris. The raw export also keeps deployment creation time and latest status, so unfinished or failed deployments remain visible as source records.</p>
        </section>
      </section>
    </main>
  )
}

function deploymentStats(rows, timeZone) {
  const repos = new Set()
  const activeDays = new Set()
  for (const row of rows) {
    if (row.repo) repos.add(row.repo)
    const day = localDateKey(row.deploy_at, timeZone)
    if (day) activeDays.add(day)
  }
  return {
    deployments: rows.length,
    repos: repos.size,
    activeDays: activeDays.size,
  }
}

function localDateKey(date, timeZone) {
  if (!date) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(new Date(date))
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return values.year ? `${values.year}-${values.month}-${values.day}` : ''
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
