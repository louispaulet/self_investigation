import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { colors } from '../utils/activity'

const tooltipProps = {
  cursor: { fill: 'rgba(148,163,184,0.08)' },
  contentStyle: { background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' },
  labelStyle: { color: '#cbd5e1', fontWeight: 600 },
  itemStyle: { color: '#e2e8f0' },
}

export default function ActivityBarChart({ data, layout = 'horizontal', xKey, yKey, dataKey = 'commits', xAxisProps = {}, yAxisProps = {}, barRadius, colorOffset = 0, margin }) {
  const chartMargin = margin || (layout === 'vertical' ? { top: 10, right: 20, left: 8, bottom: 0 } : { top: 10, right: 10, left: 0, bottom: 0 })
  const axisTick = { fill: '#cbd5e1', fontSize: 12 }
  const mergedXAxisProps = mergeAxisProps(axisTick, xAxisProps)
  const mergedYAxisProps = mergeAxisProps(axisTick, yAxisProps)

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
      <BarChart data={data} layout={layout} margin={chartMargin}>
        <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={layout === 'horizontal'} horizontal={layout === 'vertical'} />
        <XAxis dataKey={xKey} type={layout === 'vertical' ? 'number' : 'category'} tickLine={false} axisLine={false} allowDecimals={false} {...mergedXAxisProps} />
        <YAxis dataKey={yKey} type={layout === 'vertical' ? 'category' : 'number'} tickLine={false} axisLine={false} allowDecimals={false} {...mergedYAxisProps} />
        <Tooltip {...tooltipProps} />
        <Bar dataKey={dataKey} radius={barRadius} isAnimationActive={false}>
          {data.map((item, i) => <Cell key={`${item[yKey] ?? item[xKey]}-${i}`} fill={colors[(i + colorOffset) % colors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function mergeAxisProps(defaultTick, props) {
  const { tick, ...rest } = props
  const mergedTick = tick === undefined || typeof tick === 'object' ? { ...defaultTick, ...(tick || {}) } : tick
  return { ...rest, tick: mergedTick }
}
