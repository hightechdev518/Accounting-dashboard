import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const fills = ['#64748b', '#3b82f6', '#93c5fd', '#f97316', '#22c55e']

export default function BillsChart({ billsData = [] }) {
  if (!billsData.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        No chart data
      </div>
    )
  }

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
            formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Total']}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '0.5px solid #e5e7eb',
            }}
          />
          <Bar dataKey="total" name="Total" radius={[3, 3, 0, 0]}>
            {billsData.map((_, i) => (
              <Cell key={`bar-${i}`} fill={fills[i % fills.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
