// Minimal error-reporting shim. Centralises where uncaught render errors and
// rejected promises are recorded so a real backend (Sentry, etc.) can be wired
// in later without touching call sites. For now it logs to the console.

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
