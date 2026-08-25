import { describe, expect, it } from 'vitest'
import i18n, { SUPPORTED_LANGUAGES } from './i18n'

// Read as raw text rather than through fs: under Vite's transform import.meta.url
// is an http URL, so fileURLToPath cannot resolve it. This also keeps the bundles
// enumerated by the same mechanism that ships them.
const RAW_BUNDLES = import.meta.glob('./locales/*/translation.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// JSON.parse keeps the LAST of a duplicated key and reports nothing, so a
// duplicate is invisible to the parsed bundle and to every assertion above --
// the dead string simply never resolves, and editing it changes nothing while
// the diff looks correct. It is also order-dependent: anything that round-trips
// the file through a parser silently drops one of the pair, which is a
// user-visible string change with no intent behind it.
//
// Detecting it therefore means scanning the raw text, not the parsed object.
function duplicateKeys(source: string): string[] {
  const dupes: string[] = []
  // one frame per container: a Set of seen keys for objects, null for arrays
  // (array elements are not keys, and a string inside one is never followed by ':')
  const stack: Array<Set<string> | null> = []
  let i = 0
  while (i < source.length) {
    const c = source[i]
    if (c === '"') {
      let j = i + 1
      let text = ''
      while (j < source.length && source[j] !== '"') {
        if (source[j] === '\\') {
          text += source[j] + source[j + 1]
          j += 2
          continue
        }
        text += source[j]
        j += 1
      }
      let k = j + 1
      while (k < source.length && /\s/.test(source[k])) k += 1
      const frame = stack[stack.length - 1]
      // Structural characters inside a string value -- i18next's {{interpolation}}
      // braces, or a literal bracket -- are skipped by consuming the whole string
      // here, so they never reach the depth tracking below.
      if (source[k] === ':' && frame) {
        if (frame.has(text)) dupes.push(text)
        frame.add(text)
      }
      i = j + 1
      continue
    }
    if (c === '{') stack.push(new Set())
    else if (c === '[') stack.push(null)
    else if (c === '}' || c === ']') stack.pop()
    i += 1
  }
  return dupes
}

describe('i18n', () => {
  it('registers every supported language as a resource bundle', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(i18n.hasResourceBundle(lang.code, 'translation'), lang.code).toBe(true)
    }
  })

  it('falls back to English for untranslated locales', () => {
    // Inject an English-only key so this assertion stays valid even after DeepL
    // fills real keys into the non-English bundles. (Asserting on a real key like
    // nav.dashboard breaks once it is translated, since it then resolves to its
    // own translation instead of the en fallback.)
    i18n.addResource('en', 'translation', 'test.enOnlyFallbackProbe', 'Probe Value')
    const en = i18n.getFixedT('en')
    const es = i18n.getFixedT('es')
    expect(es('test.enOnlyFallbackProbe')).toBe(en('test.enOnlyFallbackProbe'))
    expect(es('test.enOnlyFallbackProbe')).toBe('Probe Value')
  })

  it('resolves the core navigation strings in English', () => {
    const t = i18n.getFixedT('en')
    expect(t('nav.dashboard')).not.toBe('nav.dashboard')
    expect(t('nav.sources')).not.toBe('nav.sources')
  })

  it('declares each language with a self-describing label', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(codes).toContain('en')
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang.label).toBeTruthy()
    }
  })

  it('declares no key twice within one object in any locale bundle', () => {
    const files = Object.keys(RAW_BUNDLES)
    // An empty sweep would pass silently and prove nothing.
    expect(files.length).toBe(SUPPORTED_LANGUAGES.length)
    for (const file of files) {
      expect(duplicateKeys(RAW_BUNDLES[file]), file).toEqual([])
    }
  })

  it('detects a duplicate key that JSON.parse would silently collapse', () => {
    // Guards the guard: without this, a reader that finds nothing anywhere is
    // indistinguishable from clean bundles.
    const withDupe = '{"a": {"k": "first", "other": 1, "k": "second"}}'
    expect(duplicateKeys(withDupe)).toEqual(['k'])
    expect(JSON.parse(withDupe).a.k).toBe('second')
    // ...and does not cry wolf on repeats across different objects, on the same
    // text appearing as a value, or on braces inside a string.
    expect(duplicateKeys('{"a": {"k": 1}, "b": {"k": 2}}')).toEqual([])
    expect(duplicateKeys('{"k": "k", "v": "{{k}}"}')).toEqual([])
    expect(duplicateKeys('{"a": [{"k": 1}, {"k": 2}]}')).toEqual([])
  })
})
