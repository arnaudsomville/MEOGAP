import { useId } from 'react'

type LogoProps = {
  size?: number
  className?: string
}

export function Logo({ size = 38, className }: LogoProps) {
  const gradientId = useId()

  return (
    <svg
      aria-hidden="true"
      className={className ? `brand-symbol ${className}` : 'brand-symbol'}
      height={size}
      viewBox="0 0 40 40"
      width={size}
    >
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={gradientId}
          x1="5"
          x2="35"
          y1="2"
          y2="38"
        >
          <stop stopColor="#6ef2e0" />
          <stop offset="0.55" stopColor="#26b8b0" />
          <stop offset="1" stopColor="#79b77a" />
        </linearGradient>
      </defs>
      <rect fill={`url(#${gradientId})`} height="40" rx="11" width="40" />
      <circle
        cx="20"
        cy="21.5"
        fill="#05252c"
        fillOpacity="0.34"
        r="9.1"
        stroke="#05252c"
        strokeOpacity="0.55"
        strokeWidth="1.3"
      />
      <path
        d="M10.9 21.5h18.2M20 12.4c4.3 4.4 4.3 13.8 0 18.2M20 12.4c-4.3 4.4-4.3 13.8 0 18.2"
        fill="none"
        stroke="#eafffb"
        strokeOpacity="0.82"
        strokeWidth="1.1"
      />
      <path
        d="M11.9 17.2c2.5 1.2 5 1.8 7.5 1.8 1.9 0 3.6-.4 5.3-1.1-1.4-2.5-3.9-4.1-6.8-4.1-2.6 0-4.8 1.2-6 3.4Z"
        fill="#083b26"
        fillOpacity="0.62"
      />
      <circle cx="30.6" cy="10.4" fill="#f3fffc" r="2.2" />
      <path d="m28.9 12 3.6-3.6" stroke="#f3fffc" strokeOpacity="0.85" strokeWidth="1.2" />
      <path
        d="M22.6 9.1c3.3-.8 6.1.1 7.8 2.1"
        fill="none"
        stroke="#eafffb"
        strokeOpacity="0.55"
        strokeWidth="1"
      />
    </svg>
  )
}
