import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import TableSkeleton from './TableSkeleton'
import CardGridSkeleton from './CardGridSkeleton'

describe('TableSkeleton', () => {
  it('renders the default 5x4 grid of placeholders', () => {
    const { container } = render(<TableSkeleton />)
    expect(screen.getByTestId('table-skeleton')).toHaveAttribute('aria-hidden', 'true')
    // header row + 5 body rows, 4 columns each
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(4 + 5 * 4)
  })

  it('honours custom dimensions', () => {
    const { container } = render(<TableSkeleton rows={2} columns={3} />)
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(3 + 2 * 3)
  })
})

describe('CardGridSkeleton', () => {
  it('renders the default card count', () => {
    const { container } = render(<CardGridSkeleton />)
    expect(screen.getByTestId('card-grid-skeleton')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll('.MuiCard-root')).toHaveLength(6)
  })

  it('honours a custom count', () => {
    const { container } = render(<CardGridSkeleton count={3} />)
    expect(container.querySelectorAll('.MuiCard-root')).toHaveLength(3)
  })
})
