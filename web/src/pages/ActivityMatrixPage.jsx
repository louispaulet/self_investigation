import { useEffect, useMemo, useState } from 'react'
import { parseTsv } from '../data'
import { days, sourcePath, zone } from '../utils/activity'

const paletteStops = [
  { value: 0, color: [59, 76, 192] },
  { value: 0.25, color: [132, 166, 239] },
  { value: 0.5, color: [221, 221, 221] },
  { value: 0.75, color: [244, 152, 122] },
  { value: 1, color: [180, 4, 38] },
]

export default function ActivityMatrixPage() {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [useGlobalScale, setUseGlobalScale] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(sourcePath, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => {
        if (!alive) return
        setRows(parseTsv(text).filter((row) => row && row.committer_date))
        setStatus('ready')
      })
      .catch((err) => {
        if (!alive) return
        setError(`Failed to load ${sourcePath}: ${err.message}`)
        setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [])

  const activity = useMemo(() => buildActivity(rows), [rows])
  const globalMax = useMemo(() => Math.max(1, ...activity.years.flatMap((year) => year.days.map((day) => day.count))), [activity])
  const total = useMemo(() => activity.years.reduce((sum, year) => sum + year.total, 0), [activity])
  const activeDays = useMemo(() => activity.years.reduce((sum, year) => sum + year.activeDays, 0), [activity])

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex flex-col gap-4">
            <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">activity matrix</p>
            <h1 className="max-w-4xl text-4xl font-semibold text-white sm:text-6xl">Daily commit fields across five years</h1>
            <p className="max-w-3xl text-base leading-8 text-slate-300">
              Each square is one Paris-local day. Columns follow the weeks of the year, and rows follow weekdays, making repeated work visible across seasons.
            </p>
          </div>
          <label className="flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={useGlobalScale}
              onChange={(event) => setUseGlobalScale(event.target.checked)}
              className="h-4 w-4 rounded border-slate-500 bg-slate-900 accent-rose-400"
            />
            Use one scale for all years
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Years shown" value={activity.years.length || '...'} />
          <Metric label="Commits shown" value={formatNumber(total)} />
          <Metric label="Active days" value={formatNumber(activeDays)} />
        </div>

        {status === 'error' && <p className="rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-sm text-red-100">{error}</p>}
        {status === 'loading' && <div className="h-80 rounded-3xl border border-white/10 bg-white/[0.04]" />}

        {status === 'ready' && (
          <div className="grid gap-6">
            {activity.years.map((year) => (
              <YearMatrix key={year.year} year={year} max={useGlobalScale ? globalMax : year.max} />
            ))}
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-sm leading-7 text-slate-300">
          <p className="font-semibold text-white">Measurement note</p>
          <p>The matrix uses committer timestamps grouped by Europe/Paris calendar day. The palette is coolwarm: quiet days begin in blue, middle values pass through light grey, and the most active days move toward red.</p>
        </section>
      </section>
    </main>
  )
}

function YearMatrix({ year, max }) {
  return (
    <section className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-cyan-950/20">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Year</p>
          <h2 className="text-2xl font-semibold text-white">{year.year}</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right text-sm">
          <span><strong className="block text-white">{formatNumber(year.total)}</strong><span className="text-slate-400">commits</span></span>
          <span><strong className="block text-white">{formatNumber(year.activeDays)}</strong><span className="text-slate-400">active days</span></span>
          <span><strong className="block text-white">{formatNumber(year.max)}</strong><span className="text-slate-400">daily max</span></span>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto pb-2">
        <div className="min-w-[760px]">
          <div className="mb-2 grid pl-10 text-xs text-slate-400" style={{ gridTemplateColumns: `repeat(${year.weekCount}, minmax(0, 1fr))` }}>
            {year.monthMarkers.map((marker) => (
              <span key={`${year.year}-${marker.label}-${marker.week}`} style={{ gridColumnStart: marker.week + 1 }}>{marker.label}</span>
            ))}
          </div>
          <div className="grid grid-cols-[2rem_1fr] gap-2">
            <div className="grid gap-1 text-right text-xs text-slate-400" style={{ gridTemplateRows: 'repeat(7, 1fr)' }}>
              {days.map((day) => <span key={day} className="leading-4">{day}</span>)}
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${year.weekCount}, minmax(0, 1fr))`, gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}>
              {year.days.map((day) => (
                <span
                  key={day.date}
                  title={`${day.label}: ${day.count} commits, ${day.dominantTheme}, day ${day.dayOfYear}`}
                  className="aspect-square rounded-[4px] border border-black/20"
                  style={{
                    gridColumn: day.week + 1,
                    gridRow: day.weekday + 1,
                    backgroundColor: day.count > 0 ? coolwarm(day.count / Math.max(1, max)) : 'rgba(255,255,255,0.055)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  )
}

function buildActivity(rows) {
  const dayStats = new Map()
  for (const row of rows) {
    const key = localDateKey(row.committer_date, zone.key)
    if (!key) continue
    const item = dayStats.get(key) || { count: 0, themes: new Map() }
    const theme = normalizedTheme(row.message_theme)
    item.count += 1
    item.themes.set(theme, (item.themes.get(theme) || 0) + 1)
    dayStats.set(key, item)
  }

  const dataYears = [...new Set([...dayStats.keys()].map((key) => Number(key.slice(0, 4))))].sort((a, b) => a - b)
  const latest = dataYears.at(-1) || new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, index) => latest - 4 + index)

  return {
    years: years.map((year) => buildYear(year, dayStats)).reverse(),
  }
}

function buildYear(year, dayStats) {
  const start = new Date(Date.UTC(year, 0, 1))
  const length = isLeapYear(year) ? 366 : 365
  const firstWeekday = mondayIndex(start.getUTCDay())
  const weekCount = Math.ceil((firstWeekday + length) / 7)
  const daysInYear = Array.from({ length }, (_, index) => {
    const date = new Date(Date.UTC(year, 0, index + 1))
    const dateKey = date.toISOString().slice(0, 10)
    const stats = dayStats.get(dateKey)
    const count = stats?.count || 0
    return {
      date: dateKey,
      label: formatDay(date),
      dayOfYear: index + 1,
      count,
      dominantTheme: count > 0 ? dominantTheme(stats.themes) : 'no commits',
      week: Math.floor((firstWeekday + index) / 7),
      weekday: mondayIndex(date.getUTCDay()),
    }
  })

  return {
    year,
    weekCount,
    days: daysInYear,
    total: daysInYear.reduce((sum, day) => sum + day.count, 0),
    activeDays: daysInYear.filter((day) => day.count > 0).length,
    max: Math.max(1, ...daysInYear.map((day) => day.count)),
    monthMarkers: monthMarkers(year, firstWeekday),
  }
}

function monthMarkers(year, firstWeekday) {
  return Array.from({ length: 12 }, (_, month) => {
    const date = new Date(Date.UTC(year, month, 1))
    const startOfYear = new Date(Date.UTC(year, 0, 1))
    const dayIndex = Math.floor((date - startOfYear) / 86400000)
    return {
      label: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(date),
      week: Math.floor((firstWeekday + dayIndex) / 7),
    }
  })
}

function coolwarm(value) {
  const clamped = Math.max(0, Math.min(1, value))
  const upperIndex = paletteStops.findIndex((stop) => stop.value >= clamped)
  const upper = paletteStops[Math.max(upperIndex, 1)]
  const lower = paletteStops[Math.max(upperIndex - 1, 0)]
  const range = upper.value - lower.value || 1
  const amount = (clamped - lower.value) / range
  const [r, g, b] = lower.color.map((channel, index) => Math.round(channel + (upper.color[index] - channel) * amount))
  return `rgb(${r}, ${g}, ${b})`
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

function mondayIndex(day) {
  return day === 0 ? 6 : day - 1
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function formatDay(date) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value || 0)
}

function dominantTheme(themes) {
  return [...themes.entries()].sort(([aTheme, aCount], [bTheme, bCount]) => bCount - aCount || aTheme.localeCompare(bTheme))[0]?.[0] || 'Unclassified'
}

function normalizedTheme(value) {
  const theme = (value || '').trim()
  if (!theme || theme.toLowerCase() === 'other') return 'Unclassified'
  return theme
}
