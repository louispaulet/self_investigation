export default function StatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-lg shadow-black/20">
      <p className="text-xs uppercase tracking-[0.24em] text-teal-100/70">{title}</p>
      <div className="mt-3 text-3xl font-semibold leading-none text-white sm:text-4xl">{value}</div>
      <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
    </div>
  )
}
