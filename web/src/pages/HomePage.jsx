import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from '../components/ChartCard'
import MetricCard from '../components/MetricCard'
import SectionText from '../components/SectionText'
import StatCard from '../components/StatCard'
import { bedtimeCounts, dayCounts, hourCounts, parseTsv, repoCounts } from '../data'
import { MESSAGE_THEME_COUNTS } from '../analysisThemes'
import { bestIndex, bedtimeHours, colors, days, hours, sourcePath, within, zone } from '../utils/activity'

const sortedThemes = [...MESSAGE_THEME_COUNTS].sort((a, b) => b.commits - a.commits)

export default function HomePage() {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [normalizeRepos, setNormalizeRepos] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(sourcePath, { cache: 'no-store' })
      .then(async (res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text() })
      .then((text) => { if (!alive) return; setRows(parseTsv(text).filter((row) => row && row.author_date && row.repo)); setStatus('ready') })
      .catch((err) => { if (!alive) return; setError(`Failed to load ${sourcePath}: ${err.message}`); setStatus('error') })
    return () => { alive = false }
  }, [])

  const hourData = useMemo(() => hourCounts(rows, zone.key), [rows])
  const dayData = useMemo(() => dayCounts(rows, zone.key), [rows])
  const bedtimeData = useMemo(() => bedtimeCounts(rows, zone.key), [rows])
  const repoData = useMemo(() => {
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

  const now = Date.now()
  const recent24h = rows.filter((row) => within(row.author_date, now, 24)).length
  const recent7d = rows.filter((row) => within(row.author_date, now, 24 * 7)).length
  const recent30d = rows.filter((row) => within(row.author_date, now, 24 * 30)).length
  const bestHour = bestIndex(hourData)
  const bedtimeTotal = bedtimeData.reduce((sum, value) => sum + value, 0)
  const repoChartData = repoData.slice().sort((a, b) => (normalizeRepos ? b.normalized - a.normalized : b.commits - a.commits) || a.repo.localeCompare(b.repo)).map((item) => ({ repo: item.repo, commits: normalizeRepos ? Number(item.normalized.toFixed(2)) : item.commits, daysSpent: item.daysSpent }))

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)] lg:items-start">
          <div className="flex flex-col gap-3">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">self investigation</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">Commit activity radar</h1>
            <SectionText />
          </div>
          <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Recent activity</p>
            <div className="mt-6 grid gap-4"><MetricCard label="Last 24h" value={recent24h} /><MetricCard label="Past week" value={recent7d} /><MetricCard label="Past month" value={recent30d} /></div>
          </aside>
        </div>
        <ChartCard title="Repository activity" subtitle="Top repositories by commit count" status={status} error={error}>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Top 10</p>
              <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={normalizeRepos} onChange={(event) => setNormalizeRepos(event.target.checked)} className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 accent-cyan-400" />Normalize by days spent on project</label>
            </div>
            <div className="h-[28rem] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={repoChartData} layout="vertical" margin={{ top: 10, right: 20, left: 180, bottom: 0 }}><CartesianGrid stroke="rgba(148,163,184,0.15)" horizontal={false} /><XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} /><YAxis dataKey="repo" type="category" tickLine={false} axisLine={false} width={170} /><Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' }} labelStyle={{ color: '#cbd5e1', fontWeight: 600 }} itemStyle={{ color: '#e2e8f0' }} formatter={(value, name, props) => [normalizeRepos ? `${value} commits/day` : value, normalizeRepos ? 'normalized' : 'commits', props.payload?.daysSpent ? `${props.payload.daysSpent} active days` : '']} /><Bar dataKey="commits" radius={[0, 8, 8, 0]}>{repoChartData.map((_, i) => <Cell key={repoChartData[i].repo} fill={colors[i % colors.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
          </div>
        </ChartCard>
        <ChartCard title="Weekly peaks" subtitle="Commit count by day" status={status} error={error}><div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="mb-3 text-sm uppercase tracking-[0.28em] text-slate-400">Paris</p><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={days.map((day, i) => ({ day, commits: dayData[i] }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}><CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} allowDecimals={false} /><Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' }} labelStyle={{ color: '#cbd5e1', fontWeight: 600 }} itemStyle={{ color: '#e2e8f0' }} /><Bar dataKey="commits" radius={[8, 8, 0, 0]}>{days.map((_, i) => <Cell key={days[i]} fill={colors[i % colors.length]} />)}</Bar></BarChart></ResponsiveContainer></div><div className="mt-4 flex justify-center"><div className="w-full max-w-sm"><StatCard title="Best day" value={days[bestIndex(dayData)]} subtitle={`${Math.max(...dayData)} commits`} /></div></div></div></ChartCard>
        <ChartCard title="Message themes" subtitle="Representative categories from commit messages" status={status} error={error}><div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="mb-3 text-sm uppercase tracking-[0.28em] text-slate-400">Themes</p><div className="h-[30rem] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={sortedThemes} layout="vertical" margin={{ top: 10, right: 20, left: 210, bottom: 0 }}><CartesianGrid stroke="rgba(148,163,184,0.15)" horizontal={false} /><XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} /><YAxis dataKey="theme" type="category" tickLine={false} axisLine={false} width={210} interval={0} tick={{ width: 210, textAnchor: 'end' }} /><Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' }} labelStyle={{ color: '#cbd5e1', fontWeight: 600 }} itemStyle={{ color: '#e2e8f0' }} /><Bar dataKey="commits" radius={[0, 8, 8, 0]}>{sortedThemes.map((_, i) => <Cell key={sortedThemes[i].theme} fill={colors[i % colors.length]} />)}</Bar></BarChart></ResponsiveContainer></div><div className="mt-4 grid grid-cols-2 gap-4"><StatCard title="Top theme" value={sortedThemes[0].theme} subtitle={`${sortedThemes[0].commits} commits`} /><StatCard title="Bottom theme" value={sortedThemes[sortedThemes.length - 1].theme} subtitle={`${sortedThemes[sortedThemes.length - 1].commits} commits`} /></div></div></ChartCard>
        <ChartCard title="Bedtime pattern" subtitle="Late-night commit activity" status={status} error={error}><div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="mb-3 text-sm uppercase tracking-[0.28em] text-slate-400">Paris, 20:00–03:00</p><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={bedtimeHours.map((hour, i) => ({ hour, commits: bedtimeData[i] }))} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}><CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} /><XAxis dataKey="hour" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} allowDecimals={false} /><Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' }} labelStyle={{ color: '#cbd5e1', fontWeight: 600 }} itemStyle={{ color: '#e2e8f0' }} /><Bar dataKey="commits" radius={[6, 6, 0, 0]}>{bedtimeHours.map((_, i) => <Cell key={bedtimeHours[i]} fill={colors[i % colors.length]} />)}</Bar></BarChart></ResponsiveContainer></div><div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 text-center"><p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">Bedtime window</p><p className="mt-3 text-4xl font-semibold text-white">{bedtimeTotal} commits</p><p className="mt-2 text-sm text-slate-300">Combined activity from 20:00 to 03:00 Paris time</p></div></div></ChartCard>
        <ChartCard title="Time of day" subtitle="Commit count by hour" status={status} error={error}><div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="mb-3 text-sm uppercase tracking-[0.28em] text-slate-400">Paris</p><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={hours.map((hour, i) => ({ hour, commits: hourData[i] }))} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}><CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} /><XAxis dataKey="hour" tickLine={false} axisLine={false} interval={0} angle={0} /><YAxis tickLine={false} axisLine={false} allowDecimals={false} /><Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' }} labelStyle={{ color: '#cbd5e1', fontWeight: 600 }} itemStyle={{ color: '#e2e8f0' }} /><Bar dataKey="commits" radius={[6, 6, 0, 0]}>{hours.map((_, i) => <Cell key={hours[i]} fill={colors[i % colors.length]} />)}</Bar></BarChart></ResponsiveContainer></div><div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 text-center"><p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">Best hour</p><p className="mt-3 whitespace-nowrap text-4xl font-semibold text-white">{String(bestHour).padStart(2, '0')}:00 Paris</p><p className="mt-2 text-sm text-slate-300">Paris commits: {hourData[bestHour]}</p></div></div></ChartCard>
      </section>
    </main>
  )
}
