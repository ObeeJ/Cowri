import { cn } from '~/lib/cn'

export type SkeletonProps = {
  /** Any CSS width. Vary widths across a group so it reads as text, not bars. */
  width?: string | number
  height?: string | number
  /** `text` gets a small radius, `block` matches a panel, `pill` is round. */
  shape?: 'text' | 'block' | 'pill'
  className?: string
}

/**
 * A placeholder for content that is still loading.
 *
 * Skeletons must match the shape of what replaces them, otherwise the page
 * jumps when data lands. Wrap a group in `<SkeletonGroup>` so the whole region
 * is announced once rather than one line at a time.
 *
 * @example
 * <SkeletonGroup label="Loading balance">
 *   <Skeleton width="9rem" height="2.25rem" />
 * </SkeletonGroup>
 */
export function Skeleton({ width, height = '1rem', shape = 'text', className }: SkeletonProps) {
  const radius = {
    text: 'rounded-[3px]',
    block: 'rounded-[var(--radius-panel)]',
    pill: 'rounded-[var(--radius-pill)]',
  }[shape]

  return (
    <span
      aria-hidden="true"
      className={cn('skeleton block', radius, className)}
      style={{ width, height }}
    />
  )
}

export function SkeletonGroup({
  label = 'Loading',
  children,
  className,
}: {
  label?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}
