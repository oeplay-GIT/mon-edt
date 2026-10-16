import type { ReactNode } from 'react'

type SvgProps = { className?: string; children: ReactNode }

function Svg({ className = 'h-6 w-6', children }: SvgProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function CalendarTabIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </Svg>
  )
}

export function BookTabIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M12 6.5C10.4 5.3 8.2 4.8 5.5 5v12.5c2.7-.2 4.9.3 6.5 1.5 1.6-1.2 3.8-1.7 6.5-1.5V5c-2.7-.2-4.9.3-6.5 1.5Z" />
      <path d="M12 6.5V19" />
    </Svg>
  )
}

export function CloseIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  )
}

export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  )
}

const ROTATION = { right: 0, down: 90, left: 180, up: 270 } as const

export function ChevronIcon({
  dir = 'right',
  className = 'h-5 w-5',
}: {
  dir?: keyof typeof ROTATION
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} transition-transform duration-200`}
      style={{ transform: `rotate(${ROTATION[dir]}deg)` }}
      aria-hidden="true"
    >
      <path d="m9.5 6 6 6-6 6" />
    </svg>
  )
}
