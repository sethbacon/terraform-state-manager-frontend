import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CallbackPage from './CallbackPage'
import i18n from '../i18n'

function renderAt(query: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/callback${query}`]}>
      <CallbackPage />
    </MemoryRouter>,
  )
}

let replaceSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  replaceSpy = vi.fn()
  Object.defineProperty(window.location, 'replace', { value: replaceSpy, configurable: true })
})

describe('CallbackPage', () => {
  it('reloads at the dashboard on success so the cookie session is re-resolved', () => {
    renderAt('')
    expect(replaceSpy).toHaveBeenCalledWith('/admin')
    expect(screen.getByText(i18n.t('auth.completingSignIn') as string)).toBeInTheDocument()
  })

  it('shows an app-authored message and the whitelisted code, never the raw description', () => {
    renderAt('?error=access_denied&error_description=Consent%20required')
    expect(screen.getByText(/Sign-in failed/i)).toBeInTheDocument()
    // The constrained OIDC code is surfaced...
    expect(screen.getByText(/access_denied/)).toBeInTheDocument()
    // ...but the attacker-controllable free-text description is never rendered.
    expect(screen.queryByText(/Consent required/)).not.toBeInTheDocument()
    expect(replaceSpy).not.toHaveBeenCalled()
  })

  it('never reflects a script-shaped error_description (content-spoofing/XSS guard, #222/#227)', () => {
    const payload = '<img src=x onerror=alert(1)>'
    renderAt(`?error_description=${encodeURIComponent(payload)}`)
    expect(screen.getByText(/Sign-in failed/i)).toBeInTheDocument()
    expect(screen.queryByText(payload)).not.toBeInTheDocument()
    expect(document.body.innerHTML).not.toContain('onerror=alert')
    expect(replaceSpy).not.toHaveBeenCalled()
  })

  it('surfaces only whitelisted OIDC codes — an unknown code shows just the generic message', () => {
    renderAt('?error=totally_made_up_code')
    expect(screen.getByText(/Sign-in failed/i)).toBeInTheDocument()
    expect(screen.queryByText(/totally_made_up_code/)).not.toBeInTheDocument()
    expect(replaceSpy).not.toHaveBeenCalled()
  })
})
