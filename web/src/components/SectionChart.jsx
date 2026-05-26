import ChartCard from './ChartCard'
import PageSection from './PageSection'

export default function SectionChart({ title, subtitle, eyebrow, children, status, error }) {
  return (
    <ChartCard title={title} subtitle={subtitle} status={status} error={error}>
      <PageSection eyebrow={eyebrow} title={title}>{children}</PageSection>
    </ChartCard>
  )
}
