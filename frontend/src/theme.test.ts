import { describe, it, expect } from 'vitest'
import { createAppTheme, BRAND_PRIMARY } from './theme'

describe('createAppTheme', () => {
  it('applies the brand primary colour in both modes', () => {
    expect(createAppTheme('light').palette.primary.main).toBe(BRAND_PRIMARY)
    expect(createAppTheme('dark').palette.primary.main).toBe(BRAND_PRIMARY)
  })

  it('reflects the requested mode', () => {
    expect(createAppTheme('light').palette.mode).toBe('light')
    expect(createAppTheme('dark').palette.mode).toBe('dark')
  })

  it('disables transitions when reduced motion is requested', () => {
    const theme = createAppTheme('light', true)
    expect(theme.transitions.create()).toBe('none')
    expect(theme.transitions.duration.standard).toBe(0)
  })

  it('keeps transitions by default', () => {
    expect(createAppTheme('light').transitions.duration.standard).toBeGreaterThan(0)
  })
})
