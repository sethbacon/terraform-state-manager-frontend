import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AppThemeProvider, useThemeMode, getSafeUITheme } from './ThemeContext'
import { api } from '../services/api'
import i18n from '../i18n'

vi.mock('../services/api', () => ({
  api: { getUITheme: vi.fn().mockResolvedValue(null) },
}))

const wrapper = ({ children }: { children: ReactNode }) => <AppThemeProvider>{children}</AppThemeProvider>

describe('AppThemeProvider', () => {
  beforeEach(() => {
    localStorage.removeItem('tsm-theme')
  })

  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useThemeMode())).toThrow(/within (App|Suite)ThemeProvider/)
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

  it('exposes ltr direction by default', () => {
    const { result } = renderHook(() => useThemeMode(), { wrapper })
    expect(result.current.direction).toBe('ltr')
  })

  it('flips direction to rtl for right-to-left languages', () => {
    const { result } = renderHook(() => useThemeMode(), { wrapper })
    act(() => {
      i18n.emit('languageChanged', 'ar')
    })
    expect(result.current.direction).toBe('rtl')
    expect(document.documentElement.dir).toBe('rtl')
    act(() => {
      i18n.emit('languageChanged', 'en')
    })
    expect(result.current.direction).toBe('ltr')
    expect(document.documentElement.dir).toBe('ltr')
  })

  it('exposes the default product name when no whitelabel config is set', () => {
    const { result } = renderHook(() => useThemeMode(), { wrapper })
    expect(result.current.productName).toBe('Terraform State Manager')
    expect(result.current.logoUrl).toBeNull()
    expect(result.current.loginHeroUrl).toBeNull()
  })

  it('getSafeUITheme strips unsafe whitelabel URLs at the app boundary (#221)', async () => {
    vi.mocked(api.getUITheme).mockResolvedValueOnce({
      product_name: 'Custom',
      logo_url: 'javascript:alert(1)', // unsafe scheme -> stripped
      favicon_url: '//evil.example/f.ico', // protocol-relative -> stripped
      login_hero_url: 'https://cdn.example/hero.png', // safe -> kept
    })
    const theme = await getSafeUITheme()
    expect(theme?.logo_url).toBeUndefined()
    expect(theme?.favicon_url).toBeUndefined()
    expect(theme?.login_hero_url).toBe('https://cdn.example/hero.png')
    expect(theme?.product_name).toBe('Custom') // non-URL field untouched
  })

  it('getSafeUITheme passes a null theme through unchanged (#221)', async () => {
    vi.mocked(api.getUITheme).mockResolvedValueOnce(null)
    expect(await getSafeUITheme()).toBeNull()
  })
})
