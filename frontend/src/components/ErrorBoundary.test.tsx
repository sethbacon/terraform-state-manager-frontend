import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'
import * as errorReporting from '../services/errorReporting'
import i18n from '../i18n'

function Boom({ explode }: { explode: boolean }) {
  if (explode) throw new Error('render exploded')
  return <div>healthy child</div>
}

beforeEach(() => {
  // Silence React's console noise for caught render errors.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Boom explode={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('healthy child')).toBeInTheDocument()
  })

  it('catches render errors, reports them with a correlation id, and hides the raw message', () => {
    const capture = vi.spyOn(errorReporting, 'captureError')
    render(
      <ErrorBoundary>
        <Boom explode />
      </ErrorBoundary>,
    )
    expect(screen.getByText(i18n.t('errorBoundary.title') as string)).toBeInTheDocument()
    // The raw Error.message must NOT be disclosed in the UI (#234, CWE-209)...
    expect(screen.queryByText('render exploded')).not.toBeInTheDocument()
    // ...a correlation reference is shown instead...
    expect(screen.getByText(/Reference:/)).toBeInTheDocument()
    // ...and the raw error is captured for developers with that id.
    expect(capture).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ errorId: expect.any(String), componentStack: expect.anything() }),
    )
  })

  it('renders a custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Boom explode />
      </ErrorBoundary>,
    )
    expect(screen.getByText('custom fallback')).toBeInTheDocument()
  })

  it('try again resets the boundary', () => {
    let explode = true
    function Flaky() {
      if (explode) throw new Error('flaky')
      return <div>recovered</div>
    }
    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    )
    expect(screen.getByText(i18n.t('errorBoundary.title') as string)).toBeInTheDocument()

    explode = false
    fireEvent.click(screen.getByRole('button', { name: i18n.t('errorBoundary.tryAgain') as string }))
    expect(screen.getByText('recovered')).toBeInTheDocument()
  })
})
