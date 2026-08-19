import { Link } from '@tanstack/react-router'
import { cn } from '~/lib/cn'
import type { AjoDetail, AjoFrequency, AjoGroup, AjoMemberSummary, Uuid } from '~/lib/api/types'
import { formatDate } from '~/lib/format'
import { ajoFeeKobo, formatKobo } from '~/lib/money'
import { CircleGroupIcon, TallyIcon } from '~/components/icons'
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton'
import { MoneyAmount } from './money-amount'
import { StatusPill } from './status-pill'

const frequencyLabel: Record<AjoFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

/** "Every week", for prose. */
export function frequencyPhrase(frequency: AjoFrequency): string {
  return { daily: 'every day', weekly: 'every week', monthly: 'every month' }[frequency]
}

export type AjoGroupCardProps = {
  group: AjoGroup
  /** Current headcount, when known. The group's own member_count is the target. */
  joined?: number
  className?: string
}

/**
 * A savings circle at a glance, linking through to its detail page.
 *
 * `group.member_count` is the size the circle was created for, not how many
 * people have joined, so the card labels it as the target rather than implying
 * the circle is full.
 *
 * @example <AjoGroupCard group={group} joined={detail.members_total} />
 */
export function AjoGroupCard({ group, joined, className }: AjoGroupCardProps) {
  return (
    <li className={cn('panel transition-colors duration-150 ease-[var(--ease-ui)] hover:border-rule-strong', className)}>
      <Link
        to="/ajo/$groupId"
        params={{ groupId: group.id }}
        className="block px-4 py-4 sm:px-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base leading-6 text-ink">{group.name}</h3>
            <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
              {frequencyLabel[group.frequency]}
              {' · '}
              <span className="numeric">
                {joined ?? '?'}/{group.member_count}
              </span>{' '}
              members
              {' · '}
              started {formatDate(group.created_at)}
            </p>
          </div>
          <StatusPill kind="ajo" status={group.status} />
        </div>

        <dl className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-rule pt-3">
          <div>
            <dt className="label-caps">Contribution</dt>
            <dd className="mt-0.5">
              <MoneyAmount kobo={group.contribution_kobo} size="md" />
            </dd>
          </div>
          <div>
            <dt className="label-caps">Cycle</dt>
            <dd className="numeric mt-0.5 text-[0.9375rem] text-ink">
              {group.current_cycle + 1} of {group.member_count}
            </dd>
          </div>
        </dl>
      </Link>
    </li>
  )
}

export function AjoGroupCardSkeleton() {
  return (
    <li className="panel px-4 py-4 sm:px-5">
      <SkeletonGroup label="Loading savings circle">
        <Skeleton width="11rem" height="1.125rem" />
        <Skeleton width="15rem" height="0.8125rem" className="mt-2" />
        <div className="mt-4 flex gap-6 border-t border-rule pt-3">
          <Skeleton width="5rem" height="1.25rem" />
          <Skeleton width="4rem" height="1.25rem" />
        </div>
      </SkeletonGroup>
    </li>
  )
}

export type AjoCycleTimelineProps = {
  group: AjoGroup
  members: AjoMemberSummary[]
  /** Marks the caller's own position on the timeline. */
  currentUserId?: Uuid
  className?: string
}

/**
 * The payout order, drawn as a ruled column of cycles.
 *
 * Position n receives in cycle n, which is how the API allocates payouts
 * (backend/src/services/ajo.rs matches `payout_position == current_cycle`).
 * Cycles with nobody in that seat yet are shown as unfilled rather than hidden.
 *
 * @example <AjoCycleTimeline group={detail.group} members={detail.members} currentUserId={user.id} />
 */
