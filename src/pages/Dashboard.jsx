import { DollarSign, FileText, RefreshCw } from 'lucide-react'
import BillsChart from '../components/BillsChart'
import InvoicesTable from '../components/InvoicesTable'
import { deadlines, metrics } from '../data/mockData'

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

export default function Dashboard() {
  return (
    <div className="space-y-6 p-4 md:p-6">
        <h2 className="text-xl font-medium text-gray-900">
          Welcome back, Hollie! 👋
        </h2>

        {/* Metrics */}
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

        {/* Bills + Deadlines */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-white p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-medium text-gray-900">
                  Bills to pay
                </h2>
                <p className="text-[11px] text-gray-400">
                  Total outstanding (12 awaiting, 11 overdue)
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
                  Awaiting payment (12)
                </p>
                <p className="text-[20px] font-medium text-blue-600">
                  $7,429.21
                </p>
              </div>
              <div className="text-right">
                <p className="mb-1 text-[11px] text-gray-400">Overdue (11 bills)</p>
                <p className="text-[20px] font-medium text-red-600">$3,187.21</p>
              </div>
            </div>
            <BillsChart />
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 text-[14px] font-medium text-gray-900">
              Upcoming deadlines
            </h2>
            <div className="space-y-0">
              {deadlines.map((d) => (
                <div
                  key={`${d.month}-${d.day}-${d.name}`}
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
          </div>
        </div>

        {/* Quick Actions */}
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
