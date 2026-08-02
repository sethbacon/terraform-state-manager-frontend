import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BrandingPage from './BrandingPage'
import { api } from '../../services/api'
import i18n from '../../i18n'

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>()
  return {
    ...actual,
    api: {
      // getUITheme is mocked too (even though the page no longer calls it) so the
      // load-failure test below actually discriminates fixed vs. buggy wiring: if
      // BrandingPage's queryFn ever regressed to api.getUITheme, it would resolve
      // this stub's null -- reproducing the swallowed-failure bug (a blank form
      // where an error belongs) -- rather than leaving getUITheme undefined, which
      // would make react-query's own "missing queryFn" fallback coincidentally
      // also produce isError:true and mask the regression.
      getUITheme: vi.fn(),
      getAdminUITheme: vi.fn(),
      updateUITheme: vi.fn(),
    },
  }
})

const mocked = vi.mocked(api)

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <BrandingPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.getUITheme.mockResolvedValue(null)
  mocked.getAdminUITheme.mockResolvedValue({ product_name: 'Acme State', primary_color: '#0a6e31' })
})

describe('BrandingPage', () => {
  it('loads the stored branding into the form', async () => {
    renderPage()
    const name = (await screen.findByLabelText(
      i18n.t('pages.branding.productName') as string,
    )) as HTMLInputElement
    await waitFor(() => expect(name.value).toBe('Acme State'))
    const primary = screen.getByLabelText(i18n.t('pages.branding.primaryColor') as string) as HTMLInputElement
    expect(primary.value).toBe('#0a6e31')
  })

  it('rejects invalid colors and unsafe URLs client-side', async () => {
    renderPage()
    const primary = await screen.findByLabelText(i18n.t('pages.branding.primaryColor') as string)
    fireEvent.change(primary, { target: { value: 'reddish' } })
    expect(screen.getByText(i18n.t('pages.branding.colorHelp') as string)).toBeInTheDocument()

    const logo = screen.getByLabelText(i18n.t('pages.branding.logoUrl') as string)
    fireEvent.change(logo, { target: { value: 'javascript:alert(1)' } })
    expect(screen.getByText(i18n.t('pages.branding.urlHelp') as string)).toBeInTheDocument()

    // Both invalid -> save disabled.
    expect(screen.getByRole('button', { name: i18n.t('common.save') as string })).toBeDisabled()
  })

  it('saves the compacted config and offers a reload', async () => {
    mocked.updateUITheme.mockResolvedValue({})
    renderPage()
    const name = await screen.findByLabelText(i18n.t('pages.branding.productName') as string)
    await waitFor(() => expect((name as HTMLInputElement).value).toBe('Acme State'))
    fireEvent.change(name, { target: { value: 'Contoso Terraform' } })

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') as string }))
    await waitFor(() =>
      expect(mocked.updateUITheme).toHaveBeenCalledWith({
        product_name: 'Contoso Terraform',
        primary_color: '#0a6e31',
      }),
    )
    expect(await screen.findByText(i18n.t('pages.branding.savedReloadHint') as string)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: i18n.t('pages.branding.reloadNow') as string })).toBeInTheDocument()
  })

  it('reset to defaults saves an empty config', async () => {
    mocked.updateUITheme.mockResolvedValue({})
    renderPage()
    await screen.findByLabelText(i18n.t('pages.branding.productName') as string)

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.branding.resetDefaults') as string }))
    await waitFor(() => expect(mocked.updateUITheme).toHaveBeenCalledWith({}))
  })

  it('surfaces a server-side validation rejection', async () => {
    mocked.updateUITheme.mockRejectedValue({
      response: { data: { error: 'primary_color is not a valid color (hex or rgb()/hsl() notation)' } },
    })
    renderPage()
    await screen.findByLabelText(i18n.t('pages.branding.productName') as string)

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') as string }))
    expect(await screen.findByText(/primary_color is not a valid color/)).toBeInTheDocument()
  })

  // Regression guard: a failed load must never fall through to an empty form.
  // PUT /api/v1/admin/ui/theme is a full replace, so an empty form backed by a
  // Save button would let an admin blank out every stored branding value the
  // moment they typed one field and hit Save.
  it('does not render the form when the load fails', async () => {
    mocked.getAdminUITheme.mockRejectedValue({ response: { status: 500 } })
    renderPage()

    expect(await screen.findByText(i18n.t('pages.branding.loadFailed') as string)).toBeInTheDocument()
    expect(screen.queryByLabelText(i18n.t('pages.branding.productName') as string)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(i18n.t('pages.branding.primaryColor') as string)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: i18n.t('common.save') as string })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: i18n.t('pages.branding.resetDefaults') as string })).not.toBeInTheDocument()
  })
})