export function AjoCycleTimeline({
  group,
  members,
  currentUserId,
  className,
}: AjoCycleTimelineProps) {
  const byPosition = new Map(members.map((member) => [member.payout_position, member]))
  const payoutKobo = group.contribution_kobo - ajoFeeKobo(group.contribution_kobo)

  return (
    <ol className={cn('divide-y divide-rule', className)}>
      {Array.from({ length: group.member_count }, (_, cycle) => {
        const member = byPosition.get(cycle)
        const isPast = cycle < group.current_cycle
        const isCurrent = cycle === group.current_cycle && group.status === 'active'
        const isMine = member && member.user_id === currentUserId

        return (
          <li
            key={cycle}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn('flex items-center gap-3 px-4 py-3', isCurrent && 'bg-accent-tint')}
          >
            <span
              aria-hidden="true"
              className={cn(
                'numeric flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-pill)] border text-xs',
                isPast && 'border-rule-strong bg-paper-sunken text-ink-faint',
                isCurrent && 'border-accent bg-accent text-paper-raised',
                !isPast && !isCurrent && 'border-rule bg-paper-raised text-ink-faint',
              )}
            >
              {isPast ? <TallyIcon size={15} /> : cycle + 1}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[0.9375rem] text-ink">
                {member ? (
                  <>
                    {isMine ? 'You receive' : 'Member receives'}
                    <span className="sr-only"> in cycle {cycle + 1}</span>
                  </>
                ) : (
                  'Seat not filled'
                )}
                {member?.has_received ? (
                  <span className="ml-2 text-xs text-ink-faint">paid out</span>
                ) : null}
              </p>
              <p className="text-xs text-ink-faint">
                Cycle {cycle + 1}
                {isCurrent ? ' · collecting now' : isPast ? ' · closed' : ' · upcoming'}
              </p>
            </div>

            <MoneyAmount kobo={payoutKobo} size="sm" tone={isCurrent ? 'credit' : 'muted'} />
          </li>
        )
      })}
    </ol>
  )
}

export type ContributionScheduleProps = {
  detail: AjoDetail
  className?: string
}

/**
 * What this cycle costs and how far along the collection is.
 *
 * The API reports how many contributions have landed this cycle but not who
 * made them, so this shows the count against the headcount rather than naming
 * members it cannot actually identify.
 *
 * @example <ContributionSchedule detail={detail} />
 */
export function ContributionSchedule({ detail, className }: ContributionScheduleProps) {
  const { group, contributions_this_cycle, members_total } = detail
  const fee = ajoFeeKobo(group.contribution_kobo)
  const payout = group.contribution_kobo - fee
  const outstanding = Math.max(members_total - contributions_this_cycle, 0)

  return (
    <dl className={cn('divide-y divide-rule', className)}>
      <div className="flex items-baseline justify-between gap-4 py-2.5">
        <dt className="text-sm text-ink-muted">Your contribution {frequencyPhrase(group.frequency)}</dt>
        <dd>
          <MoneyAmount kobo={group.contribution_kobo} size="md" />
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 py-2.5">
        <dt className="text-sm text-ink-muted">Platform fee, taken from each payout</dt>
        <dd>
          <MoneyAmount kobo={fee} size="sm" tone="muted" koboDigits="always" />
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 py-2.5">
        <dt className="text-sm text-ink-muted">Recipient receives per contribution</dt>
        <dd>
          <MoneyAmount kobo={payout} size="md" tone="credit" />
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 py-2.5">
        <dt className="text-sm text-ink-muted">Collected this cycle</dt>
        <dd className="numeric text-[0.9375rem] text-ink">
          {contributions_this_cycle} of {members_total}
          {outstanding > 0 ? (
            <span className="ml-2 text-xs text-ink-faint">
              {outstanding} outstanding
            </span>
          ) : null}
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 py-2.5">
        <dt className="text-sm text-ink-muted">Full circle pays out</dt>
        <dd className="numeric text-[0.9375rem] text-ink">
          {formatKobo(payout * group.member_count)} over {group.member_count} cycles
        </dd>
      </div>
    </dl>
  )
}

/** A plain marker used on empty Ajo surfaces. */
export function AjoEmptyMark() {
  return <CircleGroupIcon size={28} />
}
