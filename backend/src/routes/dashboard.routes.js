import { Router } from 'express'
import { BillStatus, InvoiceStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

function utcMonthRange(year, monthIndex0) {
  const start = new Date(Date.UTC(year, monthIndex0, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, monthIndex0 + 1, 0, 23, 59, 59, 999))
  return { start, end }
}

function pctChange(current, previous) {
  const c = Number(current)
  const p = Number(previous)
  if (Number.isNaN(c) || Number.isNaN(p)) return 0
  if (p === 0) return c === 0 ? 0 : 100
  return ((c - p) / p) * 100
}

function startOfDayUTC(d) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function startOfIsoWeekUTC(d) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = x.getUTCDay()
  const offset = dow === 0 ? -6 : 1 - dow
  x.setUTCDate(x.getUTCDate() + offset)
  return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate())
}

/** @param {Date} refDate @param {Date} now */
function billDueBucket(refDate, now) {
  const u = startOfDayUTC(refDate)
  const y = refDate.getUTCFullYear()

  const fromApr19 = Date.UTC(y, 3, 19)
  if (u >= fromApr19) return 'fromApr19'

  if (u >= Date.UTC(y, 3, 12) && u <= Date.UTC(y, 3, 18)) return 'apr12_18'
  if (u >= Date.UTC(y, 3, 5) && u <= Date.UTC(y, 3, 11)) return 'apr5_11'

  const w0 = startOfIsoWeekUTC(now)
  const w1 = w0 + 7 * 86400000 - 1
  if (u >= w0 && u <= w1) return 'thisWeek'

  return 'older'
}

const BILLS_CHART_ORDER = [
  { key: 'older', label: 'Older' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'apr5_11', label: 'Apr 5-11' },
  { key: 'apr12_18', label: 'Apr 12-18' },
  { key: 'fromApr19', label: 'From Apr 19' },
]

router.get('/stats', async (req, res) => {
  try {
    const userId = req.userId
    const now = new Date()
    const y = now.getUTCFullYear()
    const m = now.getUTCMonth()
    const thisMonth = utcMonthRange(y, m)
    const lastMonth = utcMonthRange(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1)

    const [revThis, revLast, expThis, expLast, outAgg, odAgg] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          userId,
          status: InvoiceStatus.PAID,
          issuedAt: { gte: thisMonth.start, lte: thisMonth.end },
        },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          userId,
          status: InvoiceStatus.PAID,
          issuedAt: { gte: lastMonth.start, lte: lastMonth.end },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId,
          date: { gte: thisMonth.start, lte: thisMonth.end },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId,
          date: { gte: lastMonth.start, lte: lastMonth.end },
        },
        _sum: { amount: true },
      }),
      prisma.bill.aggregate({
        where: { userId, status: BillStatus.AWAITING },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.bill.aggregate({
        where: { userId, status: BillStatus.OVERDUE },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ])

    const totalRevenue = Number(revThis._sum.amount || 0)
    const lastRev = Number(revLast._sum.amount || 0)
    const revenueChangePercent = pctChange(totalRevenue, lastRev)

    const expThisN = Number(expThis._sum.amount || 0)
    const expLastN = Number(expLast._sum.amount || 0)
    const netProfit = totalRevenue - expThisN
    const lastNet = lastRev - expLastN
    const netProfitChangePercent = pctChange(netProfit, lastNet)

    res.json({
      totalRevenue,
      revenueChangePercent,
      outstanding: {
        sum: Number(outAgg._sum.amount || 0),
        count: outAgg._count._all,
      },
      overdue: {
        sum: Number(odAgg._sum.amount || 0),
        count: odAgg._count._all,
      },
      netProfit,
      netProfitChangePercent,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to load dashboard stats' })
  }
})

router.get('/bills-chart', async (req, res) => {
  try {
    const userId = req.userId
    const now = new Date()
    const bills = await prisma.bill.findMany({
      where: {
        userId,
        status: { in: [BillStatus.AWAITING, BillStatus.OVERDUE] },
      },
    })

    const sums = {
      older: 0,
      thisWeek: 0,
      apr5_11: 0,
      apr12_18: 0,
      fromApr19: 0,
    }

    for (const b of bills) {
      const ref = b.dueDate ?? b.createdAt
      const amt = Number(b.amount)
      const key = billDueBucket(ref, now)
      sums[key] += amt
    }

    const chart = BILLS_CHART_ORDER.map(({ key, label }) => ({
      period: label,
      total: sums[key],
    }))

    res.json(chart)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to load bills chart' })
  }
})

router.get('/upcoming-deadlines', async (req, res) => {
  try {
    const userId = req.userId
    const startToday = new Date()
    startToday.setUTCHours(0, 0, 0, 0)

    const rows = await prisma.taxDeadline.findMany({
      where: {
        userId,
        dueDate: { gte: startToday },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    })

    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    const msPerDay = 86400000
    const urgentWithin = 14 * msPerDay

    const deadlines = rows.map((d) => {
      const dt = new Date(d.dueDate)
      const urgent = dt.getTime() - Date.now() <= urgentWithin
      return {
        id: d.id,
        title: d.title,
        dueDate: d.dueDate.toISOString(),
        period: d.period,
        status: d.status,
        month: monthNames[dt.getUTCMonth()],
        day: dt.getUTCDate(),
        name: d.title,
        desc: d.period,
        urgent,
      }
    })

    res.json(deadlines)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to load tax deadlines' })
  }
})

export default router
