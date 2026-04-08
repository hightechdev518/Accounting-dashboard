import { deadlines } from '../data/mockData'

export default function DeadlinesList() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md">
      <h2 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h2>
      <p className="mt-1 text-sm text-gray-500">Stay ahead of filings and payments</p>
      <ul className="mt-6 flex flex-1 flex-col gap-4">
        {deadlines.map((d) => (
          <li
            key={`${d.month}-${d.day}-${d.name}`}
            className="flex gap-3 rounded-lg border border-gray-50 bg-gray-50/80 p-3 transition hover:border-gray-200 hover:bg-white"
          >
            <div
              className={[
                'flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg text-center shadow-sm',
                d.urgent
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-slate-200 text-slate-700',
              ].join(' ')}
            >
              <span className="text-[10px] font-bold leading-none">{d.month}</span>
              <span className="text-lg font-bold leading-tight">{d.day}</span>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-gray-900">{d.name}</p>
                <span
                  className={[
                    'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                    d.urgent ? 'bg-orange-500' : 'bg-gray-400',
                  ].join(' ')}
                  title={d.urgent ? 'Urgent' : 'Upcoming'}
                />
              </div>
              <p className="mt-0.5 text-sm text-gray-500">{d.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
