import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import {
  endOfIsoWeekUTC,
  endOfMonthUTC,
  startOfIsoWeekUTC,
  startOfMonthUTC,
} from '../lib/timeRange.helpers.js'

const router = Router()
router.use(requireAuth)

function serializeEntry(t) {
  const h = Number(t.hours)
  return {
    id: t.id,
    projectId: t.projectId,
    hours: h,
    minutes: Math.round(h * 60),
    description: t.description,
    date: t.date.toISOString().slice(0, 10),
    projectName: t.project.name,
  }
}

/** Must be registered before GET /:id */
router.get('/summary', async (req, res) => {
  try {
    const now = new Date()
    const w0 = startOfIsoWeekUTC(now)
    const w1 = endOfIsoWeekUTC(now)
    const m0 = startOfMonthUTC(now)
    const m1 = endOfMonthUTC(now)

    const [weekAgg, monthAgg] = await Promise.all([
      prisma.timeEntry.groupBy({
        by: ['projectId'],
        where: { userId: req.userId, date: { gte: w0, lte: w1 } },
        _sum: { hours: true },
      }),
      prisma.timeEntry.groupBy({
        by: ['projectId'],
        where: { userId: req.userId, date: { gte: m0, lte: m1 } },
        _sum: { hours: true },
      }),
    ])

    const ids = [...new Set([...weekAgg.map((a) => a.projectId), ...monthAgg.map((a) => a.projectId)])]
    const projects =
      ids.length === 0
        ? []
        : await prisma.project.findMany({
            where: { id: { in: ids }, userId: req.userId },
            select: { id: true, name: true },
          })
    const nameById = new Map(projects.map((p) => [p.id, p.name]))

    const mapRow = (a) => ({
      projectId: a.projectId,
      name: nameById.get(a.projectId) ?? 'Unknown',
      hours: Number(a._sum.hours || 0),
    })

    res.json({
      week: {
        from: w0.toISOString(),
        to: w1.toISOString(),
        projects: weekAgg.map(mapRow),
      },
      month: {
        from: m0.toISOString(),
        to: m1.toISOString(),
        projects: monthAgg.map(mapRow),
      },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to load summary' })
  }
})

router.get('/', async (req, res) => {
  try {
    const where = { userId: req.userId }

    if (req.query.projectId != null && req.query.projectId !== '') {
      const ok = await prisma.project.findFirst({
        where: { id: String(req.query.projectId), userId: req.userId },
        select: { id: true },
      })
      if (!ok) return res.status(400).json({ error: 'Invalid projectId' })
      where.projectId = String(req.query.projectId)
    }

    if ((req.query.from && req.query.from !== '') || (req.query.to && req.query.to !== '')) {
      where.date = {}
      if (req.query.from) where.date.gte = new Date(String(req.query.from))
      if (req.query.to) {
        const end = new Date(String(req.query.to))
        end.setUTCHours(23, 59, 59, 999)
        where.date.lte = end
      }
    }

    const list = await prisma.timeEntry.findMany({
      where,
      include: { project: true },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    })
    res.json(list.map(serializeEntry))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to list time entries' })
  }
})

router.post('/', async (req, res) => {
  const { projectId, hours, minutes, description, date } = req.body
  if (!projectId) return res.status(400).json({ error: 'projectId required' })
  let h = hours
  if (h == null && minutes != null) h = Number(minutes) / 60
  if (h == null) return res.status(400).json({ error: 'hours or minutes required' })

  const proj = await prisma.project.findFirst({
    where: { id: projectId, userId: req.userId },
  })
  if (!proj) return res.status(400).json({ error: 'Invalid project' })

  try {
    const row = await prisma.timeEntry.create({
      data: {
        userId: req.userId,
        projectId,
        hours: Number(h),
        description: description || null,
        date: date ? new Date(date) : new Date(),
      },
      include: { project: true },
    })
    res.status(201).json(serializeEntry(row))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to create time entry' })
  }
})

router.put('/:id', async (req, res) => {
  const { projectId, hours, minutes, description, date } = req.body

  const existing = await prisma.timeEntry.findFirst({
    where: { id: req.params.id, userId: req.userId },
  })
  if (!existing) return res.status(404).json({ error: 'Not found' })

  if (projectId !== undefined) {
    if (!projectId) return res.status(400).json({ error: 'projectId cannot be empty' })
    const proj = await prisma.project.findFirst({
      where: { id: projectId, userId: req.userId },
    })
    if (!proj) return res.status(400).json({ error: 'Invalid project' })
  }

  let nextHours
  if (hours !== undefined || minutes !== undefined) {
    let h = hours
    if (h == null && minutes != null) h = Number(minutes) / 60
    if (h == null) return res.status(400).json({ error: 'hours or minutes required when updating time' })
    nextHours = Number(h)
  }

  const hasUpdates =
    projectId !== undefined ||
    hours !== undefined ||
    minutes !== undefined ||
    description !== undefined ||
    date !== undefined

  if (!hasUpdates) {
    const row = await prisma.timeEntry.findFirst({
      where: { id: existing.id },
      include: { project: true },
    })
    return res.json(serializeEntry(row))
  }

  try {
    const row = await prisma.timeEntry.update({
      where: { id: existing.id },
      data: {
        ...(projectId !== undefined && { projectId }),
        ...(nextHours !== undefined && { hours: nextHours }),
        ...(description !== undefined && { description: description || null }),
        ...(date !== undefined && { date: new Date(date) }),
      },
      include: { project: true },
    })
    res.json(serializeEntry(row))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to update time entry' })
  }
})

router.delete('/:id', async (req, res) => {
  const existing = await prisma.timeEntry.findFirst({
    where: { id: req.params.id, userId: req.userId },
  })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  await prisma.timeEntry.delete({ where: { id: existing.id } })
  res.status(204).send()
})

export default router
