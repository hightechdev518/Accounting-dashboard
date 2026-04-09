import axios from 'axios'

const ACCESS_KEY = 'numeris_access_token'
const REFRESH_KEY = 'numeris_refresh_token'

/** Base URL for API (empty = same origin; Vite dev proxy forwards /api) */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

/** @deprecated use getAccessToken */
export function getToken() {
  return getAccessToken()
}

export function setTokens(accessToken, refreshToken) {
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken)
  else localStorage.removeItem(ACCESS_KEY)
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
  else localStorage.removeItem(REFRESH_KEY)
}

/** @deprecated use setTokens */
export function setToken(token) {
  if (token) localStorage.setItem(ACCESS_KEY, token)
  else clearTokens()
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

function shouldAttachAuth(config) {
  const url = `${config.baseURL || ''}${config.url || ''}`
  if (url.includes('/api/auth/login')) return false
  if (url.includes('/api/auth/register')) return false
  if (url.includes('/api/auth/refresh')) return false
  return true
}

apiClient.interceptors.request.use((config) => {
  if (shouldAttachAuth(config)) {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

let isRefreshing = false
const pendingQueue = []

function flushQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  pendingQueue.length = 0
}

async function refreshAccessToken() {
  const raw = getRefreshToken()
  if (!raw) throw new Error('No refresh token')
  const res = await axios.post(
    `${API_BASE_URL}/api/auth/refresh`,
    { refreshToken: raw },
    { headers: { 'Content-Type': 'application/json' } },
  )
  const { accessToken, refreshToken } = res.data
  setTokens(accessToken, refreshToken)
  return accessToken
}

function isAuthPathNoRetry(url) {
  if (!url) return false
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/refresh')
  )
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isAuthPathNoRetry(originalRequest.url)) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const accessToken = await refreshAccessToken()
      flushQueue(null, accessToken)
      originalRequest.headers.Authorization = `Bearer ${accessToken}`
      return apiClient(originalRequest)
    } catch (refreshErr) {
      flushQueue(refreshErr, null)
      clearTokens()
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)

/**
 * Legacy helper (AuthContext).
 * @param {string} path
 * @param {RequestInit & { body?: string }} options
 */
export async function api(path, options = {}) {
  const { method = 'GET', body, headers: hdrs, ...rest } = options
  const config = {
    url: path,
    method,
    headers: { ...hdrs },
    ...rest,
  }
  if (body != null) {
    config.data = typeof body === 'string' ? JSON.parse(body) : body
  }
  try {
    const res = await apiClient.request(config)
    if (res.status === 204) return null
    return res.data
  } catch (e) {
    const data = e.response?.data
    let msg = e.message || 'Request failed'
    if (data && typeof data === 'object') {
      if (typeof data.error === 'string') msg = data.error
      else if (typeof data.message === 'string') msg = data.message
    }
    const err = new Error(msg)
    err.status = e.response?.status
    throw err
  }
}
