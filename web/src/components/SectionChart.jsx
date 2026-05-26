import ChartCard from './ChartCard'

export default function SectionChart({ title, subtitle, eyebrow, children, status, error }) {
  return (
    <ChartCard title={title} subtitle={subtitle} status={status} error={error}>
      <p className="mb-4 text-sm uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p>
      {status === 'ready' ? children : <div className="h-72 rounded-2xl border border-white/10 bg-black/10" />}
    </ChartCard>
  )
}
