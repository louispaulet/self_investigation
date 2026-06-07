export default function ChartCard({ title, subtitle, children, status, error }) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20 backdrop-blur sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="text-sm text-slate-300">{subtitle}</p>
        </div>
        <div className="w-fit shrink-0 rounded-full border border-teal-300/30 bg-teal-300/10 px-3 py-1 text-xs text-teal-100">
          {status === 'ready' ? 'static data' : status}
        </div>
      </div>
      {error ? <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
      {children}
    </section>
  )
}
