import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import PageHeader from './PageHeader'

describe('PageHeader', () => {
  it('renders the title as the page h1', () => {
    render(<PageHeader title="State Sources" />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('State Sources')
  })

  it('renders an optional description', () => {
    render(<PageHeader title="T" description="Browse and manage state" />)
    expect(screen.getByText('Browse and manage state')).toBeInTheDocument()
  })

  it('renders right-aligned actions when provided', () => {
    render(<PageHeader title="T" actions={<button>New source</button>} />)
    expect(screen.getByRole('button', { name: 'New source' })).toBeInTheDocument()
  })

  it('renders an optional leading icon beside the title', () => {
    render(<PageHeader title="State Sources" icon={<svg data-testid="page-icon" />} />)
    expect(screen.getByTestId('page-icon')).toBeInTheDocument()
  })

  it('omits the description node when not provided', () => {
    render(<PageHeader title="T" />)
    expect(screen.queryByText('Browse and manage state')).not.toBeInTheDocument()
  })
})
