export default function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-teal-300/15 bg-teal-300/5 p-4 text-center shadow-lg shadow-black/10">
      <p className="text-xs uppercase tracking-[0.22em] text-teal-100/70">{label}</p>
      <div className="mt-2 text-3xl font-semibold leading-none text-white">{value}</div>
    </div>
  )
}
