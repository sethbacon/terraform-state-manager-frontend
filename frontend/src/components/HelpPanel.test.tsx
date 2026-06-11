import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HelpPanel from './HelpPanel'
import { HelpProvider } from '../contexts/HelpContext'
import i18n from '../i18n'

function renderAt(path: string) {
  localStorage.setItem('tsm-help-panel-open', 'true')
  return render(
    <MemoryRouter initialEntries={[path]}>
      <HelpProvider>
        <HelpPanel />
      </HelpProvider>
    </MemoryRouter>,
  )
}

describe('HelpPanel', () => {
  it('shows route-specific help for the dashboard', () => {
    renderAt('/')
    expect(screen.getByText(i18n.t('help.pages.dashboard.title'))).toBeInTheDocument()
  })

  it('covers every routed page with a real help entry', () => {
    for (const path of ['/sources', '/drift', '/version-lab', '/schedules', '/reports', '/transfer', '/api-docs', '/admin', '/admin/users', '/admin/organizations', '/admin/roles', '/admin/oidc', '/admin/mtls', '/admin/sso', '/admin/notifications', '/admin/audit-logs']) {
      const { unmount } = renderAt(path)
      const titles = screen.getAllByRole('heading')
      // The title must resolve to a real string, not a raw i18n key.
      expect(titles[0].textContent, path).not.toMatch(/^help\.pages\./)
      unmount()
    }
  })

  it('renders structured sections when the route provides them', () => {
    renderAt('/drift')
    const sections = i18n.t('help.pages.drift.sections', { returnObjects: true }) as { h: string; p: string }[]
    expect(Array.isArray(sections) && sections.length).toBeTruthy()
    expect(screen.getByText(sections[0].h)).toBeInTheDocument()
  })

  it('falls back to the generic help text on unknown routes', () => {
    renderAt('/nowhere')
    expect(screen.getByText(i18n.t('help.title'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('help.none'))).toBeInTheDocument()
  })

  it('close button persists the closed preference', () => {
    renderAt('/')
    fireEvent.click(screen.getByRole('button', { name: i18n.t('help.close') as string }))
    expect(localStorage.getItem('tsm-help-panel-open')).toBe('false')
  })
})
