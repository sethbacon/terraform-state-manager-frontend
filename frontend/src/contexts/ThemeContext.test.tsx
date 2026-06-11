import { describe, expect, it, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AppThemeProvider, useThemeMode } from './ThemeContext'

const wrapper = ({ children }: { children: ReactNode }) => <AppThemeProvider>{children}</AppThemeProvider>

describe('AppThemeProvider', () => {
  beforeEach(() => {
    localStorage.removeItem('tsm-theme')
  })

  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useThemeMode())).toThrow(/within AppThemeProvider/)
  })

  it('defaults to light without a stored preference (no matchMedia dark)', () => {
    const { result } = renderHook(() => useThemeMode(), { wrapper })
    expect(result.current.mode).toBe('light')
  })

  it('honours a stored preference', () => {
    localStorage.setItem('tsm-theme', 'dark')
    const { result } = renderHook(() => useThemeMode(), { wrapper })
    expect(result.current.mode).toBe('dark')
  })

  it('toggle flips the mode and persists it', () => {
    const { result } = renderHook(() => useThemeMode(), { wrapper })
    act(() => result.current.toggle())
    expect(result.current.mode).toBe('dark')
    expect(localStorage.getItem('tsm-theme')).toBe('dark')
    act(() => result.current.toggle())
    expect(result.current.mode).toBe('light')
    expect(localStorage.getItem('tsm-theme')).toBe('light')
  })

  it('ignores garbage stored values', () => {
    localStorage.setItem('tsm-theme', 'neon')
    const { result } = renderHook(() => useThemeMode(), { wrapper })
    expect(['light', 'dark']).toContain(result.current.mode)
    expect(result.current.mode).toBe('light')
  })
})
