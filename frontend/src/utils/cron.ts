/**
 * Client-side validation and next-run preview for the schedule form's cron
 * field, matching the grammar the backend accepts (robfig/cron ParseStandard):
 * five fields (minute hour day-of-month month day-of-week) with `*`, lists,
 * ranges, steps, and JAN/MON-style names, plus the @descriptors and
 * `@every <duration>`. This is a preview aid — the backend remains the
 * authority — so unknown-but-plausible input errs on the side of a clear
 * message rather than silently blocking.
 */

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}
const DOW_NAMES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}

const DESCRIPTORS: Record<string, string> = {
  '@hourly': '0 * * * *',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@weekly': '0 0 * * 0',
  '@monthly': '0 0 1 * *',
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
}

// Go duration accepted by @every, e.g. 90m, 1h30m, 1.5h (robfig time.ParseDuration).
const GO_DURATION = /^([0-9]+(\.[0-9]+)?(ns|us|µs|ms|s|m|h))+$/

interface ParsedCron {
  minutes: Set<number>
  hours: Set<number>
  dom: Set<number>
  months: Set<number>
  dow: Set<number>
  domRestricted: boolean
  dowRestricted: boolean
}

function resolveToken(token: string, names: Record<string, number> | null): number {
  if (names) {
    const named = names[token.toLowerCase()]
    if (named !== undefined) return named
  }
  if (!/^\d+$/.test(token)) return NaN
  return parseInt(token, 10)
}

// parseField expands one cron field into its matching value set, or null on a
// syntax/range error. Handles `*`, `a`, `a-b`, lists, and `/step` on any of
// those (robfig's `a/n` means a..max stepped by n).
function parseField(
  field: string,
  min: number,
  max: number,
  names: Record<string, number> | null,
): Set<number> | null {
  const out = new Set<number>()
  for (const part of field.split(',')) {
    if (!part) return null
    const [rangePart, stepPart, extra] = part.split('/')
    if (extra !== undefined) return null
    let step = 1
    if (stepPart !== undefined) {
      step = resolveToken(stepPart, null)
      if (!Number.isInteger(step) || step < 1) return null
    }
    let lo: number
    let hi: number
    if (rangePart === '*') {
      lo = min
      hi = max
    } else if (rangePart.includes('-')) {
      const bounds = rangePart.split('-')
      if (bounds.length !== 2) return null
      lo = resolveToken(bounds[0], names)
      hi = resolveToken(bounds[1], names)
    } else {
      lo = resolveToken(rangePart, names)
      // A bare value with a step (robfig: `a/n`) ranges to max; without one it
      // is the single value.
      hi = stepPart !== undefined ? max : lo
    }
    if (Number.isNaN(lo) || Number.isNaN(hi)) return null
    // Day-of-week 7 is Sunday, same as 0 (both accepted by the backend parser).
    if (names === DOW_NAMES) {
      if (lo === 7) lo = 0
      if (hi === 7) hi = 0
    }
    if (lo < min || hi > max || lo > hi) return null
    for (let v = lo; v <= hi; v += step) out.add(v)
  }
  return out.size > 0 ? out : null
}

function parseCron(expr: string): ParsedCron | null {
  const fields = expr.trim().split(/\s+/)
  if (fields.length !== 5) return null
  const minutes = parseField(fields[0], 0, 59, null)
  const hours = parseField(fields[1], 0, 23, null)
  const dom = parseField(fields[2], 1, 31, null)
  const months = parseField(fields[3], 1, 12, MONTH_NAMES)
  const dow = parseField(fields[4], 0, 7, DOW_NAMES)
  if (!minutes || !hours || !dom || !months || !dow) return null
  return {
    minutes,
    hours,
    dom,
    months,
    dow,
    domRestricted: fields[2] !== '*',
    dowRestricted: fields[4] !== '*',
  }
}

/** validateCron returns null when expr is acceptable, else a machine-readable
 * error kind the form maps to a translated message. Matches the backend's
 * ComputeNextRun grammar: a 5-field cron, an @descriptor / `@every <dur>`, or
 * the plain keywords `daily`, `weekly`, and `every <dur>`. */
