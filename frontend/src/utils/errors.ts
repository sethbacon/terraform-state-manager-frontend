import { AxiosError } from 'axios'

export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred'): string {
  if (err instanceof AxiosError) {
    const serverMessage = (err.response?.data as Record<string, unknown>)?.error
    if (typeof serverMessage === 'string') return serverMessage
    return err.message || fallback
  }
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return fallback
}

export function getErrorStatus(err: unknown): number | undefined {
  if (err instanceof AxiosError) return err.response?.status
  return undefined
}
