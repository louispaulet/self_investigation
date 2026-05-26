import { useEffect, useMemo, useState } from 'react'
import ActivityBarChart from '../components/ActivityBarChart'
import InsightCard from '../components/InsightCard'
import SectionChart from '../components/SectionChart'
import SectionText from '../components/SectionText'
import SummarySection from '../components/SummarySection'
import { bedtimeCounts, dayCounts, hourCounts, parseTsv } from '../data'
import { MESSAGE_THEME_COUNTS } from '../analysisThemes'
import { bestIndex, bedtimeHours, days, hours, sourcePath, within, zone } from '../utils/activity'
import { getRepoChartData } from '../utils/repoCharts'

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
  const repoChartData = useMemo(() => getRepoChartData(rows, normalizeRepos), [rows, normalizeRepos])
  const now = Date.now()
  const recent24h = rows.filter((row) => within(row.author_date, now, 24)).length
  const recent7d = rows.filter((row) => within(row.author_date, now, 24 * 7)).length
  const recent30d = rows.filter((row) => within(row.author_date, now, 24 * 30)).length
  const bestHour = bestIndex(hourData)
  const bedtimeTotal = bedtimeData.reduce((sum, value) => sum + value, 0)

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)] lg:items-start">
          <div className="flex flex-col gap-3"><p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">self investigation</p><h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">Commit activity radar</h1><SectionText /></div>
          <SummarySection recent24h={recent24h} recent7d={recent7d} recent30d={recent30d} />
        </div>

        <SectionChart title="Repository activity" subtitle="Top repositories by commit count" eyebrow="Top 10" status={status} error={error}>
          <label className="mb-4 flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={normalizeRepos} onChange={(event) => setNormalizeRepos(event.target.checked)} className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 accent-cyan-400" />Normalize by days spent on project</label>
          <div className="h-[28rem] w-full"><ActivityBarChart data={repoChartData} layout="vertical" xKey="commits" yKey="repo" xAxisProps={{ type: 'number' }} yAxisProps={{ width: 170 }} barRadius={[0, 8, 8, 0]} colorOffset={0} margin={{ top: 10, right: 20, left: 180, bottom: 0 }} /></div>
        </SectionChart>

        <SectionChart title="Weekly peaks" subtitle="Commit count by day" eyebrow="Paris" status={status} error={error}>
          <div className="h-72 w-full"><ActivityBarChart data={days.map((day, i) => ({ day, commits: dayData[i] }))} xKey="day" yKey="commits" barRadius={[8, 8, 0, 0]} colorOffset={1} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} /></div>
          <div className="mt-4"><InsightCard label="Best day" value={days[bestIndex(dayData)]} detail={`${Math.max(...dayData)} commits`} /></div>
        </SectionChart>

        <SectionChart title="Message themes" subtitle="Representative categories from commit messages" eyebrow="Themes" status={status} error={error}>
          <div className="h-[30rem] w-full"><ActivityBarChart data={sortedThemes} layout="vertical" xKey="commits" yKey="theme" xAxisProps={{ type: 'number' }} yAxisProps={{ width: 210, interval: 0, tick: { width: 210, textAnchor: 'end' } }} barRadius={[0, 8, 8, 0]} colorOffset={2} margin={{ top: 10, right: 20, left: 210, bottom: 0 }} /></div>
          <div className="mt-4 grid grid-cols-2 gap-4"><InsightCard label="Top theme" value={sortedThemes[0].theme} detail={`${sortedThemes[0].commits} commits`} /><InsightCard label="Bottom theme" value={sortedThemes[sortedThemes.length - 1].theme} detail={`${sortedThemes[sortedThemes.length - 1].commits} commits`} /></div>
        </SectionChart>

        <SectionChart title="Bedtime pattern" subtitle="Late-night commit activity" eyebrow="Paris, 20:00–03:00" status={status} error={error}>
          <div className="h-72 w-full"><ActivityBarChart data={bedtimeHours.map((hour, i) => ({ hour, commits: bedtimeData[i] }))} xKey="hour" yKey="commits" barRadius={[6, 6, 0, 0]} colorOffset={3} margin={{ top: 10, right: 10, left: 0, bottom: 40 }} /></div>
          <div className="mt-4"><InsightCard label="Bedtime window" value={bedtimeTotal} detail="Combined activity from 20:00 to 03:00 Paris time" /></div>
        </SectionChart>

        <SectionChart title="Time of day" subtitle="Commit count by hour" eyebrow="Paris" status={status} error={error}>
          <div className="h-72 w-full"><ActivityBarChart data={hours.map((hour, i) => ({ hour, commits: hourData[i] }))} xKey="hour" yKey="commits" barRadius={[6, 6, 0, 0]} colorOffset={4} margin={{ top: 10, right: 10, left: 0, bottom: 40 }} /></div>
          <div className="mt-4"><InsightCard label="Best hour" value={`${String(bestHour).padStart(2, '0')}:00`} detail={`Paris commits: ${hourData[bestHour]}`} /></div>
        </SectionChart>
      </section>
    </main>
  )
}
