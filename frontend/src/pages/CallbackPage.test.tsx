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
  it('reloads at the root on success so the cookie session is re-resolved', () => {
    renderAt('')
    expect(replaceSpy).toHaveBeenCalledWith('/')
    expect(screen.getByText(i18n.t('auth.completingSignIn') as string)).toBeInTheDocument()
  })

  it('shows the IdP error instead of reloading', () => {
    renderAt('?error=access_denied&error_description=Consent%20required')
    expect(screen.getByText('Consent required')).toBeInTheDocument()
    expect(replaceSpy).not.toHaveBeenCalled()
  })

  it('falls back to the bare error code when no description is present', () => {
    renderAt('?error=access_denied')
    expect(screen.getByText('access_denied')).toBeInTheDocument()
  })
})
