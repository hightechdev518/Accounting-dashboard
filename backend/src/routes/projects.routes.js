import { Router } from 'express'
import { ProjectStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { budgetUsedPercent, sumHoursByProject } from '../lib/projects.helpers.js'

const router = Router()
router.use(requireAuth)

const VALID_STATUS = new Set(Object.values(ProjectStatus))

function mapProjectStatus(raw) {
  const s = (raw ?? 'ACTIVE').toString().toUpperCase()
  if (VALID_STATUS.has(s)) return s
  return ProjectStatus.ACTIVE
}

function parseStatusFilter(q) {
  if (q == null || q === '') return null
  const s = String(q).toUpperCase()
  if (!VALID_STATUS.has(s)) throw new Error('invalid')
  return s
}

function shapeProject(p, hoursMap) {
  const totalHoursLogged = hoursMap.get(p.id) ?? 0
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    clientId: p.clientId,
    clientName: p.client?.name ?? null,
    budget: p.budget != null ? Number(p.budget) : null,
    deadline: p.deadline?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    totalHoursLogged,
    budgetUsedPercent: budgetUsedPercent(totalHoursLogged, p.budget),
  }
}

router.get('/', async (req, res) => {
  try {
    const where = { userId: req.userId }

    if (req.query.status != null && req.query.status !== '') {
      try {
        where.status = parseStatusFilter(req.query.status)
      } catch {
        return res.status(400).json({ error: 'Invalid status filter' })
      }
    }

    if (req.query.clientId != null && req.query.clientId !== '') {
      const ok = await prisma.client.findFirst({
        where: { id: String(req.query.clientId), userId: req.userId },
        select: { id: true },
      })
      if (!ok) return res.status(400).json({ error: 'Invalid clientId' })
      where.clientId = String(req.query.clientId)
    }

    const list = await prisma.project.findMany({
      where,
      include: { client: true },
      orderBy: { name: 'asc' },
    })

    const ids = list.map((p) => p.id)
    const hoursMap = await sumHoursByProject(prisma, req.userId, ids)
    res.json(list.map((p) => shapeProject(p, hoursMap)))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to list projects' })
  }
})

router.post('/', async (req, res) => {
  const { name, status, clientId, budget, deadline } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' })

  if (clientId != null && clientId !== '') {
    const cl = await prisma.client.findFirst({
      where: { id: clientId, userId: req.userId },
    })
    if (!cl) return res.status(400).json({ error: 'Invalid client' })
  }

  try {
    const row = await prisma.project.create({
      data: {
        userId: req.userId,
        name: name.trim(),
        status: mapProjectStatus(status),
        clientId: clientId || null,
        budget: budget != null ? String(budget) : null,
        deadline: deadline ? new Date(deadline) : null,
      },
      include: { client: true },
    })
    const hoursMap = await sumHoursByProject(prisma, req.userId, [row.id])
    res.status(201).json(shapeProject(row, hoursMap))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { client: true },
    })
    if (!row) return res.status(404).json({ error: 'Not found' })
    const hoursMap = await sumHoursByProject(prisma, req.userId, [row.id])
    res.json(shapeProject(row, hoursMap))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to load project' })
  }
})

router.put('/:id', async (req, res) => {
  const { name, status, clientId, budget, deadline } = req.body

  const existing = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.userId },
  })
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const hasUpdates =
    name !== undefined ||
    status !== undefined ||
    clientId !== undefined ||
    budget !== undefined ||
    deadline !== undefined

  if (!hasUpdates) {
    const row = await prisma.project.findFirst({
      where: { id: existing.id },
      include: { client: true },
    })
    const hoursMap = await sumHoursByProject(prisma, req.userId, [row.id])
    return res.json(shapeProject(row, hoursMap))
  }

  if (clientId !== undefined && clientId !== null && clientId !== '') {
    const cl = await prisma.client.findFirst({
      where: { id: clientId, userId: req.userId },
    })
    if (!cl) return res.status(400).json({ error: 'Invalid client' })
  }

  try {
    const row = await prisma.project.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(status !== undefined && { status: mapProjectStatus(status) }),
        ...(clientId !== undefined && { clientId: clientId || null }),
        ...(budget !== undefined && { budget: budget != null ? String(budget) : null }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
      },
      include: { client: true },
    })
    const hoursMap = await sumHoursByProject(prisma, req.userId, [row.id])
    res.json(shapeProject(row, hoursMap))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

router.delete('/:id', async (req, res) => {
  const existing = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.userId },
  })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  await prisma.project.delete({ where: { id: existing.id } })
  res.status(204).send()
})

export default router
