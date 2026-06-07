import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import InsightCard from '../components/InsightCard'
import SectionChart from '../components/SectionChart'
import StatCard from '../components/StatCard'
import { parseTsv } from '../data'
import {
  averageHourRecords,
  averageHourRows,
  averageSecondRows,
  yearHalfProfiles,
  yearSeasonProfiles,
} from '../utils/averageHour'
import { averageHourStoriesSourcePath, deploymentsSourcePath, sourcePath, zone } from '../utils/activity'

const emptyStories = { stories: [], source_counts: { commits: 0, deployments: 0, events: 0 }, records: {} }
const paletteStops = [
  { value: 0, color: [59, 76, 192] },
  { value: 0.25, color: [132, 166, 239] },
  { value: 0.5, color: [221, 221, 221] },
  { value: 0.75, color: [244, 152, 122] },
  { value: 1, color: [180, 4, 38] },
]
const tooltipProps = {
  contentStyle: { background: '#07110f', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' },
  labelStyle: { color: '#cbd5e1', fontWeight: 600 },
}

export default function AverageHourPage() {
  const [commitRows, setCommitRows] = useState([])
  const [deploymentRows, setDeploymentRows] = useState([])
  const [storiesPayload, setStoriesPayload] = useState(emptyStories)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [chartsReady, setChartsReady] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch(sourcePath, { cache: 'no-store' }),
      fetch(deploymentsSourcePath, { cache: 'no-store' }),
      fetch(averageHourStoriesSourcePath, { cache: 'no-store' }).catch(() => null),
    ])
      .then(async ([commitsResponse, deploymentsResponse, storiesResponse]) => {
        if (!commitsResponse.ok) throw new Error(`HTTP ${commitsResponse.status} for ${sourcePath}`)
        if (!deploymentsResponse.ok) throw new Error(`HTTP ${deploymentsResponse.status} for ${deploymentsSourcePath}`)
        const commitsText = await commitsResponse.text()
        const deploymentsText = await deploymentsResponse.text()
        const stories = storiesResponse?.ok ? await storiesResponse.json() : emptyStories
        return [commitsText, deploymentsText, stories]
      })
      .then(([commitsText, deploymentsText, stories]) => {
        if (!alive) return
        setCommitRows(parseTsv(commitsText).filter((row) => row && row.repo && row.committer_date))
        setDeploymentRows(parseTsv(deploymentsText).filter((row) => row && row.repo && row.deploy_at))
        setStoriesPayload(stories || emptyStories)
        setStatus('ready')
      })
      .catch((err) => {
        if (!alive) return
        setError(`Failed to load average-hour data: ${err.message}`)
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

  const minuteRows = useMemo(() => averageHourRows(commitRows, deploymentRows), [commitRows, deploymentRows])
  const secondRows = useMemo(() => averageSecondRows(commitRows, deploymentRows), [commitRows, deploymentRows])
  const seasonProfiles = useMemo(() => yearSeasonProfiles(commitRows, { timeZone: zone.key }), [commitRows])
  const halfProfiles = useMemo(() => yearHalfProfiles(commitRows, { timeZone: zone.key }), [commitRows])
  const records = useMemo(() => averageHourRecords(commitRows, deploymentRows, { timeZone: zone.key }), [commitRows, deploymentRows])
  const totalCommits = commitRows.length
  const totalDeployments = deploymentRows.length
  const busiestMinute = records.busiestMinuteOfHour
  const busiestSecond = records.busiestSecondOfMinute
  const maxMinuteCount = Math.max(1, ...minuteRows.map((row) => row.commits))
  const maxSeasonCount = Math.max(1, ...seasonProfiles.flatMap((row) => row.counts))
  const maxHalfCount = Math.max(1, ...halfProfiles.flatMap((row) => row.counts))
  const strongestEnd = useMemo(() => maxBy(seasonProfiles.filter((row) => row.total), (row) => row.endMinusBeginning), [seasonProfiles])
  const strongestBeginning = useMemo(() => minBy(seasonProfiles.filter((row) => row.total), (row) => row.endMinusBeginning), [seasonProfiles])
  const displayStories = storiesPayload?.stories || []

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:items-start">
          <div className="flex flex-col gap-5">
            <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">average hour</p>
            <h1 className="max-w-4xl text-4xl font-semibold text-white sm:text-6xl">The minute hand across five years</h1>
            <p className="max-w-3xl text-base leading-8 text-slate-300">
              This page folds every commit and successful Pages deployment into one imagined hour. The hour and day fall away, leaving the minute and second where each trace landed.
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-rose-100/60">
              Last refreshed {formatLastUpdated(import.meta.env.VITE_APP_UPDATED_AT)}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard title="Commits studied" value={formatNumber(totalCommits)} subtitle="Committer timestamps" />
              <StatCard title="Deployments studied" value={formatNumber(totalDeployments)} subtitle="Successful Pages statuses" />
              <StatCard title="Peak commit minute" value={busiestMinute ? `:${String(busiestMinute.minute).padStart(2, '0')}` : '...'} subtitle={`${formatNumber(busiestMinute?.commits || 0)} commits`} />
            </div>
          </div>

          <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-rose-950/20">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Minute signals</p>
            <div className="mt-5 grid gap-4">
              <InsightCard label="Peak chance" value={formatPercent(busiestMinute?.commitProbability || 0)} detail={`Commit probability at :${String(busiestMinute?.minute || 0).padStart(2, '0')}`} />
              <InsightCard label="Peak second" value={`:${String(busiestSecond?.second || 0).padStart(2, '0')}`} detail={`${formatNumber(busiestSecond?.commits || 0)} commits at this second`} />
              <InsightCard label="Stories generated" value={formatNumber(displayStories.length)} detail={storiesPayload?.model_error ? 'Fallback wording used' : 'Static story artifact'} />
            </div>
          </section>
        </div>

        <SectionChart title="Commit counts per minute" subtitle="Each dot is one minute of the average hour, colored with a coolwarm palette" eyebrow="Dot matrix" status={status} error={error}>
          <DotMatrix rows={minuteRows} max={maxMinuteCount} />
        </SectionChart>

        <SectionChart title="Chance of committing by minute" subtitle="Share of all five-year commits that land on each minute of an hour" eyebrow="Probability" status={status} error={error}>
          <div className="max-w-full overflow-x-auto pb-2">
            <div className="h-80 min-w-[860px]">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={minuteRows} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                    <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} interval={4} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} width={44} />
                    <Tooltip {...tooltipProps} formatter={(value, name) => [name === 'commitProbability' ? `${Number(value).toFixed(2)}%` : value, name === 'commitProbability' ? 'commit chance' : name]} />
                    <Bar dataKey="commitProbability" fill="#fb7185" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>
        </SectionChart>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <SectionChart title="Seconds inside the minute" subtitle="Commit and deployment events by second, folded across the full export" eyebrow="Seconds" status={status} error={error}>
            <div className="max-w-full overflow-x-auto pb-2">
              <div className="h-72 min-w-[780px]">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={secondRows} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                      <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} interval={4} />
                      <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                      <Tooltip {...tooltipProps} />
                      <Bar dataKey="commits" stackId="events" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="deployments" stackId="events" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </div>
          </SectionChart>

          <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Records</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Densest real moments</h2>
            <div className="mt-5 grid gap-3">
              <RecordCard label="Actual 60-second window" record={records.busiestRealMinute} />
              <RecordCard label="Actual hour" record={records.busiestRealHour} />
              <RecordCard label="Actual day" record={records.busiestRealDay} />
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
          <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Seasons</p>
              <h2 className="text-xl font-semibold text-white">Beginning and end of the hour by season</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                Beginning means minutes :00-:19. End means :40-:59. Positive bias points toward late-hour commits, and negative bias points toward early-hour commits.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[28rem]">
              <InsightCard label="Most late-hour season" value={profileName(strongestEnd)} detail={`${formatSignedPercent(strongestEnd?.endMinusBeginning || 0)} end bias`} />
              <InsightCard label="Most early-hour season" value={profileName(strongestBeginning)} detail={`${formatSignedPercent(strongestBeginning?.endMinusBeginning || 0)} end bias`} />
            </div>
          </div>
          <ProfileGrid profiles={seasonProfiles} max={maxSeasonCount} />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
          <div className="mb-5">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Half years</p>
            <h2 className="text-xl font-semibold text-white">First and last half of each year</h2>
          </div>
          <ProfileGrid profiles={halfProfiles} max={maxHalfCount} compact />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Story hours</p>
              <h2 className="text-xl font-semibold text-white">Hours where the messages cluster</h2>
            </div>
            <p className="text-sm text-slate-300">{formatNumber(storiesPayload?.source_counts?.events || 0)} total events considered</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {displayStories.map((story) => (
              <StoryCard key={story.key} story={story} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-rose-200/15 bg-rose-200/[0.06] p-6 text-sm leading-7 text-rose-50/85">
          <p className="font-semibold text-rose-50">Measurement notes</p>
          <p>Minute and second charts use only the minute and second from each timestamp. Seasonal and half-year comparisons use Europe/Paris calendar months to choose comparison groups. Story cards use actual Paris-local hours so the surrounding messages can be read together.</p>
        </section>
      </section>
    </main>
  )
}

function DotMatrix({ rows, max }) {
  return (
    <div className="mx-auto grid max-w-4xl grid-cols-10 gap-1.5 sm:gap-2">
      {rows.map((row) => (
        <span
          key={row.label}
          title={`${row.label}: ${row.commits} commits, ${row.deployments} deployments`}
          className="flex aspect-square min-h-0 items-center justify-center rounded-full border border-black/25 text-[0.65rem] font-semibold text-white shadow-lg shadow-black/10 sm:text-xs"
          style={{ backgroundColor: row.commits ? coolwarm(row.commits / max) : 'rgba(255,255,255,0.06)' }}
        >
          {row.label}
        </span>
      ))}
    </div>
  )
}

function ProfileGrid({ profiles, max, compact = false }) {
  return (
    <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2 xl:grid-cols-5' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
      {profiles.map((profile) => (
        <ProfileCard key={`${profile.year}-${profile.group}`} profile={profile} max={max} />
      ))}
    </div>
  )
}

function ProfileCard({ profile, max }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/15 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{profile.year}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{profile.label}</h3>
        </div>
        <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${profile.endMinusBeginning >= 0 ? 'border-rose-200/25 bg-rose-300/10 text-rose-100' : 'border-sky-200/25 bg-sky-300/10 text-sky-100'}`}>
          {formatSignedPercent(profile.endMinusBeginning)}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-300">
        <span><strong className="block text-white">{formatNumber(profile.total)}</strong>commits</span>
        <span><strong className="block text-white">:{String(profile.peakMinute).padStart(2, '0')}</strong>peak</span>
        <span><strong className="block text-white">{formatPercent(profile.endShare * 100)}</strong>end</span>
      </div>
      <div className="mt-4 grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1">
        {profile.counts.map((count, index) => (
          <span
            key={index}
            title={`:${String(index).padStart(2, '0')}: ${count} commits`}
            className="aspect-square rounded-[3px] border border-black/20"
            style={{ backgroundColor: count ? coolwarm(count / max) : 'rgba(255,255,255,0.055)' }}
          />
        ))}
      </div>
    </article>
  )
}

function RecordCard({ label, record }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/15 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{record?.key || '...'}</p>
      <p className="mt-1 text-sm text-slate-300">
        {formatNumber(record?.commitCount || 0)} commits, {formatNumber(record?.deploymentCount || 0)} deployments
      </p>
      {record?.messages?.length ? <p className="mt-2 line-clamp-2 text-sm text-slate-400">{record.messages.slice(0, 2).join(' / ')}</p> : null}
    </div>
  )
}

function StoryCard({ story }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/15 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{formatStoryDate(story.key)}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{story.title}</h3>
        </div>
        <span className="w-fit rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-slate-300">{story.story_source}</span>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-300">{story.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-md border border-rose-200/20 bg-rose-300/10 px-2 py-1 text-xs text-rose-100">{formatNumber(story.commit_count)} commits</span>
        <span className="rounded-md border border-amber-200/20 bg-amber-300/10 px-2 py-1 text-xs text-amber-100">{formatNumber(story.deployment_count)} deployments</span>
        {story.repos?.slice(0, 3).map((repo) => <span key={repo} className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-slate-300">{shortRepo(repo)}</span>)}
      </div>
      {story.messages?.length ? (
        <ul className="mt-4 grid gap-2 text-sm text-slate-400">
          {story.messages.slice(0, 3).map((message) => (
            <li key={message} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">{message}</li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

function coolwarm(value) {
  const clamped = Math.max(0, Math.min(1, value))
  const upperIndex = paletteStops.findIndex((stop) => stop.value >= clamped)
  const upper = paletteStops[Math.max(upperIndex, 1)]
  const lower = paletteStops[Math.max(upperIndex - 1, 0)]
  const range = upper.value - lower.value || 1
  const amount = (clamped - lower.value) / range
  const [r, g, b] = lower.color.map((channel, index) => Math.round(channel + (upper.color[index] - channel) * amount))
  return `rgb(${r}, ${g}, ${b})`
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { notation: value > 99999 ? 'compact' : 'standard' }).format(value || 0)
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`
}

function formatSignedPercent(value) {
  const percent = (value || 0) * 100
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`
}

function formatStoryDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: zone.key }).format(new Date(value))
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

function profileName(profile) {
  return profile ? `${profile.label} ${profile.year}` : '...'
}

function shortRepo(repo = '') {
  return repo.split('/').pop() || '...'
}

function maxBy(rows, score) {
  return rows.reduce((best, row) => (!best || score(row) > score(best) ? row : best), null)
}

function minBy(rows, score) {
  return rows.reduce((best, row) => (!best || score(row) < score(best) ? row : best), null)
}
