/**
 * Single source of truth for extracting a human-readable message from an
 * Axios-style error. The backend returns errors as `{ error: string }` in the
 * response body; this reads `error.response.data.error` and falls back to a
 * generic message.
 *
 * Previously this exact body was copy-pasted into ten call sites under several
 * local names (`apiErr`, `recordApiErr`, `keysApiErr`); centralizing it means a
 * future change to the error shape is one edit rather than ten (#219).
 *
 * @param e        the caught error (unknown, as thrown by axios/react-query)
 * @param fallback message when no structured error field is present
 */
export function extractApiError(e: unknown, fallback = 'Request failed.'): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
}
