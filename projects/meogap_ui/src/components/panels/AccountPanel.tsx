import type { Account, CreditBalance } from '../../api/client'
import { Icon } from '../Icon'
import { OverlayPanel } from '../OverlayPanel'
import { StateNotice } from '../StateNotice'

type AccountPanelProps = {
  onClose: () => void
  sessionActive: boolean
  account: Account | null
  creditBalance: CreditBalance | null
  loadingBalance: boolean
  onSignIn: () => void
  onSignOut: () => void
  onRefreshBalance: () => void
}

export function AccountPanel({
  onClose,
  sessionActive,
  account,
  creditBalance,
  loadingBalance,
  onSignIn,
  onSignOut,
  onRefreshBalance,
}: AccountPanelProps) {
  return (
    <OverlayPanel title="Account and credits" icon={<Icon name="user" />} onClose={onClose}>
      <p className="panel-intro">
        Identity and credit balances are supplied by the server. This demonstration does not
        implement production authentication.
      </p>
      {!sessionActive ? (
        <div className="empty-state">
          <h3>Signed out</h3>
          <p>Requests, AOIs and results are hidden until a demo session is resumed.</p>
          <button type="button" className="button button-primary" onClick={onSignIn}>
            Sign in as demo user
          </button>
        </div>
      ) : (
        <>
          <div className="credit-card">
            <span>Signed in as</span>
            <strong>{account?.displayName ?? 'Demo account'}</strong>
            {account ? <span>User {account.userId}</span> : null}
          </div>
          {loadingBalance ? (
            <StateNotice icon="refresh">Loading credit balance…</StateNotice>
          ) : null}
          {!loadingBalance && creditBalance ? (
            <div className="credit-card">
              <span>Available balance</span>
              <strong>
                {creditBalance.balance} {creditBalance.unit ?? 'credits'}
              </strong>
            </div>
          ) : null}
          {!loadingBalance && !creditBalance ? (
            <StateNotice icon="info">Credit balance is unavailable.</StateNotice>
          ) : null}
          <div className="inline-actions">
            <button type="button" className="button button-secondary" onClick={onRefreshBalance}>
              <Icon name="refresh" />
              Refresh balance
            </button>
            <button type="button" className="button button-danger" onClick={onSignOut}>
              <Icon name="close" />
              Sign out
            </button>
          </div>
        </>
      )}
    </OverlayPanel>
  )
}
