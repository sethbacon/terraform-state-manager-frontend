import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TransferPage from './TransferPage'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import i18n from '../i18n'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>()
  return {
    ...actual,
    api: {
      listSources: vi.fn(),
      listStates: vi.fn(),
      backupToSource: vi.fn(),
      migrateToSource: vi.fn(),
    },
  }
})
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockedApi = vi.mocked(api)
const mockedUseAuth = vi.mocked(useAuth)
type AuthShape = ReturnType<typeof useAuth>

const sources = [
  { id: 's1', name: 'demo-local', type: 'local' },
  { id: 's2', name: 'archive', type: 's3' },
]
const states = [
  { key: 'ws-abc123', name: 'prod-network' },
  { key: 'app.tfstate', name: 'app.tfstate' },
]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TransferPage />
    </QueryClientProvider>,
  )
}

async function pickMuiOption(label: string, optionText: RegExp | string) {
  fireEvent.mouseDown(screen.getByLabelText(new RegExp(label)))
  // findByRole retries until the query data populates the open menu.
  fireEvent.click(await screen.findByRole('option', { name: optionText }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuth.mockReturnValue({ hasScope: () => true } as unknown as AuthShape)
  mockedApi.listSources.mockResolvedValue(sources as Awaited<ReturnType<typeof api.listSources>>)
  mockedApi.listStates.mockResolvedValue(states as Awaited<ReturnType<typeof api.listStates>>)
})

describe('TransferPage', () => {
  it('warns when the user lacks the transfer scope', async () => {
    mockedUseAuth.mockReturnValue({ hasScope: () => false } as unknown as AuthShape)
    renderPage()
    expect(await screen.findByText(i18n.t('pages.transfer.needScope') as string)).toBeInTheDocument()
  })

  it('defaults the destination key to the friendly state name with .tfstate appended', async () => {
    renderPage()
    await waitFor(() => expect(mockedApi.listSources).toHaveBeenCalled())

    await pickMuiOption(i18n.t('pages.transfer.source') as string, /demo-local/)
    await waitFor(() => expect(mockedApi.listStates).toHaveBeenCalledWith('s1'))

    // Pick the HCP-style state whose key is an opaque workspace id.
    const stateBox = screen.getByLabelText(new RegExp(i18n.t('pages.transfer.stateFile') as string))
    fireEvent.mouseDown(stateBox)
    fireEvent.click(await screen.findByText('prod-network'))

    const targetKey = screen.getByLabelText(new RegExp(i18n.t('pages.transfer.targetKey') as string))
    expect(targetKey).toHaveValue('prod-network.tfstate')
  })

  it('runs a backup transfer and shows the verified result', async () => {
    mockedApi.backupToSource.mockResolvedValue({
      mode: 'backup',
      status: 'success',
      verified: true,
    } as Awaited<ReturnType<typeof api.backupToSource>>)

    renderPage()
    await waitFor(() => expect(mockedApi.listSources).toHaveBeenCalled())

    await pickMuiOption(i18n.t('pages.transfer.source') as string, /demo-local/)
    await waitFor(() => expect(mockedApi.listStates).toHaveBeenCalled())

    const stateBox = screen.getByLabelText(new RegExp(i18n.t('pages.transfer.stateFile') as string))
    fireEvent.mouseDown(stateBox)
    fireEvent.click(await screen.findByText('app.tfstate'))

    await pickMuiOption(i18n.t('pages.transfer.targetSource') as string, /archive/)

    fireEvent.click(screen.getByRole('button', { name: i18n.t('pages.transfer.runBackup') as string }))

    await waitFor(() =>
      expect(mockedApi.backupToSource).toHaveBeenCalledWith('s1', 'app.tfstate', 's2', 'app.tfstate'),
    )
    expect(
      await screen.findByRole('button', { name: i18n.t('pages.transfer.newTransfer') as string }),
    ).toBeInTheDocument()
    expect(screen.getByText(/success/)).toBeInTheDocument()
  })

  it('blocks decommission until the exact state key is typed', async () => {
    renderPage()
    await waitFor(() => expect(mockedApi.listSources).toHaveBeenCalled())

    await pickMuiOption(i18n.t('pages.transfer.source') as string, /demo-local/)
    await waitFor(() => expect(mockedApi.listStates).toHaveBeenCalled())

    const stateBox = screen.getByLabelText(new RegExp(i18n.t('pages.transfer.stateFile') as string))
    fireEvent.mouseDown(stateBox)
    fireEvent.click(await screen.findByText('app.tfstate'))

    await pickMuiOption(i18n.t('pages.transfer.mode') as string, i18n.t('pages.transfer.modeMigrate') as string)
    await pickMuiOption(i18n.t('pages.transfer.targetSource') as string, /archive/)

    // The labels contain regex metacharacters — match by checkbox/textbox role instead.
    fireEvent.click(screen.getByRole('checkbox'))

    const runBtn = screen.getByRole('button', { name: i18n.t('pages.transfer.runMigrateDecommission') as string })
    expect(runBtn).toBeDisabled()

    const confirmInput = screen.getByPlaceholderText('app.tfstate')
    fireEvent.change(confirmInput, { target: { value: 'app.tfstate' } })
    expect(runBtn).toBeEnabled()
  })

  it('warns when source and destination are identical', async () => {
    renderPage()
    await waitFor(() => expect(mockedApi.listSources).toHaveBeenCalled())

    await pickMuiOption(i18n.t('pages.transfer.source') as string, /demo-local/)
    await waitFor(() => expect(mockedApi.listStates).toHaveBeenCalled())

    const stateBox = screen.getByLabelText(new RegExp(i18n.t('pages.transfer.stateFile') as string))
    fireEvent.mouseDown(stateBox)
    fireEvent.click(await screen.findByText('app.tfstate'))

    await pickMuiOption(i18n.t('pages.transfer.targetSource') as string, /demo-local/)
    fireEvent.change(screen.getByLabelText(new RegExp(i18n.t('pages.transfer.targetKey') as string)), {
      target: { value: 'app.tfstate' },
    })

    expect(await screen.findByText(i18n.t('pages.transfer.sameTarget') as string)).toBeInTheDocument()
  })
})
