import { FileText, Receipt, RefreshCw } from 'lucide-react'

const actions = [
  {
    title: 'Create Invoice',
    description: 'Bill clients and track payments in one place.',
    buttonLabel: 'New Invoice',
    icon: FileText,
  },
  {
    title: 'Log Expense',
    description: 'Capture receipts and categorize spend instantly.',
    buttonLabel: 'Log Expense',
    icon: Receipt,
  },
  {
    title: 'Sync Bank Feed',
    description: 'Connect your bank for automatic transaction import.',
    buttonLabel: 'Connect Now',
    icon: RefreshCw,
  },
]

export default function QuickActions() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
      <p className="mt-1 text-sm text-gray-500">Shortcuts to keep your books current</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((a) => {
          const Icon = a.icon
          return (
            <div
              key={a.title}
              className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#1e40af]">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-900">{a.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">{a.description}</p>
              <button
                type="button"
                className="mt-6 w-full rounded-lg bg-[#1e40af] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:ring-offset-2"
              >
                {a.buttonLabel}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
