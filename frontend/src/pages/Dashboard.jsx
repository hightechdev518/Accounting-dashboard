import { DollarSign, FileText, RefreshCw } from 'lucide-react'
import BillsChart from '../components/BillsChart'
import InvoicesTable from '../components/InvoicesTable'
import LoadingSpinner, { QueryError } from '../components/LoadingSpinner'
import {
  useDashboardBillsChart,
  useDashboardDeadlines,
  useDashboardStats,
} from '../hooks/queries'
import { useAuth } from '../context/AuthContext'

const monthColors = { JAN: '#3b82f6', MAY: '#f97316', OCT: '#9ca3af' }

const quickActions = [
  {
    icon: FileText,
    name: 'Create Invoice',
    desc: 'Generate detailed invoices for your clients and get paid faster.',
    btn: 'New Invoice',
  },
  {
    icon: DollarSign,
    name: 'Log Expense',
    desc: 'Record business spending, capture receipts, and categorize costs.',
    btn: 'Log Expense',
  },
  {
    icon: RefreshCw,
    name: 'Sync Bank Feed',
    desc: 'Safely connect your bank accounts for automatic reconciliation.',
    btn: 'Connect Now',
  },
]

function formatMoney(n) {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  })
}

function formatPctChange(p) {
  if (p == null || Number.isNaN(p)) return '—'
  const arrow = p >= 0 ? '↑' : '↓'
  return `${arrow} ${Math.abs(p).toFixed(1)}% vs last month`
}

export default function Dashboard() {
  const { user } = useAuth()
  const statsQ = useDashboardStats()
  const chartQ = useDashboardBillsChart()
  const deadlinesQ = useDashboardDeadlines()

  const loading = statsQ.isPending || chartQ.isPending || deadlinesQ.isPending
  const error =
    statsQ.error?.message ||
    chartQ.error?.message ||
    deadlinesQ.error?.message

  function refetchAll() {
    statsQ.refetch()
    chartQ.refetch()
    deadlinesQ.refetch()
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center p-8">
        <LoadingSpinner label="Loading dashboard…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <QueryError message={error} onRetry={refetchAll} />
      </div>
    )
  }

  const stats = statsQ.data
  const billsChart = chartQ.data ?? []
  const deadlines = deadlinesQ.data ?? []

  const billsSummary = {
    awaiting: stats.outstanding.sum,
    overdue: stats.overdue.sum,
    awaitingCount: stats.outstanding.count,
    overdueCount: stats.overdue.count,
  }

  const metrics = [
    {
      label: 'Total Revenue',
      value: formatMoney(stats.totalRevenue),
      change: formatPctChange(stats.revenueChangePercent),
      up: stats.revenueChangePercent >= 0,
    },
    {
      label: 'Outstanding',
      value: formatMoney(stats.outstanding.sum),
      change: `${stats.outstanding.count} bills awaiting`,
      up: null,
    },
    {
      label: 'Overdue',
      value: formatMoney(stats.overdue.sum),
      change: `${stats.overdue.count} overdue bills`,
      up: false,
    },
    {
      label: 'Net Profit',
      value: formatMoney(stats.netProfit),
      change: formatPctChange(stats.netProfitChangePercent),
      up: stats.netProfitChangePercent >= 0,
    },
  ]

  const displayName = user?.name?.split(' ')[0] || 'there'

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h2 className="text-xl font-medium text-gray-900">
        Welcome back, {displayName}! 👋
      </h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-gray-100 bg-white p-4"
          >
            <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-400">
              {m.label}
            </p>
            <p
              className={`mb-1 text-[22px] font-medium ${
                m.up === false
                  ? 'text-red-600'
                  : m.up
                    ? 'text-gray-900'
                    : 'text-blue-600'
              }`}
            >
              {m.value}
            </p>
            <p
              className={`text-[11px] ${
                m.up
                  ? 'text-green-600'
                  : m.up === false
                    ? 'text-red-500'
                    : 'text-gray-400'
              }`}
            >
              {m.change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-medium text-gray-900">Bills to pay</h2>
              <p className="text-[11px] text-gray-400">
                Total outstanding ({billsSummary.awaitingCount} awaiting,{' '}
                {billsSummary.overdueCount} overdue)
              </p>
            </div>
            <button
              type="button"
              className="text-[11px] text-blue-600 hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="mb-4 flex justify-between">
            <div>
              <p className="mb-1 text-[11px] text-gray-400">
                Awaiting payment ({billsSummary.awaitingCount})
              </p>
              <p className="text-[20px] font-medium text-blue-600">
                {formatMoney(billsSummary.awaiting)}
              </p>
            </div>
            <div className="text-right">
              <p className="mb-1 text-[11px] text-gray-400">
                Overdue ({billsSummary.overdueCount} bills)
              </p>
              <p className="text-[20px] font-medium text-red-600">
                {formatMoney(billsSummary.overdue)}
              </p>
            </div>
          </div>
          <BillsChart billsData={billsChart} />
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <h2 className="mb-4 text-[14px] font-medium text-gray-900">
            Upcoming deadlines
          </h2>
          {deadlines.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming deadlines.</p>
          ) : (
            <div className="space-y-0">
              {deadlines.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 border-b border-gray-50 py-3 last:border-0"
                >
                  <div className="min-w-[40px] text-center">
                    <div
                      className="mb-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase text-white"
                      style={{
                        background: monthColors[d.month] || '#9ca3af',
                      }}
                    >
                      {d.month}
                    </div>
                    <div className="text-[18px] font-medium leading-none text-gray-800">
                      {d.day}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-gray-900">{d.name}</p>
                    <p className="text-[11px] text-gray-400">{d.desc}</p>
                  </div>
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      d.urgent ? 'bg-orange-400' : 'bg-gray-300'
                    }`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[14px] font-medium text-gray-900">
          Quick Actions{' '}
          <span className="ml-1 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] text-white">
            6
          </span>
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map((q) => {
            const Icon = q.icon
            return (
              <div
                key={q.name}
                className="rounded-xl border border-gray-100 bg-white p-4"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <Icon size={16} className="text-blue-600" aria-hidden />
                </div>
                <p className="mb-1 text-[13px] font-medium text-gray-900">{q.name}</p>
                <p className="mb-3 text-[11px] leading-relaxed text-gray-400">
                  {q.desc}
                </p>
                <button
                  type="button"
                  className="w-full rounded-lg bg-blue-800 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-blue-900"
                >
                  {q.btn}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <InvoicesTable />
    </div>
  )
}
