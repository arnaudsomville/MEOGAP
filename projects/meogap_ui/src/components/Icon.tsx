import type { ReactNode } from 'react'

export type IconName =
  | 'compass'
  | 'clipboard'
  | 'activity'
  | 'user'
  | 'layers'
  | 'pencil'
  | 'undo'
  | 'rotate'
  | 'close'
  | 'chevron-up'
  | 'chevron-down'
  | 'image'
  | 'search'
  | 'trash'
  | 'check'
  | 'alert'
  | 'info'
  | 'download'
  | 'refresh'
  | 'plus'
  | 'map-pin'
  | 'credit-card'

const PATHS: Record<IconName, ReactNode> = {
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.1 5.4-5.4 2.1 2.1-5.4z" />
    </>
  ),
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4.5V3h6v1.5M9 9h6M9 13h6M9 17h4" />
    </>
  ),
  activity: <path d="M3 12h4l2.5-7 4 14 2.5-7h5" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  layers: <path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />,
  pencil: (
    <>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z" />
      <path d="m14.5 6.5 3 3" />
    </>
  ),
  undo: <path d="M9 7 4 12l5 5M4 12h9a6 6 0 0 1 6 6v1" />,
  rotate: <path d="M3 4v5h5M3.5 9a9 9 0 1 1 1.3 7.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  'chevron-up': <path d="m6 15 6-6 6 6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="9.5" r="1.6" />
      <path d="m4 17 5-4 4 3 3-2 4 3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />,
  check: <path d="m5 13 4 4L19 7" />,
  alert: (
    <>
      <path d="M12 3 2.5 20h19z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </>
  ),
  download: <path d="M12 3v12M7 11l5 5 5-5M4 20h16" />,
  refresh: <path d="M20 5v5h-5M20.5 10a9 9 0 1 0-1.3 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  'map-pin': (
    <>
      <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  'credit-card': (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19" />
      <path d="M6.5 14.5h4" />
    </>
  ),
}

type IconProps = {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 18, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {PATHS[name]}
    </svg>
  )
}
