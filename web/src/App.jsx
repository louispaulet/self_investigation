import './App.css'

const data = [
  { label: 'Mon', value: 22 },
  { label: 'Tue', value: 8 },
  { label: 'Wed', value: 31 },
  { label: 'Thu', value: 42 },
  { label: 'Fri', value: 108 },
  { label: 'Sat', value: 101 },
  { label: 'Sun', value: 142 },
]

const max = Math.max(...data.map((d) => d.value))

function App() {
  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
            self investigation
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Commit activity radar
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            A quick visual of commit intensity by day of week, built from the
            last 3 months of GitHub history.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Weekly peaks</h2>
                <p className="text-sm text-slate-300">Commit count by day</p>
              </div>
              <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                506 commits
              </div>
            </div>

            <div className="flex h-80 items-end gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              {data.map((item) => {
                const height = `${Math.max((item.value / max) * 100, 8)}%`
                return (
                  <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
                    <div className="flex h-full w-full items-end justify-center">
                      <div
                        className="w-full max-w-12 rounded-t-2xl bg-gradient-to-t from-fuchsia-500 via-cyan-400 to-emerald-300 shadow-lg shadow-cyan-500/20 transition-transform duration-300 hover:scale-[1.03]"
                        style={{ height }}
                        title={`${item.label}: ${item.value}`}
                      />
                    </div>
                    <div className="text-xs font-medium text-slate-300">{item.label}</div>
                    <div className="text-sm font-semibold text-white">{item.value}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <aside className="grid gap-4">
            <StatCard title="Best day" value="Sunday" subtitle="142 commits" />
            <StatCard title="Best hour" value="22:00" subtitle="Late-night focus" />
            <StatCard title="Top theme" value="Crawler / SEO" subtitle="Repeated across many repos" />
            <StatCard title="Repos" value="41" subtitle="Active in the last 3 months" />
          </aside>
        </div>
      </section>
    </main>
  )
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur">
      <p className="text-sm uppercase tracking-[0.28em] text-slate-400">{title}</p>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
    </div>
  )
}

export default App
