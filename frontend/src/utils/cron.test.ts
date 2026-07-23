import { describe, expect, it } from 'vitest'
import { nextRuns, validateCron } from './cron'

describe('validateCron', () => {
  it('accepts standard five-field expressions', () => {
    for (const expr of [
      '* * * * *',
      '0 3 * * *',
      '*/15 * * * *',
      '0 9-17 * * 1-5',
      '30 2 1,15 * *',
      '0 0 * JAN,JUL SUN',
      '5/10 * * * *', // robfig: 5..59 step 10
      '0 0 * * 7', // 7 = Sunday
    ]) {
      expect(validateCron(expr), expr).toBeNull()
    }
  })

  it('accepts descriptors and @every durations', () => {
    for (const expr of ['@hourly', '@daily', '@weekly', '@monthly', '@yearly', '@every 1h30m', '@every 90m']) {
      expect(validateCron(expr), expr).toBeNull()
    }
  })

  it('rejects malformed expressions', () => {
    for (const expr of [
      '0 3 * *', // four fields
      '0 3 * * * *', // six fields
      '60 * * * *', // minute out of range
      '* 24 * * *', // hour out of range
      '* * 0 * *', // dom below range
      '* * * 13 *', // month out of range
      '* * * * 8', // dow out of range
      'a * * * *',
      '1-5-7 * * * *',
      '*/0 * * * *', // zero step
      '@every soon',
      '@fortnightly',
    ]) {
      expect(validateCron(expr), expr).toBe('invalid')
    }
  })

  it('accepts the backend keyword forms (daily/weekly/every <dur>)', () => {
    for (const expr of ['daily', 'weekly', 'every 15m', 'every 1h30m', 'DAILY']) {
      expect(validateCron(expr), expr).toBeNull()
    }
    expect(validateCron('every soon')).toBe('invalid')
  })

  it('flags empty separately so the form can stay quiet until typed', () => {
    expect(validateCron('')).toBe('empty')
    expect(validateCron('   ')).toBe('empty')
  })
})

describe('nextRuns', () => {
  // A fixed local anchor: Wednesday 2026-07-22 10:30.
  const from = new Date(2026, 6, 22, 10, 30)

  it('computes the next daily fire times', () => {
    const runs = nextRuns('0 3 * * *', from, 2)
    expect(runs).toHaveLength(2)
    expect(runs[0].getHours()).toBe(3)
    expect(runs[0].getDate()).toBe(23)
    expect(runs[1].getDate()).toBe(24)
  })

  it('fires later the same day when a slot remains', () => {
    const runs = nextRuns('45 10 * * *', from, 1)
    expect(runs[0].getDate()).toBe(22)
    expect(runs[0].getHours()).toBe(10)
    expect(runs[0].getMinutes()).toBe(45)
  })

  it('respects day-of-week restrictions', () => {
    // Next Monday after Wed 2026-07-22 is 2026-07-27.
    const runs = nextRuns('0 8 * * MON', from, 1)
    expect(runs[0].getDay()).toBe(1)
    expect(runs[0].getDate()).toBe(27)
  })

  it('uses OR semantics when both dom and dow are restricted', () => {
    // Standard cron: "0 0 1 * MON" fires on the 1st AND on every Monday.
    const runs = nextRuns('0 0 1 * MON', from, 2)
    expect(runs[0].getDate()).toBe(27) // Monday first
    expect(runs[1].getDate()).toBe(1) // then Aug 1
  })

  it('resolves rare dates without hanging', () => {
    const runs = nextRuns('0 0 29 2 *', from, 1)
    expect(runs).toHaveLength(1)
    expect(runs[0].getMonth()).toBe(1)
    expect(runs[0].getDate()).toBe(29) // 2028-02-29
    expect(runs[0].getFullYear()).toBe(2028)
  })

  it('approximates @every from now', () => {
    const runs = nextRuns('@every 90m', from, 3)
    expect(runs).toHaveLength(1)
    expect(runs[0].getTime()).toBe(from.getTime() + 90 * 60_000)
  })

  it('approximates the keyword forms from now, clamping sub-minute intervals', () => {
    expect(nextRuns('daily', from, 3)[0].getTime()).toBe(from.getTime() + 24 * 3_600_000)
    expect(nextRuns('weekly', from, 3)[0].getTime()).toBe(from.getTime() + 7 * 24 * 3_600_000)
    expect(nextRuns('every 10s', from, 1)[0].getTime()).toBe(from.getTime() + 60_000)
  })

  it('returns [] for invalid expressions', () => {
    expect(nextRuns('not a cron', from)).toEqual([])
  })
})
