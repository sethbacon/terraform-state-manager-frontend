import { describe, expect, it } from 'vitest'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AnnouncerProvider, useAnnouncer } from './AnnouncerContext'

const wrapper = ({ children }: { children: ReactNode }) => <AnnouncerProvider>{children}</AnnouncerProvider>

describe('AnnouncerProvider', () => {
  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useAnnouncer())).toThrow(/within an AnnouncerProvider/)
  })

  it('renders polite and assertive live regions', () => {
    render(<AnnouncerProvider>x</AnnouncerProvider>)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
  })

  it('announce posts a polite message into the status region', async () => {
    const { result } = renderHook(() => useAnnouncer(), { wrapper })
    result.current.announce('saved successfully')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('saved successfully'))
  })

  it('announce with assertive priority uses the alert region', async () => {
    const { result } = renderHook(() => useAnnouncer(), { wrapper })
    result.current.announce('something failed', 'assertive')
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('something failed'))
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('ignores empty messages', async () => {
    const { result } = renderHook(() => useAnnouncer(), { wrapper })
    result.current.announce('')
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.getByRole('status')).toHaveTextContent('')
  })
})
