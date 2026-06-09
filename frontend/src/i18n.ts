import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enTranslation from './locales/en/translation.json'
import esTranslation from './locales/es/translation.json'
import frTranslation from './locales/fr/translation.json'
import deTranslation from './locales/de/translation.json'
import jaTranslation from './locales/ja/translation.json'
import ptTranslation from './locales/pt/translation.json'
import nlTranslation from './locales/nl/translation.json'
import nbTranslation from './locales/nb/translation.json'
import zhTranslation from './locales/zh/translation.json'
import itTranslation from './locales/it/translation.json'

// English is the source of truth. The other locales are machine-translated via
// DeepL by scripts/translate.mjs (run in CI by .github/workflows/translate.yml),
// which tracks source-string hashes to detect staleness. Missing keys fall back
// to English.

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'nb', label: 'Norsk bokmål' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
] as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      es: { translation: esTranslation },
      fr: { translation: frTranslation },
      de: { translation: deTranslation },
      ja: { translation: jaTranslation },
      pt: { translation: ptTranslation },
      nl: { translation: nlTranslation },
      nb: { translation: nbTranslation },
      zh: { translation: zhTranslation },
      it: { translation: itTranslation },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr', 'de', 'ja', 'pt', 'nl', 'nb', 'zh', 'it'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      // React already escapes output — no double-escaping needed.
      escapeValue: false,
    },
  })

export default i18n

// Type augmentation: use Record<string, unknown> rather than `typeof enTranslation`
// to avoid a TS overload-resolution crash once the key union grows large.
// Translation completeness is enforced by scripts/translate.mjs, not the compiler.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: Record<string, unknown>
    }
  }
}
