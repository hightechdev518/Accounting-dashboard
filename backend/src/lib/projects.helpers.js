import { Prisma } from '@prisma/client'

/**
 * Sum hours per project for the given project ids (scoped to user).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} userId
 * @param {string[]} projectIds
 */
export async function sumHoursByProject(prisma, userId, projectIds) {
  if (projectIds.length === 0) return new Map()
  const rows = await prisma.timeEntry.groupBy({
    by: ['projectId'],
    where: { userId, projectId: { in: projectIds } },
    _sum: { hours: true },
  })
  const m = new Map()
  for (const r of rows) {
    m.set(r.projectId, Number(r._sum.hours || 0))
  }
  return m
}

/**
 * Budget used %: treats `budget` as a numeric cap (e.g. hours or monetary unit consistent with your app).
 * Returns null if budget is null/0.
 * @param {number} totalHours
 * @param {import('@prisma/client').Prisma.Decimal | null | undefined} budget
 */
export function budgetUsedPercent(totalHours, budget) {
  if (budget == null) return null
  const b = new Prisma.Decimal(budget.toString())
  if (b.lte(0)) return null
  const h = new Prisma.Decimal(totalHours)
  return Number(h.div(b).mul(100).toDecimalPlaces(2))
}