export function validateCron(expr: string): 'empty' | 'invalid' | null {
  const v = expr.trim()
  if (!v) return 'empty'
  const lower = v.toLowerCase()
  if (lower === 'daily' || lower === 'weekly') return null
  const plainEvery = v.match(/^every\s+(\S+)$/i)
  if (plainEvery) return GO_DURATION.test(plainEvery[1]) ? null : 'invalid'
  if (v.startsWith('@')) {
    if (DESCRIPTORS[lower]) return null
    const every = v.match(/^@every\s+(\S+)$/i)
    if (every && GO_DURATION.test(every[1])) return null
    return 'invalid'
  }
  return parseCron(v) ? null : 'invalid'
}

// dayMatches implements the standard cron rule: when BOTH day-of-month and
// day-of-week are restricted, a day matches if EITHER does (OR semantics, as
// robfig/cron implements); otherwise the restricted one (or both `*`) decides.
function dayMatches(p: ParsedCron, d: Date): boolean {
  const domOk = p.dom.has(d.getDate())
  const dowOk = p.dow.has(d.getDay())
  if (p.domRestricted && p.dowRestricted) return domOk || dowOk
  if (p.domRestricted) return domOk
  if (p.dowRestricted) return dowOk
  return true
}

/**
 * nextRuns computes the next `count` local fire times for expr after `from`.
 * Returns [] when expr is invalid, and for `@every` a single approximation
 * (from + duration) since the true anchor is the backend's schedule creation
 * time. Scans day-by-day (bounded to ~5 years) so rare expressions like
 * "0 0 29 2 *" still resolve without a minute-by-minute walk.
 */
export function nextRuns(expr: string, from: Date, count = 3): Date[] {
  const v = expr.trim()
  const lower = v.toLowerCase()
  // Backend keywords are interval-from-now, so only the first fire is known.
  if (lower === 'daily') return [new Date(from.getTime() + 24 * 3_600_000)]
  if (lower === 'weekly') return [new Date(from.getTime() + 7 * 24 * 3_600_000)]
  const plainEvery = v.match(/^every\s+(\S+)$/i)
  if (plainEvery && GO_DURATION.test(plainEvery[1])) {
    // The backend clamps sub-minute intervals up to one minute.
    const ms = Math.max(goDurationToMs(plainEvery[1]), 60_000)
    return [new Date(from.getTime() + ms)]
  }
  if (v.startsWith('@')) {
    const desc = DESCRIPTORS[lower]
    if (desc) return nextRuns(desc, from, count)
    const every = v.match(/^@every\s+(\S+)$/i)
    if (every && GO_DURATION.test(every[1])) {
      const ms = goDurationToMs(every[1])
      return ms > 0 ? [new Date(from.getTime() + ms)] : []
    }
    return []
  }
  const p = parseCron(v)
  if (!p) return []

  const out: Date[] = []
  const day = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const hours = [...p.hours].sort((a, b) => a - b)
  const minutes = [...p.minutes].sort((a, b) => a - b)
  for (let i = 0; i < 366 * 5 && out.length < count; i++, day.setDate(day.getDate() + 1)) {
    if (!p.months.has(day.getMonth() + 1) || !dayMatches(p, day)) continue
    for (const h of hours) {
      for (const m of minutes) {
        const candidate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m)
        if (candidate > from) {
          out.push(candidate)
          if (out.length >= count) return out
        }
      }
    }
  }
  return out
}

function goDurationToMs(dur: string): number {
  const unitMs: Record<string, number> = {
    ns: 1e-6, us: 1e-3, 'µs': 1e-3, ms: 1, s: 1000, m: 60_000, h: 3_600_000,
  }
  let total = 0
  for (const m of dur.matchAll(/([0-9]+(?:\.[0-9]+)?)(ns|us|µs|ms|s|m|h)/g)) {
    total += parseFloat(m[1]) * unitMs[m[2]]
  }
  return total
}
