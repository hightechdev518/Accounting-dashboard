import { Router } from 'express'
import { InvoiceStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/overview', async (req, res) => {
  const userId = req.userId
  const [invoiceCount, clientCount, paidSum] = await Promise.all([
    prisma.invoice.count({ where: { userId } }),
    prisma.client.count({ where: { userId } }),
    prisma.invoice.aggregate({
      where: { userId, status: InvoiceStatus.PAID },
      _sum: { amount: true },
    }),
  ])
  res.json({
    invoiceCount,
    clientCount,
    paidRevenue: Number(paidSum._sum.amount || 0),
  })
})

export default router
