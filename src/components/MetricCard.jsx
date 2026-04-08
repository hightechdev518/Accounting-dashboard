export default function MetricCard({ label, value, change, up }) {
  const changeClass =
    up === true ? 'text-emerald-600' : up === false ? 'text-red-600' : 'text-gray-500'

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{value}</p>
      <p className={`mt-1 text-sm font-medium ${changeClass}`}>{change}</p>
    </div>
  )
}
