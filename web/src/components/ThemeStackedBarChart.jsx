import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { themeColors } from '../utils/activity'

const axisTick = { fill: '#cbd5e1', fontSize: 12 }
const numberFormatter = new Intl.NumberFormat('en-US')

export default function ThemeStackedBarChart({ data, themes }) {
  const chartWidth = Math.max(1080, data.length * 12)

  if (!themes.length) {
    return <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-black/10 text-sm text-slate-300">No theme data loaded yet.</div>
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="min-h-0 flex-1 overflow-x-auto pb-2">
        <div className="h-full min-h-[22rem]" style={{ width: `${chartWidth}px` }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 20 }} barCategoryGap="28%">
              <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} minTickGap={30} tick={axisTick} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={axisTick} />
              <Tooltip content={<ThemeTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              {themes.map((theme, index) => (
                <Bar key={theme} dataKey={theme} stackId="themes" fill={themeColors[index % themeColors.length]} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
        {themes.map((theme, index) => (
          <span key={theme} className="flex min-w-0 items-start gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: themeColors[index % themeColors.length] }} />
            <span className="leading-tight">{theme}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function ThemeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  const visible = payload
    .filter((item) => Number(item.value) > 0)
    .sort((a, b) => Number(b.value) - Number(a.value) || String(a.name).localeCompare(String(b.name)))
  const hidden = Math.max(0, Number(row?.commits || 0) - Number(row?.shownCommits || 0))

  return (
    <div className="max-w-xs rounded-xl border border-slate-400/25 bg-slate-950 p-3 text-sm text-slate-100 shadow-xl">
      <p className="font-semibold text-white">{label}</p>
      <p className="mt-1 text-xs text-slate-300">{numberFormatter.format(row?.commits || 0)} commits in this week</p>
      <div className="mt-3 grid gap-1.5">
        {visible.length ? visible.map((item) => (
          <div key={item.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
            <span className="truncate text-slate-200">{item.name}</span>
            <span className="font-medium text-white">{numberFormatter.format(item.value)}</span>
          </div>
        )) : <p className="text-xs text-slate-300">No commits from the displayed theme set.</p>}
      </div>
      {hidden > 0 ? <p className="mt-3 text-xs text-slate-400">{numberFormatter.format(hidden)} commits are in lower-volume themes.</p> : null}
    </div>
  )
}
