import { BillStatus } from '@prisma/client'
import { isDueDatePassed } from './invoice.helpers.js'

/**
 * AWAITING bills whose due date has passed → OVERDUE (PAID unchanged).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} userId
 */
export async function refreshOverdueBills(prisma, userId) {
  const awaiting = await prisma.bill.findMany({
    where: { userId, status: BillStatus.AWAITING, dueDate: { not: null } },
    select: { id: true, dueDate: true },
  })
  const ids = awaiting.filter((b) => isDueDatePassed(b.dueDate)).map((b) => b.id)
  if (ids.length === 0) return
  await prisma.bill.updateMany({
    where: { id: { in: ids }, userId },
    data: { status: BillStatus.OVERDUE },
  })
}
