import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ConfirmDialog from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders title, description, and severity icon', () => {
    render(<ConfirmDialog open onClose={() => {}} title="Delete source" description="This cannot be undone." severity="error" />)
    expect(screen.getByText('Delete source')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
    expect(screen.getByTestId('confirm-dialog-icon-error')).toBeInTheDocument()
  })

  it('defaults to the info severity icon', () => {
    render(<ConfirmDialog open onClose={() => {}} title="Heads up" />)
    expect(screen.getByTestId('confirm-dialog-icon-info')).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    render(<ConfirmDialog open={false} onClose={() => {}} title="Hidden" />)
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
  })

  it('runs onConfirm from the confirm button', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<ConfirmDialog open onClose={() => {}} onConfirm={onConfirm} title="Go?" confirmLabel="Go" />)
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
  })

  it('disables confirm until the type-to-confirm text matches exactly', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog open onClose={() => {}} onConfirm={onConfirm} title="Decommission" typeToConfirmText="prod.tfstate" />,
    )
    const confirm = screen.getByTestId('confirm-dialog-confirm')
    expect(confirm).toBeDisabled()

    const input = screen.getByTestId('confirm-dialog-type-input')
    fireEvent.change(input, { target: { value: 'PROD.tfstate' } })
    expect(confirm).toBeDisabled()
    expect(screen.getByText(/does not match/i)).toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'prod.tfstate' } })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    await waitFor(() => expect(onConfirm).toHaveBeenCalled())
  })

  it('collects field values and passes them to onSubmit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <ConfirmDialog
        open
        onClose={() => {}}
        onSubmit={onSubmit}
        title="New org"
        fields={[
          { id: 'name', label: 'Name', required: true },
          { id: 'note', label: 'Note', initialValue: 'hi' },
        ]}
      />,
    )
    const confirm = screen.getByTestId('confirm-dialog-confirm')
    expect(confirm).toBeDisabled() // required field empty

    fireEvent.change(screen.getByTestId('confirm-dialog-field-name'), { target: { value: 'engineering' } })
    expect(confirm).toBeEnabled()

    fireEvent.click(confirm)
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'engineering', note: 'hi' }))
  })

  it('surfaces a rejection from onConfirm as an inline error', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('lock held by another writer'))
    render(<ConfirmDialog open onClose={() => {}} onConfirm={onConfirm} title="Edit state" />)
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'))
    await waitFor(() => expect(screen.getByTestId('confirm-dialog-error')).toHaveTextContent('lock held by another writer'))
  })

  it('cancel calls onClose, but not while loading', () => {
    const onClose = vi.fn()
    const { rerender } = render(<ConfirmDialog open onClose={onClose} title="T" cancelLabel="Back" />)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(<ConfirmDialog open onClose={onClose} title="T" cancelLabel="Back" loading />)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onClose).toHaveBeenCalledTimes(1) // unchanged — close is blocked while busy
  })
})
