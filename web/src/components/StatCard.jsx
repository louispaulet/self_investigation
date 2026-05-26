export default function StatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 text-center shadow-lg shadow-black/20">
      <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">{title}</p>
      <div className="mt-3 text-4xl font-semibold leading-none text-white">{value}</div>
      <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
    </div>
  )
}
