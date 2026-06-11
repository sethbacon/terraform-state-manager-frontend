import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PlaceholderPage from './PlaceholderPage'
import RouteFocusManager from './RouteFocusManager'
import { AnnouncerProvider } from '../contexts/AnnouncerContext'

describe('PlaceholderPage', () => {
  it('renders the title, phase chip, and description', () => {
    render(<PlaceholderPage title="Future Thing" phase="Phase 9" description="Coming soon" />)
    expect(screen.getByText('Future Thing')).toBeInTheDocument()
    expect(screen.getByText('Phase 9')).toBeInTheDocument()
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
    expect(screen.getByText(/implemented in Phase 9/)).toBeInTheDocument()
  })

  it('falls back to a generic phase note', () => {
    render(<PlaceholderPage title="Bare" />)
    expect(screen.getByText(/a later phase/)).toBeInTheDocument()
  })
})

describe('RouteFocusManager', () => {
  it('renders nothing while wiring the route-focus hook', () => {
    const { container } = render(
      <MemoryRouter>
        <AnnouncerProvider>
          <RouteFocusManager />
        </AnnouncerProvider>
      </MemoryRouter>,
    )
    expect(container.querySelector('[role="status"]')).toBeInTheDocument() // announcer regions only
  })
})
