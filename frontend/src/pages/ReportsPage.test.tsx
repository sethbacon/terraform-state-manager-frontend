import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReportsPage from './ReportsPage'
import { api } from '../services/api'
import i18n from '../i18n'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return {
    ...actual,
    api: {
      listSources: vi.fn(),
      listStates: vi.fn(),
      analyzeState: vi.fn(),
      downloadReport: vi.fn(),
    },
  }
})

const mocked = vi.mocked(api)

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ReportsPage />
    </QueryClientProvider>,
  )
}

async function pickSourceAndState() {
  await waitFor(() => expect(mocked.listSources).toHaveBeenCalled())
  fireEvent.mouseDown(screen.getByLabelText(new RegExp(i18n.t('pages.reports.source') as string)))
  fireEvent.click(await screen.findByRole('option', { name: /demo-local/ }))
  await waitFor(() => expect(mocked.listStates).toHaveBeenCalledWith('s1'))

  const stateBox = screen.getByLabelText(new RegExp(i18n.t('pages.reports.stateFile') as string))
  await waitFor(() => expect(stateBox).toBeEnabled())
  fireEvent.mouseDown(stateBox)
  fireEvent.click(await screen.findByText('app.tfstate'))
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.listSources.mockResolvedValue([{ id: 's1', name: 'demo-local', type: 'local' }] as Awaited<
    ReturnType<typeof api.listSources>
  >)
  mocked.listStates.mockResolvedValue([{ key: 'app.tfstate', name: 'app.tfstate' }] as Awaited<
    ReturnType<typeof api.listStates>
  >)
  mocked.analyzeState.mockResolvedValue({
    analysis: {
      terraform_version: '1.9.5',
      serial: 7,
      rum: 18,
      total_resources: 21,
      managed_resources: 19,
      data_sources: 2,
      resource_types: [{ key: 'aws_instance', count: 12 }],
      providers: [{ key: 'aws', count: 19 }],
    },
  } as Awaited<ReturnType<typeof api.analyzeState>>)
})

describe('ReportsPage', () => {
  it('prompts to choose a source first', async () => {
    renderPage()
    expect(await screen.findByText(i18n.t('pages.reports.chooseSource') as string)).toBeInTheDocument()
  })

  it('offers all three report formats once a state is selected', async () => {
    renderPage()
    await pickSourceAndState()
    // Re-query inside waitFor: the buttons re-render (disabled → enabled) as
    // the analysis query settles, detaching earlier nodes.
    for (const label of ['Markdown', 'JSON', 'CSV']) {
      await waitFor(() => expect(screen.getByRole('button', { name: label })).toBeEnabled())
    }
  })

  it('downloads the chosen format', async () => {
    mocked.downloadReport.mockResolvedValue(undefined)
    renderPage()
    await pickSourceAndState()
    await waitFor(() => expect(screen.getByRole('button', { name: 'CSV' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'CSV' }))
    await waitFor(() => expect(mocked.downloadReport).toHaveBeenCalledWith('s1', 'app.tfstate', 'csv'))
  })

  it('surfaces a download failure inline', async () => {
    mocked.downloadReport.mockRejectedValue({ response: { data: { error: 'state too large' } } })
    renderPage()
    await pickSourceAndState()
    await waitFor(() => expect(screen.getByRole('button', { name: 'JSON' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }))
    expect(await screen.findByText('state too large')).toBeInTheDocument()
  })
})
