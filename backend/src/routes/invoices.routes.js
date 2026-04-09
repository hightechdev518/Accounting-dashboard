import { Router } from 'express'
import { InvoiceStatus, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import {
  getNextInvoiceNumber,
  lineItemAmount,
  refreshOverdueInvoices,
  parseInvoiceStatus,
  sumLineItems,
} from '../lib/invoice.helpers.js'

const router = Router()
router.use(requireAuth)

const VALID_STATUSES = new Set(Object.values(InvoiceStatus))

function assertValidQueryStatus(status) {
  if (status == null || status === '') return null
  const s = String(status).toUpperCase()
  if (!VALID_STATUSES.has(s)) throw new Error('Invalid status')
  return s
}

function serializeClient(c) {
  if (!c) return null
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? null,
    phone: c.phone ?? null,
    address: c.address ?? null,
  }
}

function serializeItem(it) {
  return {
    id: it.id,
    description: it.description,
    quantity: Number(it.quantity),
    rate: Number(it.rate),
    amount: Number(it.amount),
  }
}

function serializePayment(p) {
  return {
    id: p.id,
    amount: Number(p.amount),
    method: p.method,
    paidAt: p.paidAt.toISOString(),
    note: p.note ?? null,
  }
}

/** List row (no items) */
function toInvoiceListRow(inv) {
  return {
    id: inv.id,
    number: inv.number,
    status: inv.status,
    amount: Number(inv.amount),
    issuedAt: inv.issuedAt.toISOString(),
    dueDate: inv.dueDate?.toISOString() ?? null,
    client: inv.client ? { id: inv.client.id, name: inv.client.name } : null,
    clientName: inv.client?.name ?? '',
  }
}

/** Detail with items + payments */
function toInvoiceDetail(inv) {
  return {
    id: inv.id,
    number: inv.number,
    status: inv.status,
    amount: Number(inv.amount),
    issuedAt: inv.issuedAt.toISOString(),
    dueDate: inv.dueDate?.toISOString() ?? null,
    createdAt: inv.createdAt.toISOString(),
    client: serializeClient(inv.client),
    clientName: inv.client?.name ?? '',
    items: (inv.items ?? []).map(serializeItem),
    payments: (inv.payments ?? []).map(serializePayment),
  }
}

function validateLineItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'items must be a non-empty array of { description, quantity, rate }'
  }
  for (const line of items) {
    if (!line || typeof line.description !== 'string' || !line.description.trim()) {
      return 'each line item needs a non-empty description'
    }
    const q = Number(line.quantity)
    const r = Number(line.rate)
    if (!Number.isFinite(q) || q <= 0) return 'each line item needs quantity > 0'
    if (!Number.isFinite(r) || r < 0) return 'each line item needs rate >= 0'
  }
  return null
}

router.get('/', async (req, res) => {
  try {
    await refreshOverdueInvoices(prisma, req.userId)

    const { status, clientId, from, to } = req.query
    const where = { userId: req.userId }

    if (status != null && status !== '') {
      try {
        where.status = assertValidQueryStatus(status)
      } catch {
        return res.status(400).json({ error: 'Invalid status filter' })
      }
    }

    if (clientId != null && clientId !== '') {
      const ok = await prisma.client.findFirst({
        where: { id: String(clientId), userId: req.userId },
        select: { id: true },
      })
      if (!ok) return res.status(400).json({ error: 'Invalid clientId' })
      where.clientId = String(clientId)
    }

    if ((from && from !== '') || (to && to !== '')) {
      where.issuedAt = {}
      if (from) where.issuedAt.gte = new Date(String(from))
      if (to) {
        const end = new Date(String(to))
        end.setUTCHours(23, 59, 59, 999)
        where.issuedAt.lte = end
      }
    }

    const list = await prisma.invoice.findMany({
      where,
      include: { client: true },
      orderBy: { issuedAt: 'desc' },
    })
    res.json(list.map(toInvoiceListRow))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to list invoices' })
  }
})

router.post('/', async (req, res) => {
  const { clientId, dueDate, issuedAt, status, items } = req.body
  if (!clientId) return res.status(400).json({ error: 'clientId required' })

  const err = validateLineItems(items)
  if (err) return res.status(400).json({ error: err })

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: req.userId },
  })
  if (!client) return res.status(400).json({ error: 'Invalid client' })

  let st = InvoiceStatus.DRAFT
  if (status != null && status !== '') {
    const p = parseInvoiceStatus(status, { defaultDraft: false })
    if (!p) return res.status(400).json({ error: 'Invalid status' })
    if (p === InvoiceStatus.PAID) {
      return res.status(400).json({ error: 'Cannot create as PAID; create then POST /invoices/:id/pay' })
    }
    st = p
  }

  try {
    const total = sumLineItems(items)

    const created = await prisma.$transaction(async (tx) => {
      const number = await getNextInvoiceNumber(tx, req.userId)
      return tx.invoice.create({
        data: {
          userId: req.userId,
          clientId,
          number,
          status: st,
          amount: total,
          issuedAt: issuedAt ? new Date(issuedAt) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          items: {
            create: items.map((line) => ({
              description: line.description.trim(),
              quantity: new Prisma.Decimal(String(line.quantity)),
              rate: new Prisma.Decimal(String(line.rate)),
              amount: lineItemAmount(line),
            })),
          },
        },
        include: { client: true, items: true, payments: true },
      })
    })

    await refreshOverdueInvoices(prisma, req.userId)
    const row = await prisma.invoice.findFirst({
      where: { id: created.id },
      include: {
        client: true,
        items: { orderBy: { id: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    })

    res.status(201).json(toInvoiceDetail(row))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to create invoice' })
  }
})

router.post('/:id/send', async (req, res) => {
  try {
    await refreshOverdueInvoices(prisma, req.userId)

    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
    })
    if (!existing) return res.status(404).json({ error: 'Not found' })

    if (existing.status === InvoiceStatus.PAID) {
      return res.status(400).json({ error: 'Invoice is already paid' })
    }
    if (existing.status === InvoiceStatus.OVERDUE) {
      return res.status(400).json({ error: 'Cannot send an overdue invoice; update status first' })
    }

    await prisma.invoice.update({
      where: { id: existing.id },
      data: { status: InvoiceStatus.SENT },
    })
    await refreshOverdueInvoices(prisma, req.userId)
    const row = await prisma.invoice.findFirst({
      where: { id: existing.id },
      include: { client: true, items: { orderBy: { id: 'asc' } }, payments: { orderBy: { paidAt: 'desc' } } },
    })
    res.json(toInvoiceDetail(row))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to send invoice' })
  }
})

