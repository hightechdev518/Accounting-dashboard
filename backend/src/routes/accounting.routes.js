import { Router } from 'express'
import { InvoiceStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/summary', async (req, res) => {
  const userId = req.userId
  const [paid, pending, overdue] = await Promise.all([
    prisma.invoice.aggregate({
      where: { userId, status: InvoiceStatus.PAID },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { userId, status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.SENT] } },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { userId, status: InvoiceStatus.OVERDUE },
      _sum: { amount: true },
    }),
  ])
  res.json({
    paidTotal: Number(paid._sum.amount || 0),
    pendingTotal: Number(pending._sum.amount || 0),
    overdueTotal: Number(overdue._sum.amount || 0),
  })
})

export default router
