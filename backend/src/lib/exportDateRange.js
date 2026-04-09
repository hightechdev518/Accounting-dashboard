import { endOfMonthUTC, startOfMonthUTC } from './timeRange.helpers.js'

/**
 * @param {import('express').Request} req
 * @returns {{ fromDate: Date, toDate: Date } | { error: string }}
 */
export function parseExportDateRange(req) {
  const now = new Date()
  const fromRaw = req.query.from
  const toRaw = req.query.to

  const fromDate = fromRaw ? new Date(String(fromRaw)) : startOfMonthUTC(now)
  let toDate = toRaw ? new Date(String(toRaw)) : endOfMonthUTC(now)
  if (toRaw) {
    toDate.setUTCHours(23, 59, 59, 999)
  }

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return { error: 'Invalid from or to date (use ISO dates, e.g. 2026-04-01)' }
  }
  if (fromDate > toDate) {
    return { error: 'from must be on or before to' }
  }
  return { fromDate, toDate }
}

export function filenameDate(d) {
  return d.toISOString().slice(0, 10)
}
