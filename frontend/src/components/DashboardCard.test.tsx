import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardCard from './DashboardCard'

describe('DashboardCard', () => {
  it('renders the label and value', () => {
    render(<DashboardCard label="RUM" value={18} />)
    expect(screen.getByText('RUM')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
  })

  it('becomes a link when given a route', () => {
    render(
      <MemoryRouter>
        <DashboardCard label="Sources" value={3} to="/sources" />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/sources')
  })

  it('is not clickable without a route', () => {
    render(<DashboardCard label="Sources" value={3} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
