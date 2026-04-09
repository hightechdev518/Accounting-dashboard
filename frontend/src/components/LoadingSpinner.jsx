export default function LoadingSpinner({
  className = '',
  label = 'Loading…',
  size = 'md',
}) {
  const sizeCls = size === 'sm' ? 'h-5 w-5 border-2' : 'h-8 w-8 border-2'
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 text-gray-500 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className={`inline-block animate-spin rounded-full border-gray-200 border-t-blue-600 ${sizeCls}`}
        aria-hidden
      />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  )
}

export function QueryError({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1 text-red-600">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-200"
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}
