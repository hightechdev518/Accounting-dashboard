import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const list = await prisma.taxDeadline.findMany({
    where: { userId: req.userId },
    orderBy: { dueDate: 'asc' },
  })
  res.json(list)
})

router.post('/', async (req, res) => {
  const { title, period, dueDate } = req.body
  if (!title || !dueDate) return res.status(400).json({ error: 'title and dueDate required' })
  const row = await prisma.taxDeadline.create({
    data: {
      userId: req.userId,
      title,
      period: period || '',
      dueDate: new Date(dueDate),
    },
  })
  res.status(201).json(row)
})

export default router
