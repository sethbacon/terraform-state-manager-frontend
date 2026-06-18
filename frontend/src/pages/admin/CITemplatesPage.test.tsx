import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CITemplatesPage from './CITemplatesPage'
import { api } from '../../services/api'
import '../../i18n'

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>()
  return {
    ...actual,
    api: {
      listCITemplates: vi.fn(),
      createCITemplate: vi.fn(),
      updateCITemplate: vi.fn(),
      deleteCITemplate: vi.fn(),
    },
  }
})

const mocked = vi.mocked(api)

const templates = [
  {
    id: 't1',
    provider: 'azure_devops',
    kind: 'drift',
    profile: 'default',
    name: 'Azure Drift (built-in)',
    description: '',
    content: 'trigger: none',
    is_builtin: true,
    created_at: '2026-06-18',
    updated_at: '2026-06-18',
  },
  {
    id: 't2',
    provider: 'azure_devops',
    kind: 'drift',
    profile: 'brunswick-azure',
    name: 'Brunswick Azure',
    description: 'per-app',
    content: 'pool:\n  vmImage: windows-latest',
    is_builtin: false,
    created_at: '2026-06-18',
    updated_at: '2026-06-18',
  },
]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <CITemplatesPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.listCITemplates.mockResolvedValue(templates)
})

describe('CITemplatesPage', () => {
  it('lists templates, flags built-ins, and disables their delete', async () => {
    renderPage()
    expect(await screen.findByText('brunswick-azure')).toBeInTheDocument()
    expect(screen.getByText('Brunswick Azure')).toBeInTheDocument()
    // The built-in row shows a chip and its delete button is disabled.
    expect(screen.getByText('built-in')).toBeInTheDocument()
    const deletes = screen.getAllByRole('button', { name: 'Delete template' })
    expect(deletes.some((b) => (b as HTMLButtonElement).disabled)).toBe(true)
    expect(deletes.some((b) => !(b as HTMLButtonElement).disabled)).toBe(true)
  })

  it('creates a new template', async () => {
    mocked.createCITemplate.mockResolvedValue(templates[1])
    renderPage()
    await screen.findByText('brunswick-azure')

    fireEvent.click(screen.getByText('Add template'))
    fireEvent.change(screen.getByRole('textbox', { name: /Profile/i }), { target: { value: 'brunswick-oci' } })
    fireEvent.change(screen.getByRole('textbox', { name: /^Name/i }), { target: { value: 'Brunswick OCI' } })
    fireEvent.change(screen.getByRole('textbox', { name: /Template/i }), {
      target: { value: 'pool:\n  vmImage: ubuntu-latest' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(mocked.createCITemplate).toHaveBeenCalledTimes(1))
    expect(mocked.createCITemplate).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'azure_devops', kind: 'drift', profile: 'brunswick-oci', name: 'Brunswick OCI' }),
    )
  })

  it('deletes a non-built-in template after confirmation', async () => {
    mocked.deleteCITemplate.mockResolvedValue(undefined)
    renderPage()
    await screen.findByText('brunswick-azure')

    // The non-built-in row's delete button is enabled; click it to confirm.
    const row = screen.getByText('brunswick-azure').closest('tr') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: 'Delete template' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mocked.deleteCITemplate).toHaveBeenCalledWith('t2'))
  })
})
