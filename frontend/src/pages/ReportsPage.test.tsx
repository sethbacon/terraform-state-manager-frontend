import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReportsPage from './ReportsPage'
import { api, reportFilterParams } from '../services/api'
import i18n from '../i18n'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return {
    ...actual,
    api: {
      listSources: vi.fn(),
      listReportStates: vi.fn(),
      downloadStatesReport: vi.fn(),
    },
  }
})

const mocked = vi.mocked(api)

const result = {
  total: 2,
  truncated: false,
  summary: { matched: 2, rum: 45, managed_resources: 40, data_sources: 5, total_resources: 47 },
  states: [
    {
      source_id: 's1', source_name: 'prod', source_type: 's3', state_key: 'envs/prod/app.tfstate',
      terraform_version: '1.5.7', serial: 10, size: 2048, rum: 40, managed_resources: 38,
      data_sources: 2, total_resources: 42, analyzed_at: '2026-06-18T00:00:00Z',
    },
    {
      source_id: 's2', source_name: 'dev', source_type: 'local', state_key: 'dev/data.tfstate',
      terraform_version: '1.9.5', serial: 3, size: 9000, rum: 5, managed_resources: 2,
      data_sources: 3, total_resources: 5, analyzed_at: '2026-06-18T00:00:00Z',
    },
  ],
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/reports']}>
        <Routes>
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/sources" element={<div>sources page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.listSources.mockResolvedValue([{ id: 's1', name: 'prod', type: 's3' }] as Awaited<ReturnType<typeof api.listSources>>)
  mocked.listReportStates.mockResolvedValue(result as Awaited<ReturnType<typeof api.listReportStates>>)
})

describe('reportFilterParams', () => {
  it('omits unset fields', () => {
    expect(reportFilterParams({}).toString()).toBe('')
  })

  it('serializes every filter, repeating source_id and pairing version with op', () => {
    const p = reportFilterParams({
      sourceIds: ['a', 'b'], q: 'prod', version: '1.0.0', op: 'lt', provider: 'aws',
      resourceType: 'aws_instance', rumMin: 10, rumMax: 100, sizeMin: 1024,
    })
    expect(p.getAll('source_id')).toEqual(['a', 'b'])
    expect(p.get('q')).toBe('prod')
    expect(p.get('version')).toBe('1.0.0')
    expect(p.get('op')).toBe('lt')
    expect(p.get('provider')).toBe('aws')
    expect(p.get('resource_type')).toBe('aws_instance')
    expect(p.get('rum_min')).toBe('10')
    expect(p.get('rum_max')).toBe('100')
    expect(p.get('size_min')).toBe('1024')
  })

  it('omits op when no version is set', () => {
    const p = reportFilterParams({ op: 'lt' })
    expect(p.has('op')).toBe(false)
  })
})

describe('ReportsPage', () => {
  it('renders the matched rows and the summary totals', async () => {
    renderPage()
    expect(await screen.findByText('envs/prod/app.tfstate')).toBeInTheDocument()
    expect(screen.getByText('dev/data.tfstate')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument() // summary RUM total
  })

  it('exports the current filter set in a chosen format', async () => {
    mocked.downloadStatesReport.mockResolvedValue(undefined)
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: 'CSV' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'CSV' }))
    await waitFor(() => expect(mocked.downloadStatesReport).toHaveBeenCalledWith(expect.any(Object), 'csv'))
  })

  it('surfaces an export failure inline', async () => {
    mocked.downloadStatesReport.mockRejectedValue({ response: { data: { error: 'export boom' } } })
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: 'JSON' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }))
    expect(await screen.findByText('export boom')).toBeInTheDocument()
  })

  it('deep-links a row into the Sources page', async () => {
    renderPage()
    fireEvent.click(await screen.findByText('envs/prod/app.tfstate'))
    expect(await screen.findByText('sources page')).toBeInTheDocument()
  })

  it('re-queries with the state-key filter after typing', async () => {
    renderPage()
    await screen.findByText('envs/prod/app.tfstate')
    fireEvent.change(screen.getByLabelText(i18n.t('pages.reports.searchKey') as string), {
      target: { value: 'prod' },
    })
    await waitFor(() =>
      expect(mocked.listReportStates).toHaveBeenCalledWith(expect.objectContaining({ q: 'prod' })),
    )
  })

  it('sorts when column headers are clicked', async () => {
    renderPage()
    await screen.findByText('envs/prod/app.tfstate')
    // New key (numeric column) then a different key (string column), then flip it.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('pages.reports.colManaged') as string) }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('pages.reports.colSource') as string) }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('pages.reports.colSource') as string) }))
    // Rows still render after re-sorting.
    expect(screen.getByText('dev/data.tfstate')).toBeInTheDocument()
  })

  it('applies version + operator + provider filters', async () => {
    renderPage()
    await screen.findByText('envs/prod/app.tfstate')
    fireEvent.change(screen.getByLabelText(i18n.t('pages.reports.version') as string), { target: { value: '1.5.0' } })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.dashboard.versionOpLte') as string }))
    fireEvent.change(screen.getByLabelText(i18n.t('pages.reports.provider') as string), { target: { value: 'aws' } })
    await waitFor(() =>
      expect(mocked.listReportStates).toHaveBeenCalledWith(
        expect.objectContaining({ version: '1.5.0', op: 'lte', provider: 'aws' }),
      ),
    )
  })

  it('expands advanced filters and applies a numeric range', async () => {
    renderPage()
    await screen.findByText('envs/prod/app.tfstate')
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('pages.reports.advanced') as string) }))
    const mins = screen.getAllByLabelText(i18n.t('pages.reports.min') as string)
    fireEvent.change(mins[0], { target: { value: '10' } }) // rumMin (first NumberRange)
    await waitFor(() =>
      expect(mocked.listReportStates).toHaveBeenCalledWith(expect.objectContaining({ rumMin: 10 })),
    )
  })

  it('resets the filters', async () => {
    renderPage()
    await screen.findByText('envs/prod/app.tfstate')
    const search = screen.getByLabelText(i18n.t('pages.reports.searchKey') as string) as HTMLInputElement
    fireEvent.change(search, { target: { value: 'xyz' } })
    expect(search.value).toBe('xyz')
    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.reports.reset') as string }))
    expect(search.value).toBe('')
  })
})
