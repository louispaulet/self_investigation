import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { dayCounts, hourCounts, parseTsv } from './data'

const hours = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SOURCE = '/self_investigation/data/recent_commits.tsv'
const ZONES = [
  { key: 'UTC', label: 'UTC' },
  { key: 'Europe/Paris', label: 'Paris' },
]

function App() {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    fetch(SOURCE, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
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

  const datasets = useMemo(
    () =>
      ZONES.map((zone) => ({
        ...zone,
        hourData: hourCounts(rows, zone.key),
        dayData: dayCounts(rows, zone.key),
      })),
    [rows],
  )

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
            self investigation
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Commit activity radar
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            A live visual of commit intensity by day and hour, loaded from the
            generated GitHub commit dataset.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {datasets.map((dataset) => (
            <ChartCard
              key={dataset.key}
              title={`Weekly peaks — ${dataset.label}`}
              subtitle="Commit count by day"
              status={status}
              error={error}
            >
              <BarChart labels={days} values={dataset.dayData} max={Math.max(...dataset.dayData, 1)} horizontal />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <StatCard
                  title="Best day"
                  value={days[bestIndex(dataset.dayData)]}
                  subtitle={`${Math.max(...dataset.dayData)} commits`}
                />
                <StatCard
                  title="Best hour"
                  value={`${String(bestIndex(dataset.hourData)).padStart(2, '0')}:00`}
                  subtitle={`${dataset.hourData[bestIndex(dataset.hourData)]} commits`}
                />
              </div>
            </ChartCard>
          ))}
        </div>

        <ChartCard title="Time of day" subtitle="Commit count by hour" status={status} error={error}>
          <div className="grid gap-6 lg:grid-cols-2">
            {datasets.map((dataset) => (
              <div key={dataset.key} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="mb-3 text-sm uppercase tracking-[0.28em] text-slate-400">{dataset.label}</p>
                <BarChart labels={hours} values={dataset.hourData} max={Math.max(...dataset.hourData, 1)} dense />
              </div>
            ))}
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

function BarChart({ labels, values, max, dense = false, horizontal = false }) {
  if (horizontal) {
    return (
      <div className="flex h-80 items-end gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        {labels.map((label, i) => {
          const value = values[i] ?? 0
          const height = `${Math.max((value / max) * 100, 8)}%`
          return (
            <div key={label} className="flex flex-1 flex-col items-center gap-3">
              <div className="flex h-full w-full items-end justify-center">
                <div
                  className="w-full max-w-12 rounded-t-2xl bg-gradient-to-t from-fuchsia-500 via-cyan-400 to-emerald-300 shadow-lg shadow-cyan-500/20 transition-transform duration-300 hover:scale-[1.03]"
                  style={{ height }}
                  title={`${label}: ${value}`}
                />
              </div>
              <div className="text-xs font-medium text-slate-300">{label}</div>
              <div className="text-sm font-semibold text-white">{value}</div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`grid gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-4 ${dense ? 'grid-cols-12' : 'grid-cols-7'}`}>
      {labels.map((label, i) => {
        const value = values[i] ?? 0
        const height = `${Math.max((value / max) * 100, 8)}%`
        return (
          <div key={label} className="flex min-h-56 flex-col items-center justify-end gap-2">
            <div className="flex h-full w-full items-end justify-center">
              <div
                className="w-full rounded-t-xl bg-gradient-to-t from-emerald-400 via-cyan-400 to-fuchsia-500"
                style={{ height }}
                title={`${label}: ${value}`}
              />
            </div>
            <div className="text-[10px] text-slate-400">{label}</div>
          </div>
        )
      })}
    </div>
  )
}

function bestIndex(values) {
  let index = 0
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] > values[index]) index = i
  }
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

export default App
