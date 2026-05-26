import MetricCard from './MetricCard'

export default function SummarySection({ recent24h, recent7d, recent30d }) {
  return (
    <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur">
      <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Recent activity</p>
      <div className="mt-6 grid gap-4">
        <MetricCard label="Last 24h" value={recent24h} />
        <MetricCard label="Past week" value={recent7d} />
        <MetricCard label="Past month" value={recent30d} />
      </div>
    </aside>
  )
}
