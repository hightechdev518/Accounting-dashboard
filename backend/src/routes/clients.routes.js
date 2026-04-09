import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { refreshOverdueInvoices } from '../lib/invoice.helpers.js'

const router = Router()
router.use(requireAuth)

/** @returns {Promise<{ invoiced: Map<string, number>, paid: Map<string, number> }>} */
async function financialMapsForUser(userId) {
  const [invoiceRows, paymentRows] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId },
      select: { clientId: true, amount: true },
    }),
    prisma.payment.findMany({
      where: { invoice: { userId } },
      select: { amount: true, invoice: { select: { clientId: true } } },
    }),
  ])

  const invoiced = new Map()
  for (const r of invoiceRows) {
    invoiced.set(r.clientId, (invoiced.get(r.clientId) ?? 0) + Number(r.amount))
  }
  const paid = new Map()
  for (const r of paymentRows) {
    const cid = r.invoice.clientId
    paid.set(cid, (paid.get(cid) ?? 0) + Number(r.amount))
  }
  return { invoiced, paid }
}

function shapeClient(row, invoiced, paid) {
  const ti = invoiced.get(row.id) ?? 0
  const tp = paid.get(row.id) ?? 0
  return {
    ...row,
    company: row.address ?? null,
    totalInvoiced: ti,
    totalPaid: tp,
    outstandingBalance: ti - tp,
  }
}

router.get('/', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: req.userId },
      orderBy: { name: 'asc' },
    })
    const { invoiced, paid } = await financialMapsForUser(req.userId)
    res.json(clients.map((c) => shapeClient(c, invoiced, paid)))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to list clients' })
  }
})

router.post('/', async (req, res) => {
  const { name, email, phone, address, company } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' })
  try {
    const row = await prisma.client.create({
      data: {
        userId: req.userId,
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        address: address || company || null,
      },
    })
    const { invoiced, paid } = await financialMapsForUser(req.userId)
    res.status(201).json(shapeClient(row, invoiced, paid))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to create client' })
  }
})

router.get('/:id/invoices', async (req, res) => {
  try {
    await refreshOverdueInvoices(prisma, req.userId)

    const client = await prisma.client.findFirst({
      where: { id: req.params.id, userId: req.userId },
    })
    if (!client) return res.status(404).json({ error: 'Not found' })

    const list = await prisma.invoice.findMany({
      where: { userId: req.userId, clientId: client.id },
      include: { client: true },
      orderBy: { issuedAt: 'desc' },
    })

    res.json(
      list.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount: Number(inv.amount),
        issuedAt: inv.issuedAt.toISOString(),
        dueDate: inv.dueDate?.toISOString() ?? null,
        clientId: inv.clientId,
        clientName: inv.client?.name ?? '',
      })),
    )
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to list invoices' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await prisma.client.findFirst({
      where: { id: req.params.id, userId: req.userId },
    })
    if (!row) return res.status(404).json({ error: 'Not found' })
    const { invoiced, paid } = await financialMapsForUser(req.userId)
    res.json(shapeClient(row, invoiced, paid))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to load client' })
  }
})

router.put('/:id', async (req, res) => {
  const { name, email, phone, address, company } = req.body
  const existing = await prisma.client.findFirst({
    where: { id: req.params.id, userId: req.userId },
  })
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const hasUpdates =
    name !== undefined ||
    email !== undefined ||
    phone !== undefined ||
    address !== undefined ||
    company !== undefined

  if (!hasUpdates) {
    const { invoiced, paid } = await financialMapsForUser(req.userId)
    return res.json(shapeClient(existing, invoiced, paid))
  }

  try {
    const row = await prisma.client.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(address !== undefined || company !== undefined
          ? { address: address ?? company ?? null }
          : {}),
      },
    })
    const { invoiced, paid } = await financialMapsForUser(req.userId)
    res.json(shapeClient(row, invoiced, paid))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to update client' })
  }
})

router.delete('/:id', async (req, res) => {
  const existing = await prisma.client.findFirst({
    where: { id: req.params.id, userId: req.userId },
  })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  await prisma.client.delete({ where: { id: existing.id } })
  res.status(204).send()
})

export default router
