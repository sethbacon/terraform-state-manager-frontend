import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import SearchOffIcon from '@mui/icons-material/SearchOff'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(<EmptyState title="No states yet" description="Add a source to begin" />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('No states yet')).toBeInTheDocument()
    expect(screen.getByText('Add a source to begin')).toBeInTheDocument()
  })

  it('fires the primary and secondary actions', () => {
    const onPrimary = vi.fn()
    const onSecondary = vi.fn()
    render(
      <EmptyState
        title="Empty"
        primaryAction={{ label: 'Add source', onClick: onPrimary }}
        secondaryAction={{ label: 'Learn more', onClick: onSecondary }}
      />,
    )
    fireEvent.click(screen.getByTestId('empty-state-primary'))
    fireEvent.click(screen.getByTestId('empty-state-secondary'))
    expect(onPrimary).toHaveBeenCalledTimes(1)
    expect(onSecondary).toHaveBeenCalledTimes(1)
  })

  it('renders no buttons without actions', () => {
    render(<EmptyState title="Empty" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('accepts a custom icon and test id', () => {
    render(<EmptyState title="Empty" icon={<SearchOffIcon data-testid="custom-icon" />} data-testid="filters-empty" />)
    expect(screen.getByTestId('filters-empty')).toBeInTheDocument()
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })
})
