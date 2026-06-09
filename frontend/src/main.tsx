import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import App from './App'
import './index.css'
import './i18n'

// Read the CSP nonce from the meta tag (nginx replaces __CSP_NONCE__ with the
// per-request nonce via sub_filter in production). In development it stays the
// literal placeholder, which we treat as absent so emotion injects styles
// without a nonce. Routing emotion's <style> tags through this nonce keeps the
// app working under a strict Content-Security-Policy.
const nonceMeta = document.querySelector('meta[name="csp-nonce"]')
const nonce = nonceMeta?.getAttribute('content') || undefined
const resolvedNonce = nonce && nonce !== '__CSP_NONCE__' ? nonce : undefined

const emotionCache = createCache({ key: 'css', nonce: resolvedNonce })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CacheProvider value={emotionCache}>
      <App />
    </CacheProvider>
  </StrictMode>,
)
