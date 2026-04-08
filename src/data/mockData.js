export const metrics = [
  { label: 'Total Revenue', value: '$84,320', change: '↑ 12.4% vs last month', up: true },
  { label: 'Outstanding', value: '$7,429', change: '12 bills awaiting', up: null },
  { label: 'Overdue', value: '$3,187', change: '11 overdue bills', up: false },
  { label: 'Net Profit', value: '$31,540', change: '↑ 8.1% vs last month', up: true },
]

export const billsData = [
  { period: 'Older', awaiting: 7429, overdue: 0 },
  { period: 'This Week', awaiting: 1329, overdue: 0 },
  { period: 'Apr 5–11', awaiting: 387, overdue: 0 },
  { period: 'Apr 12–18', awaiting: 0, overdue: 1597 },
  { period: 'From Apr 19', awaiting: 0, overdue: 0 },
]

export const deadlines = [
  { month: 'JAN', day: 12, name: 'GST Return', desc: 'Oct 01 2025 – Due Jan 31', urgent: true },
  { month: 'MAY', day: 4, name: 'GST Return', desc: 'Due by May 4', urgent: true },
  { month: 'MAY', day: 5, name: 'GST Return', desc: 'Due by May 5', urgent: false },
  { month: 'OCT', day: 26, name: 'Provisional Tax', desc: 'Oct 26 2026 – Due Oct 26', urgent: false },
]

export const invoices = [
  { client: 'Acme Corp', id: 'INV-0042', date: 'Apr 1 2026', status: 'paid', amount: 3200 },
  { client: 'Blue Sky Media', id: 'INV-0041', date: 'Mar 28 2026', status: 'pending', amount: 1450 },
  { client: 'Horizon Group', id: 'INV-0040', date: 'Mar 20 2026', status: 'overdue', amount: 780 },
  { client: 'Starfield Solutions', id: 'INV-0039', date: 'Mar 15 2026', status: 'paid', amount: 5100 },
  { client: 'Nova Dynamics', id: 'INV-0038', date: 'Mar 10 2026', status: 'pending', amount: 2300 },
  { client: 'Peak Ventures', id: 'INV-0037', date: 'Mar 5 2026', status: 'paid', amount: 990 },
  { client: 'Clearpath Ltd', id: 'INV-0036', date: 'Feb 28 2026', status: 'overdue', amount: 4400 },
  { client: 'Summit Co', id: 'INV-0035', date: 'Feb 20 2026', status: 'paid', amount: 1750 },
]
