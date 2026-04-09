/** @param {Date} d */
export function startOfIsoWeekUTC(d) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = x.getUTCDay()
  const offset = dow === 0 ? -6 : 1 - dow
  x.setUTCDate(x.getUTCDate() + offset)
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate(), 0, 0, 0, 0))
}

/** @param {Date} d */
export function endOfIsoWeekUTC(d) {
  const s = startOfIsoWeekUTC(d)
  const e = new Date(s)
  e.setUTCDate(e.getUTCDate() + 7)
  e.setUTCMilliseconds(e.getUTCMilliseconds() - 1)
  return e
}

/** @param {Date} d */
export function startOfMonthUTC(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0))
}

/** @param {Date} d */
export function endOfMonthUTC(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999))
}
