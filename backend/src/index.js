import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { prisma } from './lib/prisma.js'
import { registerApiRoutes } from './routes/index.js'

const app = express()
const PORT = Number(process.env.PORT) || 3000

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }),
)
app.use(express.json())

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true, database: 'connected' })
  } catch (e) {
    res.status(503).json({
      ok: false,
      database: 'disconnected',
      hint: 'Run: cd backend && npx prisma migrate dev && npm run seed. For PostgreSQL, start docker compose up -d and set DATABASE_URL.',
    })
  }
})

registerApiRoutes(app)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Numeris API listening on http://localhost:${PORT}`)
})
