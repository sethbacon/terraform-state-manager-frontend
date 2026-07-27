/**
 * CommandPalette scope-filter coverage (#238): the palette hides nav items the
 * user lacks the scope for and always shows null-scope items, mirroring the
 * negative scope-gating tests already present for DriftPage / DriftRecordsSection.
 * The filter is UI-visibility only — the backend independently enforces access.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CommandPalette from './CommandPalette'
import { useAuth } from '../contexts/AuthContext'
import i18n from '../i18n'

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const mockedUseAuth = vi.mocked(useAuth)
type AuthShape = ReturnType<typeof useAuth>

function renderPalette() {
  return render(
    <MemoryRouter>
      <CommandPalette open onClose={() => {}} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CommandPalette scope filtering', () => {
  it('hides a scoped item the user lacks the scope for, keeps null-scope items', () => {
    mockedUseAuth.mockReturnValue({ hasScope: (s: string) => s !== 'admin' } as unknown as AuthShape)
    renderPalette()
    // Admin-scoped nav item is filtered out of the palette entirely.
    expect(screen.queryByText(i18n.t('nav.admin.organizations') as string)).not.toBeInTheDocument()
    // A null-scope item (API docs) is always available.
    expect(screen.getByText(i18n.t('nav.apiDocs') as string)).toBeInTheDocument()
    // A held-scope item (state:read → Sources) is shown.
    expect(screen.getByText(i18n.t('nav.sources') as string)).toBeInTheDocument()
  })

  it('shows a scoped item when the user holds the scope', () => {
    mockedUseAuth.mockReturnValue({ hasScope: () => true } as unknown as AuthShape)
    renderPalette()
    expect(screen.getByText(i18n.t('nav.admin.organizations') as string)).toBeInTheDocument()
  })

  it('shows only null-scope items for a user with no scopes', () => {
    mockedUseAuth.mockReturnValue({ hasScope: () => false } as unknown as AuthShape)
    renderPalette()
    // state:read item hidden…
    expect(screen.queryByText(i18n.t('nav.sources') as string)).not.toBeInTheDocument()
    // …but the always-visible Home (null scope) remains.
    expect(screen.getByText(i18n.t('nav.dashboard') as string)).toBeInTheDocument()
  })
})
