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
})
