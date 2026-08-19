import type { ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { AlertIcon, RefreshIcon } from '~/components/icons'
import { errorMessage, ApiError, NetworkError } from '~/lib/api/client'
import { Button } from './button'

export type EmptyStateProps = {
  /** A drawn mark, not an emoji. */
  icon?: ReactNode
  title: string
  /** One or two sentences saying what to do next. */
  description?: string
  action?: ReactNode
  className?: string
}

/**
 * Shown when a surface loaded successfully and has nothing in it. Distinct from
 * ErrorState, which means the load itself failed.
 *
 * @example
 * <EmptyState
 *   icon={<CircleGroupIcon size={28} />}
 *   title="No savings circles yet"
 *   description="Start one and invite the people you already save with."
 *   action={<Button variant="primary" onClick={create}>Start a circle</Button>}
 * />
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 border border-dashed border-rule-strong',
        'rounded-[var(--radius-panel)] bg-paper px-5 py-8',
        className,
      )}
    >
      {icon ? <span className="text-ink-faint">{icon}</span> : null}
      <div>
        <h3 className="text-base text-ink">{title}</h3>
        {description ? (
          <p className="mt-1 max-w-prose text-sm leading-6 text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export type ErrorStateProps = {
  /** Whatever the query threw. Turned into a readable sentence. */
  error: unknown
  /** Wire this to the query's `refetch`. Omit only when a retry is impossible. */
  onRetry?: () => void
  /** Overrides the derived heading. */
  title?: string
  className?: string
}

function headingFor(error: unknown): string {
  if (error instanceof NetworkError) return 'Cannot reach Cowri'
  if (error instanceof ApiError) {
    if (error.isForbidden) return 'You do not have access to this'
    if (error.isUnauthorized) return 'Your session has ended'
    if (error.status >= 500) return 'Cowri is having trouble'
  }
  return 'That did not load'
}

/**
 * A failed fetch, with the API's own message and a way to try again.
 *
 * @example
 * {query.isError ? <ErrorState error={query.error} onRetry={query.refetch} /> : null}
 */
export function ErrorState({ error, onRetry, title, className }: ErrorStateProps) {
  const retryable = !(error instanceof ApiError && (error.isForbidden || error.isUnauthorized))

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-3 border border-clay-rule bg-clay-tint',
        'rounded-[var(--radius-panel)] px-5 py-5',
        className,
      )}
    >
      <span className="text-clay">
        <AlertIcon size={22} />
      </span>
      <div>
        <h3 className="text-base text-ink">{title ?? headingFor(error)}</h3>
        <p className="mt-1 max-w-prose text-sm leading-6 text-ink-muted">{errorMessage(error)}</p>
      </div>
      {onRetry && retryable ? (
        <Button size="sm" onClick={onRetry} leading={<RefreshIcon size={16} />}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
