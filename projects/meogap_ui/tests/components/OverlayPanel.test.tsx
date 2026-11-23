import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OverlayPanel } from '../../src/components/OverlayPanel'

describe('OverlayPanel', () => {
  it('focuses close control and closes on the close button', { tags: ['unit'] }, async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <OverlayPanel title="Catalogue" onClose={onClose}>
        Panel content
      </OverlayPanel>,
    )

    const close = screen.getByRole('button', { name: 'Close Catalogue' })
    expect(close).toHaveFocus()
    await user.click(close)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
