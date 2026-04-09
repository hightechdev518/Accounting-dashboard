import LoadingSpinner, { QueryError } from '../components/LoadingSpinner'
import {
  useAccountingSummary,
  useBills,
  useClients,
  useExports,
  useInvoices,
  usePayments,
  useProjects,
  useReportsOverview,
  useTimeEntries,
} from '../hooks/queries'

function Panel({ title, children }) {
  return (
    <div className="p-4 md:p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  )
}

function TableShell({ headers, children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-gray-600">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function DataPanel({ title, query, children, emptyMessage = 'No data.' }) {
  const { isPending, error, refetch, data } = query
  if (isPending) {
    return (
      <Panel title={title}>
        <div className="flex min-h-[120px] items-center justify-center py-8">
          <LoadingSpinner size="sm" label="Loading…" />
        </div>
      </Panel>
    )
  }
  if (error) {
    return (
      <Panel title={title}>
        <QueryError message={error.message} onRetry={() => refetch()} />
      </Panel>
    )
  }
  if (Array.isArray(data) && data.length === 0) {
    return (
      <Panel title={title}>
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </Panel>
    )
  }
  return <Panel title={title}>{children}</Panel>
}

export function ClientsView() {
  const query = useClients()
  return (
    <DataPanel title="Clients" query={query} emptyMessage="No clients yet.">
      <TableShell headers={['Name', 'Company', 'Email', 'Phone', 'Outstanding']}>
        {query.data?.map((c) => (
          <tr key={c.id} className="border-t border-gray-50">
            <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
            <td className="px-4 py-3 text-gray-600">{c.company || '—'}</td>
            <td className="px-4 py-3 text-gray-600">{c.email || '—'}</td>
            <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
            <td className="px-4 py-3 text-gray-900">
              $
              {Number(c.outstandingBalance ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
          </tr>
        ))}
      </TableShell>
    </DataPanel>
  )
}

export function FinanceInvoicesView() {
  const query = useInvoices({})
  return (
    <DataPanel title="Invoices" query={query} emptyMessage="No invoices.">
      <TableShell headers={['Invoice', 'Client', 'Status', 'Amount', 'Issued']}>
        {query.data?.map((inv) => (
          <tr key={inv.id} className="border-t border-gray-50">
            <td className="px-4 py-3 font-mono text-xs text-gray-900">{inv.number}</td>
            <td className="px-4 py-3">{inv.clientName}</td>
            <td className="px-4 py-3 capitalize">{inv.status}</td>
            <td className="px-4 py-3">${Number(inv.amount).toLocaleString()}</td>
            <td className="px-4 py-3 text-gray-500">
              {new Date(inv.issuedAt).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </TableShell>
    </DataPanel>
  )
}

export function BillsView() {
  const query = useBills({})
  return (
    <DataPanel title="Bills" query={query} emptyMessage="No bills.">
      <TableShell headers={['Vendor', 'Description', 'Amount', 'Status', 'Due']}>
        {query.data?.map((b) => (
          <tr key={b.id} className="border-t border-gray-50">
            <td className="px-4 py-3">{b.vendor || '—'}</td>
            <td className="px-4 py-3 text-gray-600">{b.description || '—'}</td>
            <td className="px-4 py-3">${Number(b.amount).toLocaleString()}</td>
            <td className="px-4 py-3 capitalize">{b.status}</td>
            <td className="px-4 py-3 text-gray-500">
              {b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '—'}
            </td>
          </tr>
        ))}
      </TableShell>
    </DataPanel>
  )
}

export function PaymentsView() {
  const query = usePayments()
  return (
    <DataPanel title="Payments" query={query} emptyMessage="No payments recorded.">
      <TableShell headers={['Date', 'Amount', 'Method', 'Invoice', 'Client']}>
        {query.data?.map((p) => (
          <tr key={p.id} className="border-t border-gray-50">
            <td className="px-4 py-3 text-gray-600">
              {new Date(p.paidAt).toLocaleString()}
            </td>
            <td className="px-4 py-3 font-medium">${Number(p.amount).toLocaleString()}</td>
            <td className="px-4 py-3">{p.method || '—'}</td>
            <td className="px-4 py-3 font-mono text-xs">
              {p.invoice?.number ?? p.invoiceNumber ?? '—'}
            </td>
            <td className="px-4 py-3">
              {p.invoice?.clientName ?? p.clientName ?? '—'}
            </td>
          </tr>
        ))}
      </TableShell>
    </DataPanel>
  )
}

export function ExportsView() {
  const query = useExports()
  return (
    <DataPanel title="Exports" query={query} emptyMessage="No exports yet.">
      <TableShell headers={['Created', 'Type', 'Entity', 'Status', 'File']}>
        {query.data?.map((e) => (
          <tr key={e.id} className="border-t border-gray-50">
            <td className="px-4 py-3 text-gray-600">
              {new Date(e.createdAt).toLocaleString()}
            </td>
            <td className="px-4 py-3">{e.type}</td>
            <td className="px-4 py-3">{e.entity}</td>
            <td className="px-4 py-3">{e.status}</td>
            <td className="px-4 py-3 text-blue-600">{e.fileUrl || '—'}</td>
          </tr>
        ))}
      </TableShell>
    </DataPanel>
  )
}

export function ProjectsView() {
  const query = useProjects({})
  return (
    <DataPanel title="Projects" query={query} emptyMessage="No projects.">
      <TableShell
        headers={['Name', 'Client', 'Status', 'Hours', 'Budget %']}
      >
        {query.data?.map((p) => (
          <tr key={p.id} className="border-t border-gray-50">
            <td className="px-4 py-3 font-medium">{p.name}</td>
            <td className="px-4 py-3">{p.clientName || '—'}</td>
            <td className="px-4 py-3 capitalize">{p.status}</td>
            <td className="px-4 py-3">{Number(p.totalHoursLogged ?? 0).toFixed(2)}</td>
            <td className="px-4 py-3">
              {p.budgetUsedPercent != null
                ? `${Number(p.budgetUsedPercent).toFixed(1)}%`
                : '—'}
            </td>
          </tr>
        ))}
      </TableShell>
    </DataPanel>
  )
}

export function TimeTrackingView() {
  const query = useTimeEntries(null)
  return (
    <DataPanel title="Time tracking" query={query} emptyMessage="No time entries.">
      <TableShell headers={['Date', 'Project', 'Minutes', 'Notes']}>
        {query.data?.map((t) => (
          <tr key={t.id} className="border-t border-gray-50">
            <td className="px-4 py-3">{t.date}</td>
            <td className="px-4 py-3">{t.projectName}</td>
            <td className="px-4 py-3">{t.minutes}</td>
            <td className="px-4 py-3 text-gray-600">{t.description || '—'}</td>
          </tr>
        ))}
      </TableShell>
    </DataPanel>
  )
}

export function AccountingView() {
  const query = useAccountingSummary()
  const { isPending, error, refetch, data } = query
  if (isPending) {
    return (
      <Panel title="Accounting">
        <div className="flex min-h-[120px] items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      </Panel>
    )
  }
  if (error) {
    return (
      <Panel title="Accounting">
        <QueryError message={error.message} onRetry={() => refetch()} />
      </Panel>
    )
  }
  return (
    <Panel title="Accounting">
      <div className="grid max-w-lg gap-3 rounded-xl border border-gray-100 bg-white p-6 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Paid total</span>
          <span className="font-semibold">${data.paidTotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Pending total</span>
          <span className="font-semibold">${data.pendingTotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Overdue total</span>
          <span className="font-semibold text-red-600">
            ${data.overdueTotal.toLocaleString()}
          </span>
        </div>
      </div>
    </Panel>
  )
}

export function ReportsView() {
  const query = useReportsOverview()
  const { isPending, error, refetch, data } = query
  if (isPending) {
    return (
      <Panel title="Reports">
        <div className="flex min-h-[120px] items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      </Panel>
    )
  }
  if (error) {
    return (
      <Panel title="Reports">
        <QueryError message={error.message} onRetry={() => refetch()} />
      </Panel>
    )
  }
  return (
    <Panel title="Reports">
      <div className="max-w-lg space-y-2 rounded-xl border border-gray-100 bg-white p-6 text-sm">
        <p>
          <span className="text-gray-500">Invoices: </span>
          <strong>{data.invoiceCount}</strong>
        </p>
        <p>
          <span className="text-gray-500">Clients: </span>
          <strong>{data.clientCount}</strong>
        </p>
        <p>
          <span className="text-gray-500">Paid revenue: </span>
          <strong>${data.paidRevenue.toLocaleString()}</strong>
        </p>
      </div>
    </Panel>
  )
}
