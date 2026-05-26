import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { colors } from '../utils/activity'

const tooltipProps = {
  cursor: { fill: 'rgba(148,163,184,0.08)' },
  contentStyle: { background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', color: '#e2e8f0' },
  labelStyle: { color: '#cbd5e1', fontWeight: 600 },
  itemStyle: { color: '#e2e8f0' },
}

export default function ActivityBarChart({ data, layout = 'horizontal', xKey, yKey, xAxisProps = {}, yAxisProps = {}, barRadius, colorOffset = 0, margin }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={layout} margin={margin}>
        <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={layout === 'horizontal'} horizontal={layout === 'vertical'} />
        <XAxis dataKey={xKey} type={layout === 'vertical' ? 'number' : 'category'} tickLine={false} axisLine={false} allowDecimals={false} {...xAxisProps} />
        <YAxis dataKey={yKey} type={layout === 'vertical' ? 'category' : 'number'} tickLine={false} axisLine={false} allowDecimals={false} {...yAxisProps} />
        <Tooltip {...tooltipProps} />
        <Bar dataKey="commits" radius={barRadius}>
          {data.map((item, i) => <Cell key={item[xKey] ?? item[yKey]} fill={colors[(i + colorOffset) % colors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
