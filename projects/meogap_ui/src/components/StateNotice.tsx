import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export function StateNotice({
  icon,
  children,
  tone = 'muted',
}: {
  icon: IconName
  children: ReactNode
  tone?: 'muted' | 'error'
}) {
  return (
    <div
      className={`state-notice state-notice-${tone}`}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  )
}
