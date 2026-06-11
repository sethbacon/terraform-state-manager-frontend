import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { HelpProvider, useHelp } from './HelpContext'

const wrapper = ({ children }: { children: ReactNode }) => <HelpProvider>{children}</HelpProvider>

describe('HelpProvider', () => {
  beforeEach(() => {
    localStorage.removeItem('tsm-help-panel-open')
  })

  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useHelp())).toThrow(/within a HelpProvider/)
  })

  it('starts closed by default', () => {
    const { result } = renderHook(() => useHelp(), { wrapper })
    expect(result.current.helpOpen).toBe(false)
  })

  it('restores the persisted open state', () => {
    localStorage.setItem('tsm-help-panel-open', 'true')
    const { result } = renderHook(() => useHelp(), { wrapper })
    expect(result.current.helpOpen).toBe(true)
  })

  it('open/close/toggle update state and persist it', () => {
    const { result } = renderHook(() => useHelp(), { wrapper })

    act(() => result.current.openHelp())
    expect(result.current.helpOpen).toBe(true)
    expect(localStorage.getItem('tsm-help-panel-open')).toBe('true')

    act(() => result.current.closeHelp())
    expect(result.current.helpOpen).toBe(false)
    expect(localStorage.getItem('tsm-help-panel-open')).toBe('false')

    act(() => result.current.toggleHelp())
    expect(result.current.helpOpen).toBe(true)
  })
})
