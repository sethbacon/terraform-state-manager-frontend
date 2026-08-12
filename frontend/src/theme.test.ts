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

  it('uses the registry dark surfaces in dark mode only', () => {
    expect(createAppTheme('dark').palette.background.default).toBe('#121212')
    expect(createAppTheme('dark').palette.background.paper).toBe('#1e1e1e')
    // Light mode keeps MUI's defaults (white paper).
    expect(createAppTheme('light').palette.background.paper).toBe('#fff')
  })

  it('disables transitions when reduced motion is requested', () => {
    const theme = createAppTheme('light', true)
    expect(theme.transitions.create('opacity')).toBe('none')
    expect(theme.transitions.duration.standard).toBe(0)
  })

  it('keeps transitions by default', () => {
    expect(createAppTheme('light').transitions.duration.standard).toBeGreaterThan(0)
  })

  it('defaults to ltr and flips to rtl when requested', () => {
    expect(createAppTheme('light').direction).toBe('ltr')
    expect(createAppTheme('light', false, 'rtl').direction).toBe('rtl')
  })

  it('canonicalises whitelabel colour overrides and falls back to the brand default', () => {
    // @4cloudguru/cloud-suite-ui 0.8.1 routes every override through MUI's
    // decomposeColor + recomposeColor, so the palette and the ':root' custom
    // properties only ever see MUI's own re-serialisation and never the raw
    // host-supplied string. '#FF0000' therefore arrives as 'rgb(255, 0, 0)'.
    // Asserting the canonical form is the point: a test that accepted the input
    // verbatim would pass again the moment that normalisation was removed.
    expect(createAppTheme('light', false, 'ltr', { primary: '#FF0000' }).palette.primary.main).toBe(
      'rgb(255, 0, 0)',
    )
    expect(createAppTheme('light').palette.primary.main).toBe(BRAND_PRIMARY)
  })
})
