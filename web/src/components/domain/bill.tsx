import { Link } from '@tanstack/react-router'
import { cn } from '~/lib/cn'
import type { Bill, BillParticipantSummary, Uuid } from '~/lib/api/types'
import { formatDate } from '~/lib/format'
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton'
import { UserIcon } from '~/components/icons'
import { MoneyAmount } from './money-amount'
import { StatusPill } from './status-pill'

export type BillCardProps = {
  bill: Bill
  /** The signed-in user's id, used to mark bills they raised. */
  currentUserId?: Uuid
  /** The caller's own share, when the detail has been loaded. */
  myShareKobo?: number
  className?: string
}

/**
 * A split bill in a list.
 *
 * @example <BillCard bill={bill} currentUserId={user.id} />
 */
export function BillCard({ bill, currentUserId, myShareKobo, className }: BillCardProps) {
  const isCreator = currentUserId ? bill.creator_id === currentUserId : false

  return (
    <li className={cn('panel transition-colors duration-150 ease-[var(--ease-ui)] hover:border-rule-strong', className)}>
      <Link to="/bills/$billId" params={{ billId: bill.id }} className="block px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base leading-6 text-ink">{bill.title}</h3>
            <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
              {isCreator ? 'You raised this' : 'Shared with you'}
              {' · '}
              {formatDate(bill.created_at)}
            </p>
          </div>
          <StatusPill kind="bill" status={bill.status} />
        </div>

        <dl className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-rule pt-3">
          <div>
            <dt className="label-caps">Bill total</dt>
            <dd className="mt-0.5">
              <MoneyAmount kobo={bill.total_kobo} size="md" />
            </dd>
          </div>
          {myShareKobo !== undefined ? (
            <div>
              <dt className="label-caps">Your share</dt>
              <dd className="mt-0.5">
                <MoneyAmount kobo={myShareKobo} size="md" tone="debit" />
              </dd>
            </div>
          ) : null}
        </dl>
      </Link>
    </li>
  )
}

export function BillCardSkeleton() {
  return (
    <li className="panel px-4 py-4 sm:px-5">
      <SkeletonGroup label="Loading bill">
        <Skeleton width="13rem" height="1.125rem" />
        <Skeleton width="9rem" height="0.8125rem" className="mt-2" />
        <div className="mt-4 flex gap-6 border-t border-rule pt-3">
          <Skeleton width="5.5rem" height="1.25rem" />
          <Skeleton width="5rem" height="1.25rem" />
        </div>
      </SkeletonGroup>
    </li>
  )
}

export type ParticipantSplitRowProps = {
  participant: BillParticipantSummary
  /** Marks the caller's own row as "You". */
  currentUserId?: Uuid
  /** Marks whoever raised the bill. */
  creatorId?: Uuid
  /** Rendered on the right, typically a pay button on the caller's own row. */
  action?: React.ReactNode
  className?: string
}

/**
 * One person's share of a bill.
 *
 * The API returns participants as user ids only, with no names attached, so
 * rows read as "You" or "Participant 8f3a…" rather than inventing a person.
 *
 * @example
 * <ParticipantSplitRow
 *   participant={participant}
 *   currentUserId={user.id}
 *   creatorId={bill.creator_id}
 *   action={<Button variant="primary" size="sm" onClick={pay}>Pay share</Button>}
 * />
 */
export function ParticipantSplitRow({
  participant,
  currentUserId,
  creatorId,
  action,
  className,
}: ParticipantSplitRowProps) {
  const isYou = currentUserId === participant.user_id
  const isCreator = creatorId === participant.user_id
  const name = isYou ? 'You' : `Participant ${participant.user_id.slice(0, 6)}`

  return (
    <li className={cn('flex items-center gap-3 px-4 py-3 sm:px-5', className)}>
      {/* A person mark rather than initials: the API returns no names, and
          initials derived from an account id would be meaningless. */}
      <span
        aria-hidden="true"
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-pill)] border',
          isYou
            ? 'border-accent-rule bg-accent-tint text-accent'
            : 'border-rule bg-paper-sunken text-ink-faint',
        )}
      >
        <UserIcon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] text-ink">
          {name}
          {isCreator ? <span className="ml-2 text-xs text-ink-faint">raised the bill</span> : null}
        </p>
        <p className="text-xs text-ink-faint">{participant.paid ? 'Paid' : 'Not paid yet'}</p>
      </div>
      <MoneyAmount
        kobo={participant.share_kobo}
        size="md"
        tone={participant.paid ? 'muted' : 'default'}
      />
      {action}
    </li>
  )
}
