import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AboutModal from './AboutModal'
import { api } from '../services/api'
import i18n from '../i18n'

vi.mock('../services/api', () => ({
  api: { getVersion: vi.fn() },
}))

const mocked = vi.mocked(api)

function renderModal(open = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AboutModal open={open} onClose={() => {}} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AboutModal', () => {
  it('shows the frontend version chip immediately', () => {
    mocked.getVersion.mockResolvedValue({ name: 'tsm', version: '1.2.3', build_date: 'unknown' })
    renderModal()
    expect(screen.getByText(i18n.t('about.frontend', { version: '0.0.0-test' }) as string)).toBeInTheDocument()
  })

  it('shows the backend version and build date once loaded', async () => {
    mocked.getVersion.mockResolvedValue({ name: 'tsm', version: '1.2.3', build_date: '2026-06-01T00:00:00Z' })
    renderModal()
    await waitFor(() =>
      expect(screen.getByText(i18n.t('about.backend', { version: '1.2.3' }) as string)).toBeInTheDocument(),
    )
  })

  it('falls back to an unavailable chip when the backend cannot be reached', async () => {
    mocked.getVersion.mockRejectedValue(new Error('down'))
    renderModal()
    await waitFor(() =>
      expect(screen.getByText(i18n.t('about.backendUnavailable') as string)).toBeInTheDocument(),
    )
  })

  it('does not fetch while closed', () => {
    mocked.getVersion.mockResolvedValue({ name: 'tsm', version: '1.2.3', build_date: 'unknown' })
    renderModal(false)
    expect(mocked.getVersion).not.toHaveBeenCalled()
  })
})
