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

/**
 * Companion to {@link extractApiError} for the responses whose STATUS carries
 * meaning the message does not: a 409 that is an invariant refusing rather than
 * a mistake the operator made, or a 503 that means "nothing was attempted, try
 * again" rather than the generic breakage a 500 reports.
 *
 * @returns the HTTP status, or undefined when the request never reached a
 *          response at all (network failure, aborted request).
 */
export function apiErrorStatus(e: unknown): number | undefined {
  return (e as { response?: { status?: number } })?.response?.status
}
