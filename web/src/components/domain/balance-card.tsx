import type { ReactNode } from 'react'
import { cn } from '~/lib/cn'
import type { Wallet } from '~/lib/api/types'
import { formatKobo, speakKobo } from '~/lib/money'
import { MoneyAmount } from './money-amount'
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton'
import { Tooltip } from '~/components/ui/popover'

export type BalanceCardProps = {
  wallet: Wallet
  /** Actions rendered on the lower rule. Fund, send, and so on. */
  actions?: ReactNode
  /** Rolls the figure up when the balance changes. On by default. */
  animate?: boolean
  className?: string
}

/**
 * The wallet's headline figure.
 *
 * Two numbers matter and the card shows both: `available_kobo` is spendable now,
 * `ledger_kobo` includes anything not yet settled. They are equal in the common
 * case, so the ledger line only appears when they differ.
 *
 * @example <BalanceCard wallet={wallet} actions={<Button variant="primary">Add money</Button>} />
 */
export function BalanceCard({ wallet, actions, animate = true, className }: BalanceCardProps) {
  const held = wallet.ledger_kobo - wallet.available_kobo

  return (
    <section
      aria-labelledby="balance-heading"
      className={cn('panel overflow-hidden', className)}
    >
      <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <h2 id="balance-heading" className="label-caps">
          Available balance
        </h2>

        {/* The figure is the live region: a contribution or a top-up changes it
            without any other visible confirmation on this screen. */}
        <p aria-live="polite" className="mt-2">
          <MoneyAmount
            kobo={wallet.available_kobo}
            size="display"
            koboDigits="always"
            animate={animate}
          />
          <span className="sr-only">{speakKobo(wallet.available_kobo)} available</span>
        </p>

        {held !== 0 ? (
          <p className="mt-2 text-[0.8125rem] text-ink-muted">
            <Tooltip content="Money recorded in the ledger that has not settled into your available balance yet.">
              <button type="button" className="underline decoration-rule-strong underline-offset-4">
                Ledger balance
              </button>
            </Tooltip>{' '}
            <span className="numeric">{formatKobo(wallet.ledger_kobo, { kobo: 'always' })}</span>
            {', '}
            <span className="numeric">{formatKobo(Math.abs(held), { kobo: 'always' })}</span>{' '}
            {held > 0 ? 'not yet settled' : 'over-settled'}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-rule bg-paper px-5 py-3 sm:px-6">
          {actions}
        </div>
      ) : null}
    </section>
  )
}

/** Matches BalanceCard's geometry so the page does not jump when data lands. */
export function BalanceCardSkeleton({ className }: { className?: string }) {
  return (
    <SkeletonGroup label="Loading balance" className={cn('panel overflow-hidden', className)}>
      <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <Skeleton width="8.5rem" height="0.75rem" />
        <div className="mt-3">
          <Skeleton width="12rem" height="2.5rem" shape="block" />
        </div>
      </div>
      <div className="flex gap-2 border-t border-rule bg-paper px-5 py-3 sm:px-6">
        <Skeleton width="7.5rem" height="2.75rem" shape="block" />
        <Skeleton width="6rem" height="2.75rem" shape="block" />
      </div>
    </SkeletonGroup>
  )
}
