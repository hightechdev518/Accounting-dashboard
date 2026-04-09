import { Router } from 'express'
import { InvoiceStatus, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { refreshOverdueInvoices } from '../lib/invoice.helpers.js'

const router = Router()
router.use(requireAuth)

function serializePayment(p) {
  const inv = p.invoice
  return {
    id: p.id,
    amount: Number(p.amount),
    method: p.method,
    paidAt: p.paidAt.toISOString(),
    note: p.note ?? null,
    invoiceId: p.invoiceId,
    invoice: inv
      ? {
          id: inv.id,
          number: inv.number,
          status: inv.status,
          amount: Number(inv.amount),
          issuedAt: inv.issuedAt.toISOString(),
          dueDate: inv.dueDate?.toISOString() ?? null,
          clientId: inv.clientId,
          clientName: inv.client?.name ?? '',
          client: inv.client
            ? {
                id: inv.client.id,
                name: inv.client.name,
                email: inv.client.email ?? null,
              }
            : null,
        }
      : null,
    invoiceNumber: inv?.number,
    clientName: inv?.client?.name,
  }
}

router.get('/', async (req, res) => {
  try {
    await refreshOverdueInvoices(prisma, req.userId)

    const list = await prisma.payment.findMany({
      where: { invoice: { userId: req.userId } },
      include: { invoice: { include: { client: true } } },
      orderBy: { paidAt: 'desc' },
    })
    res.json(list.map(serializePayment))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to list payments' })
  }
})

router.post('/', async (req, res) => {
  const { invoiceId, amount, method, note, paidAt } = req.body
  if (amount == null) return res.status(400).json({ error: 'amount required' })
  if (!invoiceId) return res.status(400).json({ error: 'invoiceId required' })

  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId: req.userId },
  })
  if (!inv) return res.status(400).json({ error: 'Invalid invoice' })
  if (inv.status === InvoiceStatus.DRAFT) {
    return res.status(400).json({ error: 'Send the invoice before recording a payment' })
  }
  if (inv.status === InvoiceStatus.PAID) {
    return res.status(400).json({ error: 'Invoice is already fully paid' })
  }

  try {
    const paymentId = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          invoiceId,
          amount,
          method: method ? String(method) : 'other',
          note: note != null ? String(note) : null,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
        },
      })

      const sumRow = await tx.payment.aggregate({
        where: { invoiceId },
        _sum: { amount: true },
      })
      const totalPaid = new Prisma.Decimal(sumRow._sum.amount?.toString() ?? '0')
      const invoiceAmount = new Prisma.Decimal(inv.amount.toString())

      if (totalPaid.gte(invoiceAmount)) {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { status: InvoiceStatus.PAID },
        })
      }

      return created.id
    })

    const createdRow = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: { include: { client: true } } },
    })

    res.status(201).json(serializePayment(createdRow))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to record payment' })
  }
})

export default router
