import { Icon, type IconName } from './Icon'

export function NavButton({
  active,
  icon,
  label,
  onClick,
  badge,
}: {
  active: boolean
  icon: IconName
  label: string
  onClick: () => void
  badge?: number
}) {
  const accessibleLabel = badge ? `${label}, ${badge} active` : label
  return (
    <button
      type="button"
      className={active ? 'nav-active' : ''}
      onClick={onClick}
      aria-pressed={active}
      aria-label={accessibleLabel}
      title={accessibleLabel}
    >
      <Icon name={icon} />
      <span className="nav-label">{label}</span>
      {badge ? (
        <span className="nav-badge" aria-hidden="true">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  )
}
