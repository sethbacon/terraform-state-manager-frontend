import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import i18n from '../i18n'

// Mock swagger-ui-react (registry pattern): capture the props ApiDocumentation
// hands it and invoke onComplete with a fake system exposing a minimal spec.
let swaggerProps: Record<string, unknown> = {}
vi.mock('swagger-ui-react', () => ({
  default: (props: Record<string, unknown>) => {
    swaggerProps = props
    return <div data-testid="swagger-ui" />
  },
}))
vi.mock('swagger-ui-react/swagger-ui.css', () => ({}))

import ApiDocumentation from './ApiDocumentation'

const spec = {
  tags: [{ name: 'Sources' }, { name: 'Drift' }],
  paths: {
    '/sources': { get: { tags: ['Sources'], summary: 'List' } },
    '/drift/runs': { post: { tags: ['Drift'], summary: 'Dispatch' } },
  },
}

function completeSwagger() {
  const onComplete = swaggerProps.onComplete as (system: unknown) => void
  onComplete({ getState: () => ({ toJS: () => ({ spec: { json: spec } }) }) })
}

beforeEach(() => {
  swaggerProps = {}
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  )
})

describe('ApiDocumentation', () => {
  it('renders SwaggerUI against the served spec with the CSRF interceptor wired', () => {
    render(<ApiDocumentation />)
    expect(screen.getByTestId('swagger-ui')).toBeInTheDocument()
    expect(swaggerProps.url).toBe('/swagger.json')

    // The interceptor adds the CSRF double-submit header on mutations only.
    document.cookie = 'tsm_csrf=csrf-token'
    const interceptor = swaggerProps.requestInterceptor as (r: {
      method?: string
      headers: Record<string, string>
    }) => { headers: Record<string, string> }
    expect(interceptor({ method: 'POST', headers: {} }).headers['X-CSRF-Token']).toBe('csrf-token')
    expect(interceptor({ method: 'GET', headers: {} }).headers['X-CSRF-Token']).toBeUndefined()
    document.cookie = 'tsm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  })

  it('builds the section nav from the loaded spec tags', async () => {
    render(<ApiDocumentation />)
    completeSwagger()

    expect(await screen.findByText(i18n.t('pages.apiDocs.sections') as string)).toBeInTheDocument()
    expect(screen.getByText('Drift')).toBeInTheDocument()
    expect(screen.getByText('Sources')).toBeInTheDocument()

    // Clicking a section entry scrolls to it (no crash without a target node).
    fireEvent.click(screen.getByText('Drift'))
  })

  // Regression: the dependency sweep (MUI v9 / Vite 8) changed Swagger UI's CSS
  // injection order, so override rules that lacked `!important` lost the cascade
  // — the info header leaked back in and the scheme bar showed an unthemed
  // white band. These assertions lock in the `!important` on the rules that
  // regressed so they win regardless of stylesheet load order.
  const swaggerStyleContent = (): string =>
    Array.from(document.querySelectorAll('style'))
      .map((el) => el.textContent ?? '')
      .find((css) => css.includes('.swagger-ui .information-container')) ?? ''

  it('hides the Swagger info header and topbar with !important', () => {
    render(<ApiDocumentation />)
    const css = swaggerStyleContent()
    expect(css).toContain('.swagger-ui .information-container { display: none !important; }')
    expect(css).toContain('.swagger-ui .topbar { display: none !important; }')
  })

  it('themes the scheme container background with !important in light mode', () => {
    render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'light' } })}>
        <ApiDocumentation />
      </ThemeProvider>,
    )
    expect(swaggerStyleContent()).toContain(
      '.swagger-ui .scheme-container { background: #fafafa !important;',
    )
  })

  it('themes the scheme container background with !important in dark mode', () => {
    render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <ApiDocumentation />
      </ThemeProvider>,
    )
    expect(swaggerStyleContent()).toContain(
      '.swagger-ui .scheme-container { background: #1e1e1e !important;',
    )
  })
})
