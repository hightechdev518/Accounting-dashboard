import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import {
  hashRefreshToken,
  requireAuth,
  signAccessToken,
  REFRESH_TOKEN_TTL_MS,
} from '../middleware/auth.js'
import { sendAuthError } from '../lib/dbErrors.js'

const router = Router()

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  }
}

/** Issue a new refresh token row + return raw secret (only time client sees it). */
async function createRefreshToken(userId) {
  const raw = crypto.randomBytes(48).toString('base64url')
  const tokenHash = hashRefreshToken(raw)
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  })
  return { raw, expiresAt }
}

async function revokeRefreshTokenByRaw(raw) {
  if (!raw) return { count: 0 }
  const tokenHash = hashRefreshToken(raw)
  const now = new Date()
  const result = await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    data: { revokedAt: now },
  })
  return result
}

/** POST /api/auth/register */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
      },
    })

    const accessToken = signAccessToken(user.id, user.email)
    const { raw: refreshToken, expiresAt: refreshExpiresAt } = await createRefreshToken(user.id)

    res.status(201).json({
      accessToken,
      refreshToken,
      refreshExpiresAt: refreshExpiresAt.toISOString(),
      user: publicUser(user),
    })
  } catch (e) {
    sendAuthError(res, e, 'Registration failed')
  }
})

/** POST /api/auth/login */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    let passwordOk = false
    try {
      passwordOk = await bcrypt.compare(password, user.passwordHash)
    } catch {
      passwordOk = false
    }
    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const accessToken = signAccessToken(user.id, user.email)
    const { raw: refreshToken, expiresAt: refreshExpiresAt } = await createRefreshToken(user.id)

    res.json({
      accessToken,
      refreshToken,
      refreshExpiresAt: refreshExpiresAt.toISOString(),
      user: publicUser(user),
    })
  } catch (e) {
    sendAuthError(res, e, 'Login failed')
  }
})

/** POST /api/auth/refresh — body: { refreshToken } */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken: raw } = req.body
    if (!raw || typeof raw !== 'string') {
      return res.status(400).json({ error: 'refreshToken is required' })
    }

    const tokenHash = hashRefreshToken(raw)
    const now = new Date()

    const row = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      include: { user: true },
    })

    if (!row) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' })
    }

    // Rotate refresh token: revoke old, issue new
    await prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: now },
    })

    const accessToken = signAccessToken(row.user.id, row.user.email)
    const { raw: newRefreshToken, expiresAt: refreshExpiresAt } = await createRefreshToken(row.user.id)

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      refreshExpiresAt: refreshExpiresAt.toISOString(),
      user: publicUser(row.user),
    })
  } catch (e) {
    sendAuthError(res, e, 'Token refresh failed')
  }
})

/** POST /api/auth/logout — body: { refreshToken } (idempotent: always 204 if body valid) */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken: raw } = req.body
    if (!raw || typeof raw !== 'string') {
      return res.status(400).json({ error: 'refreshToken is required' })
    }
    await revokeRefreshTokenByRaw(raw)
    res.status(204).send()
  } catch (e) {
    sendAuthError(res, e, 'Logout failed')
  }
})

/** GET /api/auth/me */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (e) {
    sendAuthError(res, e, 'Failed to load user')
  }
})

export default router
