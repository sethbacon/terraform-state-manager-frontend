import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Link, Route, Routes } from 'react-router-dom'
import { useRouteFocus } from './useRouteFocus'
import { AnnouncerProvider } from '../contexts/AnnouncerContext'

function Page({ title }: { title: string }) {
  useRouteFocus()
  return (
    <div>
      <h1>{title}</h1>
      <Link to="/other">go</Link>
    </div>
  )
}

function App() {
  return (
    <AnnouncerProvider>
      <Routes>
        <Route path="/" element={<Page title="Home" />} />
        <Route path="/other" element={<Page title="Other" />} />
      </Routes>
    </AnnouncerProvider>
  )
}

describe('useRouteFocus', () => {
  it('does not steal focus on first render', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    await act(() => new Promise((r) => setTimeout(r, 150)))
    expect(document.activeElement?.tagName).not.toBe('H1')
  })

  it('moves focus to the new page heading and announces the navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByText('go'))

    await waitFor(() => {
      const heading = screen.getByRole('heading', { name: 'Other' })
      expect(heading).toHaveFocus()
      expect(heading).toHaveAttribute('tabindex', '-1')
    })
  })
})
