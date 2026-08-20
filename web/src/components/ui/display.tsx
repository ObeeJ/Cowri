import type { ReactNode } from 'react'
import { cn } from '~/lib/cn'

// ── Badge ───────────────────────────────────────────────────────────────────

export type BadgeTone = 'neutral' | 'accent' | 'clay' | 'outline'

export type BadgeProps = {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-paper-sunken text-ink-muted border-rule',
  accent: 'bg-accent-tint text-accent border-accent-rule',
  clay: 'bg-clay-tint text-clay border-clay-rule',
  outline: 'bg-transparent text-ink-muted border-rule-strong',
}

/**
 * A small classifying label. Colour carries no meaning on its own, so the text
 * inside always says what it means.
 *
 * @example <Badge tone="accent">Admin</Badge>
 */
export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-pill)] border px-2 py-0.5',
        'text-xs font-medium tracking-[0.01em]',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

// ── Divider ─────────────────────────────────────────────────────────────────

export type DividerProps = {
  orientation?: 'horizontal' | 'vertical'
  /** Centres a caption in the rule. Horizontal only. */
  label?: string
  className?: string
}

/** @example <Divider label="or" /> */
export function Divider({ orientation = 'horizontal', label, className }: DividerProps) {
  if (orientation === 'vertical') {
    return <span role="separator" aria-orientation="vertical" className={cn('w-px self-stretch bg-rule', className)} />
  }
  if (!label) {
    return <hr className={cn('border-0 border-t border-rule', className)} />
  }
  return (
    <div className={cn('flex items-center gap-3', className)} role="separator">
      <span className="h-px flex-1 bg-rule" />
      <span className="label-caps">{label}</span>
      <span className="h-px flex-1 bg-rule" />
    </div>
  )
}

// ── Avatar ──────────────────────────────────────────────────────────────────

export type AvatarProps = {
  /** Used for the initials and the accessible name. */
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

/**
 * Initials on a paper chip. No uploaded images anywhere in the product yet, so
 * there is no photo variant to fall back from.
 *
 * @example <Avatar name="Adaeze Nwosu" size="md" />
 */
export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const box = { sm: 'size-7 text-[0.6875rem]', md: 'size-9 text-xs', lg: 'size-12 text-sm' }[size]
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[var(--radius-pill)]',
        'border border-rule bg-paper-sunken font-semibold tracking-wide text-ink-muted',
        box,
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}

// ── Progress ────────────────────────────────────────────────────────────────

export type ProgressProps = {
  value: number
  max?: number
  /** Required. Describes what is progressing, e.g. "Cycle 3 of 8". */
  label: string
  /** Prints the label and a count above the track. */
  showLabel?: boolean
  className?: string
}

/**
 * A determinate progress track, ruled rather than rounded.
 *
 * @example <Progress value={3} max={8} label="Contributions this cycle" showLabel />
 */
export function Progress({ value, max = 100, label, showLabel = false, className }: ProgressProps) {
  const safeMax = max <= 0 ? 1 : max
  const clamped = Math.min(Math.max(value, 0), safeMax)
  const percent = (clamped / safeMax) * 100

  return (
    <div className={className}>
      {showLabel ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="label-caps">{label}</span>
          <span className="numeric text-xs text-ink-muted">
            {clamped} / {safeMax}
          </span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden border border-rule bg-paper-sunken"
      >
        <div
          className="h-full bg-accent transition-[width] duration-150 ease-[var(--ease-ui)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
