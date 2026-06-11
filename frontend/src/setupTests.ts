import '@testing-library/jest-dom/vitest'

// Initialise i18next so useTranslation() returns English translations in every
// unit test — prevents react-i18next from suspending the render.
import './i18n'

// Node 22+ ships a built-in globalThis.localStorage with a different API from
// the Web Storage spec. happy-dom sets a proper Storage on `window`, but
// `globalThis.localStorage` can still point at Node's built-in — replace it
// with a spec-compliant in-memory implementation (registry pattern).
const store: Record<string, string> = {}
const webStorage: Storage = {
  getItem(key: string) {
    return store[key] ?? null
  },
  setItem(key: string, value: string) {
    store[key] = String(value)
  },
  removeItem(key: string) {
    delete store[key]
  },
  clear() {
    Object.keys(store).forEach((k) => delete store[k])
  },
  key(index: number) {
    return Object.keys(store)[index] ?? null
  },
  get length() {
    return Object.keys(store).length
  },
}

Object.defineProperty(globalThis, 'localStorage', {
  value: webStorage,
  writable: true,
  configurable: true,
})
