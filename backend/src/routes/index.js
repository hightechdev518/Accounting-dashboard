/**
 * Numeris API — routes grouped by feature.
 * Each module under ./<feature>.routes.js handles one domain.
 *
 * | Mount path        | Module              | Feature                          |
 * |------------------|---------------------|----------------------------------|
 * | /api/auth        | auth.routes         | Register, login, JWT, refresh    |
 * | /api/dashboard   | dashboard.routes    | Stats, charts, tax deadlines     |
 * | /api/clients     | clients.routes      | Clients + nested invoices list   |
 * | /api/invoices    | invoices.routes     | Invoice CRUD, send, pay          |
 * | /api/bills       | bills.routes        | Bills CRUD, overdue refresh      |
 * | /api/payments    | payments.routes     | Payment records                  |
 * | /api/projects    | projects.routes     | Projects + hours / budget %      |
 * | /api/time-entries| timeEntries.routes  | Time tracking + weekly summary   |
 * | /api/deadlines   | deadlines.routes    | Tax deadlines                    |
 * | /api/exports     | exports.routes      | CSV/PDF exports, P&L             |
 * | /api/accounting  | accounting.routes   | Invoice totals by status         |
 * | /api/reports     | reports.routes      | Overview counts                  |
 */
import authRoutes from './auth.routes.js'
import dashboardRoutes from './dashboard.routes.js'
import clientsRoutes from './clients.routes.js'
import invoicesRoutes from './invoices.routes.js'
import billsRoutes from './bills.routes.js'
import paymentsRoutes from './payments.routes.js'
import projectsRoutes from './projects.routes.js'
import timeEntriesRoutes from './timeEntries.routes.js'
import deadlinesRoutes from './deadlines.routes.js'
import exportsRoutes from './exports.routes.js'
import accountingRoutes from './accounting.routes.js'
import reportsRoutes from './reports.routes.js'

/**
 * @param {import('express').Express} app
 */
export function registerApiRoutes(app) {
  app.use('/api/auth', authRoutes)
  app.use('/api/dashboard', dashboardRoutes)
  app.use('/api/clients', clientsRoutes)
  app.use('/api/invoices', invoicesRoutes)
  app.use('/api/bills', billsRoutes)
  app.use('/api/payments', paymentsRoutes)
  app.use('/api/projects', projectsRoutes)
  app.use('/api/time-entries', timeEntriesRoutes)
  app.use('/api/deadlines', deadlinesRoutes)
  app.use('/api/exports', exportsRoutes)
  app.use('/api/accounting', accountingRoutes)
  app.use('/api/reports', reportsRoutes)
}
