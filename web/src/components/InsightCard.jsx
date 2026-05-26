export default function InsightCard({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 text-center">
      <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">{label}</p>
      <p className="mt-3 text-4xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-300">{detail}</p>
    </div>
  )
}
