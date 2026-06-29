import { describe, expect, it } from 'vitest'
import i18n, { SUPPORTED_LANGUAGES } from './i18n'

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
})
