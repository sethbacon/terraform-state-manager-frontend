import { describe, expect, it, vi } from 'vitest'
import { captureError, init } from './errorReporting'

describe('errorReporting', () => {
  it('captureError logs the error with its context', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('boom')
    captureError(err, { type: 'render', componentStack: 'at App' })
    expect(spy).toHaveBeenCalledWith('[captureError]', err, { type: 'render', componentStack: 'at App' })
    spy.mockRestore()
  })

  it('captureError defaults the context to an empty object', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('boom')
    captureError(err)
    expect(spy).toHaveBeenCalledWith('[captureError]', err, {})
    spy.mockRestore()
  })

  it('init is callable (reporter placeholder)', () => {
    expect(() => init()).not.toThrow()
  })
})
