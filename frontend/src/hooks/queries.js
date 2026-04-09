import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => apiClient.get('/api/dashboard/stats').then((r) => r.data),
  })
}

export function useDashboardBillsChart() {
  return useQuery({
    queryKey: ['dashboard', 'bills-chart'],
    queryFn: () => apiClient.get('/api/dashboard/bills-chart').then((r) => r.data),
  })
}

export function useDashboardDeadlines() {
  return useQuery({
    queryKey: ['dashboard', 'deadlines'],
    queryFn: () => apiClient.get('/api/dashboard/upcoming-deadlines').then((r) => r.data),
  })
}

/**
 * @param {Record<string, string | undefined>} [filters] - status, clientId, from, to
 */
export function useInvoices(filters = {}) {
  const { status, clientId, from, to } = filters
  return useQuery({
    queryKey: ['invoices', status ?? '', clientId ?? '', from ?? '', to ?? ''],
    queryFn: () =>
      apiClient.get('/api/invoices', { params: filters }).then((r) => r.data),
  })
}

/**
 * @param {Record<string, string | undefined>} [filters] - status (AWAITING|OVERDUE|PAID)
 */
export function useBills(filters = {}) {
  const { status } = filters
  return useQuery({
    queryKey: ['bills', status ?? ''],
    queryFn: () =>
      apiClient.get('/api/bills', { params: filters }).then((r) => r.data),
  })
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.get('/api/clients').then((r) => r.data),
  })
}

/**
 * @param {Record<string, string | undefined>} [filters] - status, clientId
 */
export function useProjects(filters = {}) {
  const { status, clientId } = filters
  return useQuery({
    queryKey: ['projects', status ?? '', clientId ?? ''],
    queryFn: () =>
      apiClient.get('/api/projects', { params: filters }).then((r) => r.data),
  })
}

/**
 * @param {string | undefined | null} projectId - omit for all entries
 */
export function useTimeEntries(projectId) {
  return useQuery({
    queryKey: ['time-entries', projectId ?? 'all'],
    queryFn: () =>
      apiClient
        .get('/api/time-entries', {
          params: projectId ? { projectId } : {},
        })
        .then((r) => r.data),
  })
}

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: () => apiClient.get('/api/payments').then((r) => r.data),
  })
}

export function useExports() {
  return useQuery({
    queryKey: ['exports'],
    queryFn: () => apiClient.get('/api/exports').then((r) => r.data),
  })
}

export function useAccountingSummary() {
  return useQuery({
    queryKey: ['accounting', 'summary'],
    queryFn: () => apiClient.get('/api/accounting/summary').then((r) => r.data),
  })
}

export function useReportsOverview() {
  return useQuery({
    queryKey: ['reports', 'overview'],
    queryFn: () => apiClient.get('/api/reports/overview').then((r) => r.data),
  })
}