router.post('/:id/pay', async (req, res) => {
  const { amount, method, note, paidAt } = req.body

  try {
    await refreshOverdueInvoices(prisma, req.userId)

    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
    })
    if (!existing) return res.status(404).json({ error: 'Not found' })

    if (existing.status === InvoiceStatus.PAID) {
      return res.status(400).json({ error: 'Invoice is already paid' })
    }
    if (existing.status === InvoiceStatus.DRAFT) {
      return res.status(400).json({ error: 'Send the invoice before recording payment' })
    }

    const payAmount =
      amount != null ? new Prisma.Decimal(String(amount)) : new Prisma.Decimal(existing.amount.toString())

    const row = await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          invoiceId: existing.id,
          amount: payAmount,
          method: method ? String(method) : 'other',
          note: note != null ? String(note) : null,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
        },
      })
      return tx.invoice.update({
        where: { id: existing.id },
        data: { status: InvoiceStatus.PAID },
        include: { client: true, items: true, payments: true },
      })
    })

    res.json(toInvoiceDetail(row))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to record payment' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    await refreshOverdueInvoices(prisma, req.userId)

    const row = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { client: true, items: { orderBy: { id: 'asc' } }, payments: { orderBy: { paidAt: 'desc' } } },
    })
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(toInvoiceDetail(row))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to load invoice' })
  }
})

router.put('/:id', async (req, res) => {
  const { clientId, dueDate, issuedAt, status, items } = req.body

  const existing = await prisma.invoice.findFirst({
    where: { id: req.params.id, userId: req.userId },
  })
  if (!existing) return res.status(404).json({ error: 'Not found' })

  if (existing.status === InvoiceStatus.PAID) {
    return res.status(400).json({ error: 'Cannot update a paid invoice' })
  }

  const hasUpdates =
    clientId !== undefined ||
    dueDate !== undefined ||
    issuedAt !== undefined ||
    status !== undefined ||
    items !== undefined

  if (!hasUpdates) {
    try {
      await refreshOverdueInvoices(prisma, req.userId)
      const row = await prisma.invoice.findFirst({
        where: { id: existing.id },
        include: {
          client: true,
          items: { orderBy: { id: 'asc' } },
          payments: { orderBy: { paidAt: 'desc' } },
        },
      })
      return res.json(toInvoiceDetail(row))
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'Failed to load invoice' })
    }
  }

  if (status !== undefined) {
    const p = parseInvoiceStatus(status, { defaultDraft: false })
    if (!p) return res.status(400).json({ error: 'Invalid status' })
    if (p === InvoiceStatus.PAID) {
      return res.status(400).json({ error: 'Use POST /invoices/:id/pay to mark as paid' })
    }
  }

  if (items !== undefined) {
    const err = validateLineItems(items)
    if (err) return res.status(400).json({ error: err })
  }

  if (clientId !== undefined) {
    if (clientId === null || clientId === '') {
      return res.status(400).json({ error: 'clientId cannot be empty' })
    }
    const cl = await prisma.client.findFirst({
      where: { id: clientId, userId: req.userId },
    })
    if (!cl) return res.status(400).json({ error: 'Invalid client' })
  }

  try {
    const total =
      items !== undefined ? sumLineItems(items) : new Prisma.Decimal(existing.amount.toString())

    let nextStatus
    if (status !== undefined) {
      nextStatus = parseInvoiceStatus(status, { defaultDraft: false })
    }

    const row = await prisma.$transaction(async (tx) => {
      if (items !== undefined) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: existing.id } })
      }

      const data = {
        ...(clientId !== undefined && { clientId }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(issuedAt !== undefined && { issuedAt: new Date(issuedAt) }),
        ...(nextStatus !== undefined && { status: nextStatus }),
        ...(items !== undefined && {
          amount: total,
          items: {
            create: items.map((line) => ({
              description: line.description.trim(),
              quantity: new Prisma.Decimal(String(line.quantity)),
              rate: new Prisma.Decimal(String(line.rate)),
              amount: lineItemAmount(line),
            })),
          },
        }),
      }

      return tx.invoice.update({
        where: { id: existing.id },
        data,
        include: { client: true, items: { orderBy: { id: 'asc' } }, payments: { orderBy: { paidAt: 'desc' } } },
      })
    })

    await refreshOverdueInvoices(prisma, req.userId)
    const final = await prisma.invoice.findFirst({
      where: { id: row.id },
      include: {
        client: true,
        items: { orderBy: { id: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    })

    res.json(toInvoiceDetail(final))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to update invoice' })
  }
})

router.delete('/:id', async (req, res) => {
  const existing = await prisma.invoice.findFirst({
    where: { id: req.params.id, userId: req.userId },
  })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  await prisma.invoice.delete({ where: { id: existing.id } })
  res.status(204).send()
})

export default router
