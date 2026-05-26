export default function MetricCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/5 p-5 text-center shadow-lg shadow-black/20">
      <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">{label}</p>
      <div className="mt-3 text-5xl font-semibold leading-none text-white">{value}</div>
    </div>
  )
}
