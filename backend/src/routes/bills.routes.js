import { Router } from 'express'
import { BillStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { refreshOverdueBills } from '../lib/bills.helpers.js'

const router = Router()
router.use(requireAuth)

const VALID = new Set(Object.values(BillStatus))

function parseBillStatus(raw, { defaultAwaiting = true } = {}) {
  const s = (raw ?? 'AWAITING').toString().toUpperCase()
  if (s === 'AWAITING' || s === 'OVERDUE' || s === 'PAID') return s
  if (defaultAwaiting) return BillStatus.AWAITING
  return null
}

function assertQueryStatus(q) {
  if (q == null || q === '') return null
  const s = String(q).toUpperCase()
  if (!VALID.has(s)) throw new Error('invalid')
  return s
}

function serializeBill(b) {
  return {
    id: b.id,
    title: b.title,
    vendor: b.client?.name ?? b.title,
    description: b.title,
    amount: Number(b.amount),
    status: b.status,
    dueDate: b.dueDate?.toISOString() ?? null,
    createdAt: b.createdAt.toISOString(),
    clientId: b.clientId,
    client: b.client ? { id: b.client.id, name: b.client.name } : null,
  }
}

router.get('/', async (req, res) => {
  try {
    await refreshOverdueBills(prisma, req.userId)

    const where = { userId: req.userId }
    if (req.query.status != null && req.query.status !== '') {
      try {
        where.status = assertQueryStatus(req.query.status)
      } catch {
        return res.status(400).json({ error: 'Invalid status (use AWAITING, OVERDUE, or PAID)' })
      }
    }

    const list = await prisma.bill.findMany({
      where,
      include: { client: true },
      orderBy: { dueDate: 'asc' },
    })
    res.json(list.map(serializeBill))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to list bills' })
  }
})

router.post('/', async (req, res) => {
  const { title, clientId, amount, status, dueDate } = req.body
  if (!clientId || amount == null) return res.status(400).json({ error: 'clientId and amount required' })

  const st = parseBillStatus(status)
  if (!st) return res.status(400).json({ error: 'Invalid status' })

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: req.userId },
  })
  if (!client) return res.status(400).json({ error: 'Invalid client' })

  try {
    const row = await prisma.bill.create({
      data: {
        userId: req.userId,
        clientId,
        title: (title && String(title).trim()) || 'Bill',
        amount,
        status: st,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: { client: true },
    })
    await refreshOverdueBills(prisma, req.userId)
    const final = await prisma.bill.findFirst({
      where: { id: row.id },
      include: { client: true },
    })
    res.status(201).json(serializeBill(final))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to create bill' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    await refreshOverdueBills(prisma, req.userId)
    const row = await prisma.bill.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { client: true },
    })
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(serializeBill(row))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to load bill' })
  }
})

router.put('/:id', async (req, res) => {
  const { title, clientId, amount, status, dueDate } = req.body

  const existing = await prisma.bill.findFirst({
    where: { id: req.params.id, userId: req.userId },
  })
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const hasUpdates =
    title !== undefined ||
    clientId !== undefined ||
    amount !== undefined ||
    status !== undefined ||
    dueDate !== undefined

  if (!hasUpdates) {
    await refreshOverdueBills(prisma, req.userId)
    const row = await prisma.bill.findFirst({
      where: { id: existing.id },
      include: { client: true },
    })
    return res.json(serializeBill(row))
  }

  if (status !== undefined) {
    const p = parseBillStatus(status, { defaultAwaiting: false })
    if (!p) return res.status(400).json({ error: 'Invalid status' })
  }

  if (clientId !== undefined) {
    if (!clientId) return res.status(400).json({ error: 'clientId cannot be empty' })
    const cl = await prisma.client.findFirst({
      where: { id: clientId, userId: req.userId },
    })
    if (!cl) return res.status(400).json({ error: 'Invalid client' })
  }

  try {
    const row = await prisma.bill.update({
      where: { id: existing.id },
      data: {
        ...(title !== undefined && { title: String(title).trim() || 'Bill' }),
        ...(clientId !== undefined && { clientId }),
        ...(amount !== undefined && { amount }),
        ...(status !== undefined && { status: parseBillStatus(status, { defaultAwaiting: false }) }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
      include: { client: true },
    })
    await refreshOverdueBills(prisma, req.userId)
    const final = await prisma.bill.findFirst({
      where: { id: row.id },
      include: { client: true },
    })
    res.json(serializeBill(final))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to update bill' })
  }
})

router.delete('/:id', async (req, res) => {
  const existing = await prisma.bill.findFirst({
    where: { id: req.params.id, userId: req.userId },
  })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  await prisma.bill.delete({ where: { id: existing.id } })
  res.status(204).send()
})

export default router
