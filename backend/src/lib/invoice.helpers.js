import { Prisma } from '@prisma/client'
import { InvoiceStatus } from '@prisma/client'

/** @param {Date | null | undefined} dueDate */
export function isDueDatePassed(dueDate) {
  if (!dueDate) return false
  const due = new Date(dueDate)
  const now = new Date()
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate())
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return today > dueDay
}

/**
 * @param {{ quantity: unknown, rate: unknown }} line
 * @returns {Prisma.Decimal}
 */
export function lineItemAmount(line) {
  const q = new Prisma.Decimal(String(line.quantity ?? 0))
  const r = new Prisma.Decimal(String(line.rate ?? 0))
  return q.mul(r).toDecimalPlaces(2)
}

/**
 * @param {Array<{ quantity: unknown, rate: unknown }>} lines
 * @returns {Prisma.Decimal}
 */
export function sumLineItems(lines) {
  return lines.reduce(
    (sum, line) => sum.add(lineItemAmount(line)),
    new Prisma.Decimal(0),
  )
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient | import('@prisma/client').PrismaClient} db
 * @param {string} userId
 */
export async function getNextInvoiceNumber(db, userId) {
  const year = new Date().getUTCFullYear()
  const prefix = `INV-${year}-`
  const rows = await db.invoice.findMany({
    where: { userId, number: { startsWith: prefix } },
    select: { number: true },
  })
  let max = 0
  for (const row of rows) {
    const m = row.number.match(new RegExp(`^${prefix}(\\d+)$`))
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

/**
 * Marks SENT invoices whose due date has passed as OVERDUE (scoped to user).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} userId
 */
export async function refreshOverdueInvoices(prisma, userId) {
  const sent = await prisma.invoice.findMany({
    where: { userId, status: InvoiceStatus.SENT, dueDate: { not: null } },
    select: { id: true, dueDate: true },
  })
  const ids = sent.filter((inv) => isDueDatePassed(inv.dueDate)).map((i) => i.id)
  if (ids.length === 0) return
  await prisma.invoice.updateMany({
    where: { id: { in: ids }, userId },
    data: { status: InvoiceStatus.OVERDUE },
  })
}

/**
 * @param {unknown} raw
 * @param {{ defaultDraft?: boolean }} [opts]
 */
export function parseInvoiceStatus(raw, opts = {}) {
  const { defaultDraft = true } = opts
  const s = (raw ?? 'DRAFT').toString().toUpperCase()
  if (s === 'PENDING') return InvoiceStatus.SENT
  if (s === 'DRAFT' || s === 'SENT' || s === 'PAID' || s === 'OVERDUE') return s
  if (defaultDraft) return InvoiceStatus.DRAFT
  return null
}
