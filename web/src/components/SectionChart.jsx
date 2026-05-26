import ChartCard from './ChartCard'

export default function SectionChart({ title, subtitle, eyebrow, children, status, error }) {
  return (
    <ChartCard title={title} subtitle={subtitle} status={status} error={error}>
      <p className="mb-4 text-sm uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p>
      {children}
    </ChartCard>
  )
}
