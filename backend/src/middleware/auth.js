import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

/** Access token lifetime (JWT `expiresIn` string). */
export const ACCESS_TOKEN_EXPIRES = '24h'

/** Refresh token TTL in milliseconds (7 days). */
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex')
}

export function signAccessToken(userId, email) {
  return jwt.sign(
    { sub: userId, email, typ: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES },
  )
}

/**
 * Validates `Authorization: Bearer <access JWT>`.
 * Sets `req.userId`, `req.userEmail`.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload.typ && payload.typ !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' })
    }
    req.userId = payload.sub
    req.userEmail = payload.email
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired access token' })
  }
}

export { JWT_SECRET }
