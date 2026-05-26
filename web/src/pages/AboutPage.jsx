export default function AboutPage() {
  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-4xl flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">about</p>
        <h1 className="text-4xl font-semibold tracking-tight">Why this project exists</h1>
        <div className="space-y-4 text-sm leading-7 text-slate-300 sm:text-base">
          <p>
            This site turns commit history into a small personal dashboard. It focuses on patterns in time, project
            concentration, and the shape of work across days and hours.
          </p>
          <p>
            The data comes from local GitHub analysis scripts and a TSV export. The charts are meant to support
            reflection, not to claim perfect accuracy about intent or productivity.
          </p>
          <p>
            Use the hash-based routes to move between the dashboard and supporting pages without server configuration.
          </p>
        </div>
      </section>
    </main>
  )
}
