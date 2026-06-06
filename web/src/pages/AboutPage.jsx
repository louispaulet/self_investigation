export default function AboutPage() {
  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-4xl flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">about</p>
        <h1 className="text-4xl font-semibold tracking-tight">Why this project exists</h1>
        <div className="space-y-4 text-sm leading-7 text-slate-300 sm:text-base">
          <p>
            This site turns GitHub activity into a personal record of attention. It follows when commits happen,
            which projects receive sustained work, when GitHub Pages deployments finish, and how small acts of building repeat across days and hours.
          </p>
          <p>
            The data comes from local GitHub analysis scripts and TSV exports. Commit charts use committer timestamps.
            Deployment charts use successful GitHub Pages status timestamps. Each source carries its own limits.
          </p>
          <p>
            The project separates raw measurements from interpretation. Commit timestamps, repository counts,
            deployment records, and message themes describe observable traces. Any reading of intent stays careful and provisional.
          </p>
        </div>
      </section>
    </main>
  )
}
