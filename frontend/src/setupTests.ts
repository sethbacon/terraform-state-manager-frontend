import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// Initialise i18next so useTranslation() returns English translations in every
// unit test — prevents react-i18next from suspending the render.
import './i18n'

// testTimeout above is 15s for heavy MUI renders, but @testing-library's own
// findBy*/waitFor polling defaults to a 1s budget independent of that — under
// CPU contention from parallel workers (common on multi-core dev machines
// running the full suite), individual queries blow past 1s well before a test
// would actually hit the 15s ceiling, surfacing as flaky "Unable to find
// role=..." failures rather than real timeouts. Align the two budgets.
configure({ asyncUtilTimeout: 5000 })

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
