import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ActivityBarChart from '../components/ActivityBarChart'
import InsightCard from '../components/InsightCard'
import SectionChart from '../components/SectionChart'
import StatCard from '../components/StatCard'
import { parseTsv } from '../data'
import { deploymentsSourcePath, reposSourcePath, sourcePath, zone } from '../utils/activity'

const emptyStats = { commits: 0, deployments: 0, shippingRate: 0, activeRepos: 0, deployedRepos: 0 }
const tooltipProps = {
  contentStyle: { background: '#07110f', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' },
  labelStyle: { color: '#cbd5e1', fontWeight: 600 },
}

export default function ShippingPage() {
  const [commitRows, setCommitRows] = useState([])
  const [deploymentRows, setDeploymentRows] = useState([])
  const [repoRows, setRepoRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [chartsReady, setChartsReady] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch(sourcePath, { cache: 'no-store' }),
      fetch(deploymentsSourcePath, { cache: 'no-store' }),
      fetch(reposSourcePath, { cache: 'no-store' }),
    ])
      .then(async (responses) => {
        const failed = responses.find((response) => !response.ok)
        if (failed) throw new Error(`HTTP ${failed.status}`)
        return Promise.all(responses.map((response) => response.text()))
      })
      .then(([commitsText, deploymentsText, reposText]) => {
        if (!alive) return
        setCommitRows(parseTsv(commitsText).filter((row) => row && row.repo && row.committer_date))
        setDeploymentRows(parseTsv(deploymentsText).filter((row) => row && row.repo))
        setRepoRows(parseTsv(reposText).filter((row) => row && row.repo))
        setStatus('ready')
      })
      .catch((err) => {
        if (!alive) return
        setError(`Failed to load public shipping data: ${err.message}`)
        setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (status !== 'ready') return undefined
    const frame = window.requestAnimationFrame(() => setChartsReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [status])

  const publicRepoSet = useMemo(() => new Set(repoRows.map((row) => row.repo).filter(Boolean)), [repoRows])
  const publicCommits = useMemo(() => commitRows.filter((row) => publicRepoSet.has(row.repo)), [commitRows, publicRepoSet])
  const publicDeployments = useMemo(() => deploymentRows.filter((row) => publicRepoSet.has(row.repo) && row.deploy_at), [deploymentRows, publicRepoSet])
  const stats = useMemo(() => shippingStats(publicCommits, publicDeployments), [publicCommits, publicDeployments])
  const monthData = useMemo(() => monthlyFunnel(publicCommits, publicDeployments, zone.key), [publicCommits, publicDeployments])
  const repoData = useMemo(() => repoFunnel(publicRepoSet, publicCommits, publicDeployments), [publicRepoSet, publicCommits, publicDeployments])
  const topShippingRepos = useMemo(() => repoData.filter((row) => row.commits >= 5).sort(byShippingRate).slice(0, 10), [repoData])
  const lowShippingRepos = useMemo(() => repoData.filter((row) => row.commits >= 10 && row.shippingRate <= 10).sort(byCommitVolume).slice(0, 10), [repoData])
  const deployGapRepos = useMemo(() => repoData.filter((row) => row.medianDeployGapDays !== null).sort((a, b) => a.medianDeployGapDays - b.medianDeployGapDays || b.deployments - a.deployments).slice(0, 10), [repoData])
  const publishHeavyMonth = useMemo(() => monthData.filter((row) => row.commits > 0 && row.deployments > 0).sort((a, b) => b.shippingRate - a.shippingRate || b.deployments - a.deployments)[0], [monthData])
  const mostCommittedLowDeploy = lowShippingRepos[0]
  const displayStats = status === 'ready' ? stats : emptyStats

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:items-start">
          <div className="flex flex-col gap-5">
            <p className="text-sm uppercase tracking-[0.35em] text-lime-200/80">shipping funnel</p>
            <h1 className="max-w-4xl text-4xl font-semibold text-white sm:text-6xl">How coding activity reaches public Pages</h1>
            <p className="max-w-3xl text-base leading-8 text-slate-300">
              This view compares commits with successful GitHub Pages deployments for public owned repositories. It uses the public repository export as the allowlist for every count and chart.
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-lime-100/60">
              Last refreshed {formatLastUpdated(import.meta.env.VITE_APP_UPDATED_AT)}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Public commits" value={formatNumber(displayStats.commits)} subtitle="Committer timestamps" />
              <StatCard title="Public deployments" value={formatNumber(displayStats.deployments)} subtitle="Successful Pages statuses" />
              <StatCard title="Ship rate" value={formatRate(displayStats.shippingRate)} subtitle="Deployments per 100 commits" />
              <StatCard title="Repos shipped" value={`${formatNumber(displayStats.deployedRepos)} / ${formatNumber(displayStats.activeRepos)}`} subtitle="Public repos with commits" />
            </div>
          </div>

          <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-lime-950/20">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Public allowlist</p>
            <div className="mt-5 grid gap-4">
              <InsightCard label="Public repos loaded" value={formatNumber(publicRepoSet.size)} detail="From repos.tsv" />
              <InsightCard label="Publish-heavy month" value={publishHeavyMonth?.month || '...'} detail={`${formatRate(publishHeavyMonth?.shippingRate || 0)} per 100 commits`} />
              <InsightCard label="Quiet shipping pocket" value={shortRepo(mostCommittedLowDeploy?.repo)} detail={`${formatNumber(mostCommittedLowDeploy?.commits || 0)} commits, ${formatNumber(mostCommittedLowDeploy?.deployments || 0)} deployments`} />
            </div>
          </section>
        </div>

        <SectionChart title="Commits and deployments over time" subtitle="Monthly public commits with successful public Pages deployments" eyebrow="Monthly funnel" status={status} error={error}>
          <div className="h-96 min-h-0 w-full min-w-0">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <ComposedChart data={monthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="shippingCommitArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.72} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...tooltipProps} />
                  <Area yAxisId="left" type="monotone" dataKey="commits" stroke="#5eead4" strokeWidth={2} fill="url(#shippingCommitArea)" />
                  <Line yAxisId="right" type="monotone" dataKey="deployments" stroke="#bef264" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </SectionChart>

        <div className="grid gap-8 xl:grid-cols-2">
          <SectionChart title="Highest shipping ratios" subtitle="Public repos with at least five commits" eyebrow="Deployments per 100 commits" status={status} error={error}>
            <div className="h-[30rem] min-h-0 w-full min-w-0">
              {chartsReady ? <ActivityBarChart data={topShippingRepos} layout="vertical" xKey="shippingRate" yKey="repoLabel" dataKey="shippingRate" xAxisProps={{ type: 'number' }} yAxisProps={{ width: 170 }} barRadius={[0, 8, 8, 0]} colorOffset={3} margin={{ top: 10, right: 20, left: 180, bottom: 0 }} /> : null}
            </div>
          </SectionChart>

          <SectionChart title="Many commits, few deployments" subtitle="Public repos at or below ten deployments per 100 commits" eyebrow="Shipping pockets" status={status} error={error}>
            <div className="h-[30rem] min-h-0 w-full min-w-0">
              {chartsReady ? <ActivityBarChart data={lowShippingRepos} layout="vertical" xKey="commits" yKey="repoLabel" dataKey="commits" xAxisProps={{ type: 'number' }} yAxisProps={{ width: 170 }} barRadius={[0, 8, 8, 0]} colorOffset={0} margin={{ top: 10, right: 20, left: 180, bottom: 0 }} /> : null}
            </div>
          </SectionChart>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <SectionChart title="Median deployment gaps" subtitle="Median days between successful Pages deployments by public repo" eyebrow="Publishing rhythm" status={status} error={error}>
            <div className="h-[30rem] min-h-0 w-full min-w-0">
              {chartsReady ? <ActivityBarChart data={deployGapRepos} layout="vertical" xKey="medianDeployGapDays" yKey="repoLabel" dataKey="medianDeployGapDays" xAxisProps={{ type: 'number' }} yAxisProps={{ width: 170 }} barRadius={[0, 8, 8, 0]} colorOffset={2} margin={{ top: 10, right: 20, left: 180, bottom: 0 }} /> : null}
            </div>
          </SectionChart>

          <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Repo funnel</p>
                <h2 className="text-xl font-semibold text-white">Public repos with commit and deployment context</h2>
              </div>
              <p className="text-sm text-slate-300">{formatNumber(repoData.length)} public repos in this view</p>
            </div>
            <div className="grid gap-3">
              {topShippingRepos.slice(0, 6).map((row) => (
                <a key={row.repo} href={`https://github.com/${row.repo}`} className="grid gap-2 rounded-xl border border-white/10 bg-black/15 p-4 hover:border-lime-200/40 sm:grid-cols-[1fr_auto]">
                  <span>
                    <span className="block text-sm font-semibold text-white">{shortRepo(row.repo)}</span>
                    <span className="mt-1 block text-sm text-slate-300">{formatNumber(row.commits)} commits, {formatNumber(row.deployments)} deployments</span>
                  </span>
                  <span className="text-sm text-slate-400">{formatRate(row.shippingRate)} per 100</span>
                </a>
              ))}
            </div>
          </section>
        </div>

        <SectionChart title="Monthly shipping rate" subtitle="Successful Pages deployments per 100 public commits" eyebrow="Rate" status={status} error={error}>
          <div className="h-72 min-h-0 w-full min-w-0">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={monthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="shippingRateArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#bef264" stopOpacity={0.76} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...tooltipProps} />
                  <Area type="monotone" dataKey="shippingRate" stroke="#bef264" strokeWidth={2} fill="url(#shippingRateArea)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </SectionChart>

        <section className="rounded-2xl border border-lime-200/15 bg-lime-200/[0.06] p-6 text-sm leading-7 text-lime-50/85">
          <p className="font-semibold text-lime-50">Measurement notes</p>
          <p>The page uses repos.tsv as the public owned non-fork repository allowlist. Commit counts use committer timestamps, and deployment counts use successful GitHub Pages status timestamps in Europe/Paris. Deployment SHAs sometimes identify a Pages branch or build artifact, so this view compares repos and time buckets.</p>
        </section>
      </section>
    </main>
  )
}

function shippingStats(commits, deployments) {
  const activeRepos = new Set(commits.map((row) => row.repo)).size
  const deployedRepos = new Set(deployments.map((row) => row.repo)).size
  return {
    commits: commits.length,
    deployments: deployments.length,
    shippingRate: rate(deployments.length, commits.length),
    activeRepos,
    deployedRepos,
  }
}

function monthlyFunnel(commits, deployments, timeZone) {
  const months = new Map()
  for (const row of commits) {
    const month = localMonthKey(row.committer_date, timeZone)
    if (!month) continue
    const item = months.get(month) || { month, commits: 0, deployments: 0, shippingRate: 0 }
    item.commits += 1
    months.set(month, item)
  }
  for (const row of deployments) {
    const month = localMonthKey(row.deploy_at, timeZone)
    if (!month) continue
    const item = months.get(month) || { month, commits: 0, deployments: 0, shippingRate: 0 }
    item.deployments += 1
    months.set(month, item)
  }
  return [...months.values()]
    .map((item) => ({ ...item, shippingRate: Number(rate(item.deployments, item.commits).toFixed(1)) }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

function repoFunnel(publicRepoSet, commits, deployments) {
  const repos = new Map([...publicRepoSet].map((repo) => [repo, { repo, repoLabel: shortRepo(repo), commits: 0, deployments: 0, deployDates: [], lastCommitAt: '', lastDeployAt: '' }]))
  for (const row of commits) {
    const item = repos.get(row.repo)
    if (!item) continue
    item.commits += 1
    item.lastCommitAt = maxDate(item.lastCommitAt, row.committer_date)
  }
  for (const row of deployments) {
    const item = repos.get(row.repo)
    if (!item) continue
    item.deployments += 1
    item.deployDates.push(row.deploy_at)
    item.lastDeployAt = maxDate(item.lastDeployAt, row.deploy_at)
  }
  return [...repos.values()]
    .filter((row) => row.commits > 0 || row.deployments > 0)
    .map((row) => ({
      ...row,
      shippingRate: Number(rate(row.deployments, row.commits).toFixed(1)),
      medianDeployGapDays: medianDeployGapDays(row.deployDates),
    }))
}

function medianDeployGapDays(dates) {
  const sorted = dates.map((date) => new Date(date).getTime()).filter(Number.isFinite).sort((a, b) => a - b)
  if (sorted.length < 2) return null
  const gaps = []
  for (let i = 1; i < sorted.length; i += 1) gaps.push((sorted[i] - sorted[i - 1]) / 86400000)
  return Number(median(gaps).toFixed(1))
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function rate(numerator, denominator) {
  return denominator > 0 ? (numerator / denominator) * 100 : 0
}

function byShippingRate(a, b) {
  return b.shippingRate - a.shippingRate || b.deployments - a.deployments || b.commits - a.commits || a.repo.localeCompare(b.repo)
}

function byCommitVolume(a, b) {
  return b.commits - a.commits || a.shippingRate - b.shippingRate || a.repo.localeCompare(b.repo)
}

function maxDate(a, b) {
  if (!a) return b || ''
  if (!b) return a
  return new Date(b).getTime() > new Date(a).getTime() ? b : a
}

function localMonthKey(date, timeZone) {
  if (!date) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone,
  }).formatToParts(new Date(date))
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return values.year ? `${values.year}-${values.month}` : ''
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { notation: value > 99999 ? 'compact' : 'standard' }).format(value || 0)
}

function formatRate(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value || 0)
}

function formatLastUpdated(value) {
  if (!value) return ''
  const formatted = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: zone.key,
  }).format(new Date(value))
  return `${formatted} Paris time`
}

function shortRepo(repo = '') {
  return repo.split('/').pop() || '...'
}
