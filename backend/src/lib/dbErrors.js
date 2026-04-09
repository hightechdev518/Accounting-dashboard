import { Prisma } from '@prisma/client'

const DB_UNAVAILABLE =
  'Cannot reach the database. Run: cd backend && npx prisma migrate dev && npm run seed (SQLite file in prisma/). For PostgreSQL: docker compose up -d and set DATABASE_URL in .env.'

/** Map Prisma / DB errors to a client-friendly HTTP response, or null if unmapped. */
export function prismaToHttpError(err) {
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return { status: 503, error: DB_UNAVAILABLE }
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (['P1000', 'P1001', 'P1002', 'P1003', 'P1011', 'P1017'].includes(err.code)) {
      return { status: 503, error: DB_UNAVAILABLE }
    }
  }
  const name = err?.name || ''
  const msg = String(err?.message || err || '')
  if (
    name === 'PrismaClientInitializationError' ||
    /Can't reach database server|P1001|ECONNREFUSED|connect ECONNREFUSED|schema engine error/i.test(
      msg,
    )
  ) {
    return { status: 503, error: DB_UNAVAILABLE }
  }
  return null
}

export function sendAuthError(res, err, fallback = 'Request failed') {
  console.error(err)
  const mapped = prismaToHttpError(err)
  if (mapped) {
    return res.status(mapped.status).json({ error: mapped.error })
  }
  return res.status(500).json({ error: fallback })
}
