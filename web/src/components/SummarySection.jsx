import MetricCard from './MetricCard'

export default function SummarySection({ recent24h, recent7d, recent30d, stats }) {
  return (
    <aside className="rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-xl shadow-black/20 backdrop-blur">
      <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Five-year pulse</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <MetricCard label="Commits" value={stats.commits} />
        <MetricCard label="Repos" value={stats.repos} />
        <MetricCard label="Active days" value={stats.activeDays} />
        <MetricCard label="Best streak" value={stats.longestStreak} />
      </div>
      <div className="mt-5 grid gap-3">
        <MetricCard label="Last 24h" value={recent24h} />
        <MetricCard label="Past week" value={recent7d} />
        <MetricCard label="Past month" value={recent30d} />
      </div>
    </aside>
  )
}
