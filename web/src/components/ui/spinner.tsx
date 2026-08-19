import { cn } from '~/lib/cn'

export type SpinnerProps = {
  size?: number
  className?: string
  /** Announced to screen readers. Omit inside a button that is already busy. */
  label?: string
}

/**
 * An indeterminate progress mark: a ring with one open quadrant.
 *
 * @example <Spinner size={20} label="Loading transactions" />
 */
export function Spinner({ size = 16, className, label }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-flex shrink-0', className)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ animation: 'cowri-spin 750ms linear infinite' }}
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
