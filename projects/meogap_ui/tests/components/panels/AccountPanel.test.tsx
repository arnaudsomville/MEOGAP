import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AccountPanel } from '../../../src/components/panels/AccountPanel'

function renderPanel(overrides: Partial<Parameters<typeof AccountPanel>[0]> = {}) {
  const props: Parameters<typeof AccountPanel>[0] = {
    onClose: vi.fn(),
    sessionActive: true,
    account: { userId: 'demo-user', displayName: 'Demo user', sessionStatus: 'AUTHENTICATED' },
    creditBalance: { balance: 12, unit: 'credits' },
    loadingBalance: false,
    onSignIn: vi.fn(),
    onSignOut: vi.fn(),
    onRefreshBalance: vi.fn(),
    ...overrides,
  }
  const view = render(<AccountPanel {...props} />)
  return { ...view, ...props }
}

describe('AccountPanel', () => {
  it('renders the signed-in balance and actions', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const panel = renderPanel()
    expect(screen.getByText('Demo user')).toBeInTheDocument()
    expect(screen.getByText('12 credits')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Refresh balance' }))
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(panel.onRefreshBalance).toHaveBeenCalled()
    expect(panel.onSignOut).toHaveBeenCalled()
  })

  it('renders loading and unavailable balance states', { tags: ['unit'] }, () => {
    const loading = renderPanel({ loadingBalance: true })
    expect(screen.getByText('Loading credit balance…')).toBeInTheDocument()
    loading.unmount()
    renderPanel({ creditBalance: null })
    expect(screen.getByText('Credit balance is unavailable.')).toBeInTheDocument()
  })

  it('renders the signed-out state and signs in', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const panel = renderPanel({ sessionActive: false, account: null, creditBalance: null })
    expect(screen.getByText('Signed out')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign in as demo user' }))
    expect(panel.onSignIn).toHaveBeenCalled()
  })
})
