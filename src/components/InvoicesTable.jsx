import { useState } from 'react'
import { invoices } from '../data/mockData'

const tabs = ['All', 'Paid', 'Pending', 'Overdue']

const badge = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
}

export default function InvoicesTable() {
  const [tab, setTab] = useState('All')
  const rows =
    tab === 'All'
      ? invoices
      : invoices.filter((r) => r.status === tab.toLowerCase())

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[14px] font-medium text-gray-900">Recent Invoices</h2>
        <button
          type="button"
          className="text-[11px] text-blue-600 hover:underline"
        >
          View all →
        </button>
      </div>

      <div className="-mb-px mb-4 flex gap-0 border-b border-gray-100">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              '-mb-px border-b-2 px-4 py-2 text-xs transition-colors',
              tab === t
                ? 'border-blue-500 font-medium text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[12px]">
          <thead>
            <tr className="text-left text-gray-400">
              <th className="pb-2 font-medium">Client</th>
              <th className="pb-2 font-medium">Invoice</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-gray-50 hover:bg-gray-50/50"
              >
                <td className="py-2.5 font-medium text-gray-900">{r.client}</td>
                <td className="py-2.5 text-gray-500">
                  {r.id} · {r.date}
                </td>
                <td className="py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${badge[r.status]}`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="py-2.5 text-right font-medium text-gray-900">
                  ${r.amount.toLocaleString()}.00
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
