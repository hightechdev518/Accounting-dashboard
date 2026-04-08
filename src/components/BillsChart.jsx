import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { billsData } from '../data/mockData'

const awaitingColors = ['#64748b', '#3b82f6', '#93c5fd', '#e5e7eb', '#e5e7eb']
const overdueColors = ['#e5e7eb', '#e5e7eb', '#e5e7eb', '#f97316', '#e5e7eb']

export default function BillsChart() {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={billsData} barCategoryGap="25%" barGap={2}>
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            formatter={(v, name) => [`$${Number(v).toLocaleString()}`, name]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '0.5px solid #e5e7eb',
            }}
          />
          <Bar dataKey="awaiting" name="Awaiting" radius={[3, 3, 0, 0]}>
            {billsData.map((_, i) => (
              <Cell key={`awaiting-${i}`} fill={awaitingColors[i]} />
            ))}
          </Bar>
          <Bar dataKey="overdue" name="Overdue" radius={[3, 3, 0, 0]}>
            {billsData.map((_, i) => (
              <Cell key={`overdue-${i}`} fill={overdueColors[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
