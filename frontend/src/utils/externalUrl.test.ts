import { afterEach, describe, expect, it, vi } from 'vitest'
import { isSafeUrl } from '@4cloudguru/cloud-suite-ui'
import { isSafeExternalUrl } from './externalUrl'

vi.mock('@4cloudguru/cloud-suite-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@4cloudguru/cloud-suite-ui')>()
  return { ...actual, isSafeUrl: vi.fn(actual.isSafeUrl) }
})

describe('isSafeExternalUrl', () => {
  it.each([
    'https://registry.example.com',
    'https://registry.example.com/path?x=1',
    'http://localhost:3000',
    '/relative/path',
    '#anchor',
  ])('accepts %s', (value) => {
    expect(isSafeExternalUrl(value)).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'mailto:a@b.com',
    'tel:+15551234567',
    '//evil.com',
    '/\\evil.com',
    '\\\\evil.com',
    // Embedded tab/newline/CR: the URL parser strips these, normalizing the value to the
    // protocol-relative "//evil.com" (off-origin redirect) at the sink — must be rejected.
    '/\t/evil.com',
    '/\n/evil.com',
    '/\r/evil.com',
    '/safe\t//evil.com',
    '',
    '   ',
    null,
    undefined,
  ])('rejects %s', (value) => {
    expect(isSafeExternalUrl(value as string | null | undefined)).toBe(false)
  })

  it('does not throw and returns false for truthy non-string inputs', () => {
    expect(isSafeExternalUrl(123 as unknown as string)).toBe(false)
    expect(isSafeExternalUrl({} as unknown as string)).toBe(false)
  })
})

// Regression coverage for #102: isSafeExternalUrl must compose the shared isSafeUrl rather than
// re-deriving its own copy of the control-character/protocol-relative/relative-path checks. Each
// test here would fail if a future edit un-does that composition.
describe('isSafeExternalUrl delegates to the shared isSafeUrl (#102)', () => {
  afterEach(() => {
    vi.mocked(isSafeUrl).mockClear()
  })

  it('calls the shared isSafeUrl with the raw value', () => {
    isSafeExternalUrl('  https://registry.example.com  ')
    expect(vi.mocked(isSafeUrl)).toHaveBeenCalledWith('  https://registry.example.com  ')
  })

  it('rejects whatever the shared isSafeUrl rejects, even an otherwise-valid https URL', () => {
    vi.mocked(isSafeUrl).mockReturnValueOnce(false)
    expect(isSafeExternalUrl('https://registry.example.com')).toBe(false)
  })

  it('still narrows to http(s) after isSafeUrl accepts a mailto: URL', () => {
    // Proves the app doesn't just forward isSafeUrl's answer wholesale -- it composes its own
    // scheme narrowing on top, since isSafeUrl itself allows mailto:/tel:.
    vi.mocked(isSafeUrl).mockReturnValueOnce(true)
    expect(isSafeExternalUrl('mailto:a@b.com')).toBe(false)
  })
})
