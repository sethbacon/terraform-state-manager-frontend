// Minimal error-reporting shim. Centralises where uncaught render errors and
// rejected promises are recorded so a real backend (Sentry, etc.) can be wired
// in later without touching call sites. For now it logs to the console.
//
// SECURITY (#245): captureError receives the raw Error and full component stack
// with NO redaction. That is safe today because nothing leaves the browser (this
// is console-only). Before wiring any external reporter here, add a scrubbing step
// first — a beforeSend hook or an allowlist of ErrorContext fields — and never pass
// raw request/response bodies, tokens, or form state into ErrorContext.

export interface ErrorContext {
  componentStack?: string
  type?: string
  [key: string]: unknown
}

export function captureError(error: Error, context?: ErrorContext): void {
   
  console.error('[captureError]', error, context ?? {})
}

export function init(): void {
  // Placeholder for future reporter initialisation.
}
