import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'
import { bedtimeCounts, dayCounts, hourCounts, parseTsv, repoCounts } from './data'
import { MESSAGE_THEME_COUNTS } from './analysisThemes'

const hours = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SOURCE = '/self_investigation/data/recent_commits.tsv'
const ZONE = { key: 'Europe/Paris', label: 'Paris' }
const COLORS = ['#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa']
const SORTED_THEMES = [...MESSAGE_THEME_COUNTS].sort((a, b) => b.commits - a.commits)

function App() {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [normalizeRepos, setNormalizeRepos] = useState(false)

  useEffect(() => {
    let alive = true

    fetch(SOURCE, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => {
        if (!alive) return
        const parsed = parseTsv(text)
        const clean = parsed.filter((row) => row && row.author_date && row.repo)
        setRows(clean)
        setStatus('ready')
      })
      .catch((err) => {
        if (!alive) return
        setError(`Failed to load ${SOURCE}: ${err.message}`)
        setStatus('error')
      })

    return () => {
      alive = false
    }
  }, [])

  const hourData = useMemo(() => hourCounts(rows, ZONE.key), [rows])
  const dayData = useMemo(() => dayCounts(rows, ZONE.key), [rows])
  const repoStats = useMemo(() => {
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
      return { ...item, daysSpent, normalized }
    })
  }, [rows])
  const repoData = repoStats
    .slice()
    .sort((a, b) => (normalizeRepos ? b.normalized - a.normalized : b.commits - a.commits) || a.repo.localeCompare(b.repo))
    .map((item) => ({
      repo: item.repo,
      commits: normalizeRepos ? Number(item.normalized.toFixed(2)) : item.commits,
      daysSpent: item.daysSpent,
    }))
  const bedtimeData = useMemo(() => bedtimeCounts(rows, ZONE.key), [rows])
  const bestHour = bestIndex(hourData)
  const bedtimeHours = ['20', '21', '22', '23', '00', '01', '02', '03']
  const bedtimeTotal = bedtimeData.reduce((sum, value) => sum + value, 0)
  const now = Date.now()
  const recent24h = rows.filter((row) => within(row.author_date, now, 24)).length
  const recent7d = rows.filter((row) => within(row.author_date, now, 24 * 7)).length
  const recent30d = rows.filter((row) => within(row.author_date, now, 24 * 30)).length

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)] lg:items-start">
          <div className="flex flex-col gap-3">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">self investigation</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">Commit activity radar</h1>
            <div className="max-w-3xl space-y-4 text-sm leading-7 text-slate-300 sm:text-base">
              <p>
                <strong className="font-semibold text-white">Knowing oneself</strong> is a slow and disciplined practice.
                It asks for attention to what we do, when we do it, and the habits that shape our choices over time.
              </p>
              <p>
                Side projects are a useful place to look, because they often reveal motivation in a direct and
                personal way. They show where curiosity stays alive, where energy returns, and where attention tends
                to settle.
              </p>
              <p>
                This project helps me study the rhythm of that work. By tracing commit activity over time, I can see
                how my attention moves, which projects draw me in, when I build, when I refine, and which patterns
                repeat quietly in the background.
              </p>
              <p>
                The goal is to understand how I spend my time when I work on side projects, and to learn from the
                shape of that work with <em className="italic text-slate-100">more clarity and honesty</em>.
              </p>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Recent activity</p>
            <div className="mt-6 grid gap-4">
              <MetricCard label="Last 24h" value={recent24h} />
              <MetricCard label="Past week" value={recent7d} />
              <MetricCard label="Past month" value={recent30d} />
            </div>
          </aside>
        </div>

        <ChartCard title="Message themes" subtitle="Representative categories from commit messages" status={status} error={error}>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="mb-3 text-sm uppercase tracking-[0.28em] text-slate-400">Themes</p>
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SORTED_THEMES} layout="vertical" margin={{ top: 10, right: 20, left: 140, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.15)" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="theme" type="category" tickLine={false} axisLine={false} width={150} interval={0} tick={{ width: 150, wordBreak: 'keep-all' }} />
                  <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' }} labelStyle={{ color: '#cbd5e1', fontWeight: 600 }} itemStyle={{ color: '#e2e8f0' }} />
                  <Bar dataKey="commits" radius={[0, 8, 8, 0]}>
                    {SORTED_THEMES.map((_, i) => (
                      <Cell key={SORTED_THEMES[i].theme} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <StatCard title="Top theme" value={SORTED_THEMES[0].theme} subtitle={`${SORTED_THEMES[0].commits} commits`} />
              <StatCard title="Bottom theme" value={SORTED_THEMES[SORTED_THEMES.length - 1].theme} subtitle={`${SORTED_THEMES[SORTED_THEMES.length - 1].commits} commits`} />
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Weekly peaks" subtitle="Commit count by day" status={status} error={error}>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="mb-3 text-sm uppercase tracking-[0.28em] text-slate-400">Paris</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days.map((day, i) => ({ day, commits: dayData[i] }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' }} labelStyle={{ color: '#cbd5e1', fontWeight: 600 }} itemStyle={{ color: '#e2e8f0' }} />
                  <Bar dataKey="commits" radius={[8, 8, 0, 0]}>
                    {days.map((_, i) => (
                      <Cell key={days[i]} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <StatCard title="Best day" value={days[bestIndex(dayData)]} subtitle={`${Math.max(...dayData)} commits`} />
              <StatCard title="Best hour" value={`${String(bestHour).padStart(2, '0')}:00`} subtitle={`${hourData[bestHour]} commits`} />
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Repository activity" subtitle="Top repositories by commit count" status={status} error={error}>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Top 10</p>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={normalizeRepos}
                  onChange={(event) => setNormalizeRepos(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 accent-cyan-400"
                />
                Normalize by days spent on project
              </label>
            </div>
            <div className="h-[28rem] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={repoData} layout="vertical" margin={{ top: 10, right: 20, left: 180, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.15)" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="repo" type="category" tickLine={false} axisLine={false} width={170} />
                  <Tooltip
                    cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                    contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' }}
                    labelStyle={{ color: '#cbd5e1', fontWeight: 600 }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value, name, props) => [
                      normalizeRepos ? `${value} commits/day` : value,
                      normalizeRepos ? 'normalized' : 'commits',
                      props.payload?.daysSpent ? `${props.payload.daysSpent} active days` : '',
                    ]}
                  />
                  <Bar dataKey="commits" radius={[0, 8, 8, 0]}>
                    {repoData.map((_, i) => (
                      <Cell key={repoData[i].repo} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Bedtime pattern" subtitle="Late-night commit activity" status={status} error={error}>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="mb-3 text-sm uppercase tracking-[0.28em] text-slate-400">Paris, 20:00–03:00</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bedtimeHours.map((hour, i) => ({ hour, commits: bedtimeData[i] }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' }} labelStyle={{ color: '#cbd5e1', fontWeight: 600 }} itemStyle={{ color: '#e2e8f0' }} />
                  <Bar dataKey="commits" radius={[8, 8, 0, 0]}>
                    {bedtimeHours.map((_, i) => (
                      <Cell key={bedtimeHours[i]} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 text-center">
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">Bedtime window</p>
              <p className="mt-3 text-4xl font-semibold text-white">{bedtimeTotal} commits</p>
              <p className="mt-2 text-sm text-slate-300">Combined activity from 20:00 to 03:00 Paris time</p>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Time of day" subtitle="Commit count by hour" status={status} error={error}>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="mb-3 text-sm uppercase tracking-[0.28em] text-slate-400">Paris</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hours.map((hour, i) => ({ hour, commits: hourData[i] }))} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} interval={0} angle={0} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' }} labelStyle={{ color: '#cbd5e1', fontWeight: 600 }} itemStyle={{ color: '#e2e8f0' }} />
                  <Bar dataKey="commits" radius={[6, 6, 0, 0]}>
                    {hours.map((_, i) => (
                      <Cell key={hours[i]} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 text-center">
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">Best hour</p>
              <p className="mt-3 whitespace-nowrap text-4xl font-semibold text-white">{String(bestHour).padStart(2, '0')}:00 Paris</p>
              <p className="mt-2 text-sm text-slate-300">Paris commits: {hourData[bestHour]}</p>
            </div>
          </div>
        </ChartCard>
      </section>
    </main>
  )
}

function ChartCard({ title, subtitle, children, status, error }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="text-sm text-slate-300">{subtitle}</p>
        </div>
        <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
          {status === 'ready' ? 'live data' : status}
        </div>
      </div>
      {error ? <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
      {children}
    </div>
  )
}

function bestIndex(values) {
  let index = 0
  for (let i = 1; i < values.length; i += 1) if (values[i] > values[index]) index = i
  return index
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur">
      <p className="text-sm uppercase tracking-[0.28em] text-slate-400">{title}</p>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
    </div>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/5 p-5 text-center shadow-lg shadow-black/20">
      <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">{label}</p>
      <div className="mt-3 text-5xl font-semibold leading-none text-white">{value}</div>
    </div>
  )
}

function within(date, now, hours) {
  if (!date) return false
  const delta = now - new Date(date).getTime()
  return delta >= 0 && delta <= hours * 60 * 60 * 1000
}

export default App
