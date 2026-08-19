import { Fragment } from 'react'
import { cn } from '~/lib/cn'
import { ArrowIcon } from '~/components/icons'
import type { Transaction } from '~/lib/api/types'
import { dayHeading, formatTime, groupByDay } from '~/lib/format'
import { MoneyAmount } from './money-amount'
import { StatusPill } from './status-pill'
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton'

export type TransactionRowProps = {
  transaction: Transaction
  /** Prints the reference under the description. Used on the wallet page. */
  showReference?: boolean
  className?: string
}

/**
 * One line of the ledger.
 *
 * Direction is carried three ways: the wording, the sign on the figure, and the
 * colour. Colour alone would fail for a colour-blind reader.
 *
 * @example <TransactionRow transaction={transaction} showReference />
 */
export function TransactionRow({ transaction, showReference = false, className }: TransactionRowProps) {
  const isCredit = transaction.kind === 'credit'
  const signedKobo = isCredit ? transaction.amount_kobo : -transaction.amount_kobo

  return (
    <li className={cn('flex items-start gap-3 px-4 py-3 sm:px-5', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-pill)] border',
          isCredit
            ? 'border-accent-rule bg-accent-tint text-accent'
            : 'border-clay-rule bg-clay-tint text-clay',
        )}
      >
        <ArrowIcon direction={isCredit ? 'down' : 'up'} size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] text-ink">{transaction.description}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
          <span>{isCredit ? 'Money in' : 'Money out'}</span>
          <span aria-hidden="true">·</span>
          <span className="numeric">{formatTime(transaction.created_at)}</span>
          {transaction.status !== 'success' ? (
            <StatusPill kind="transaction" status={transaction.status} />
          ) : null}
        </p>
        {showReference ? (
          <p className="numeric mt-1 truncate text-[0.6875rem] text-ink-faint">
            {transaction.reference}
          </p>
        ) : null}
      </div>
      <MoneyAmount kobo={signedKobo} tone="auto" signed koboDigits="always" className="pt-0.5" />
    </li>
  )
}

export type TransactionListProps = {
  transactions: Transaction[]
  /** Groups rows under Today, Yesterday and dated headings. */
  grouped?: boolean
  showReference?: boolean
  /** Rendered in place of the rows when the list is empty. */
  empty?: React.ReactNode
  className?: string
}

/**
 * A ledger of transactions, ruled between rows.
 *
 * @example
 * <TransactionList transactions={data} grouped empty={<EmptyState title="No activity yet" />} />
 */
export function TransactionList({
  transactions,
  grouped = false,
  showReference = false,
  empty,
  className,
}: TransactionListProps) {
  if (transactions.length === 0) return <>{empty}</>

  if (!grouped) {
    return (
      <ul className={cn('divide-y divide-rule', className)}>
        {transactions.map((transaction) => (
          <TransactionRow
            key={transaction.id + transaction.reference}
            transaction={transaction}
            showReference={showReference}
          />
        ))}
      </ul>
    )
  }

  const days = groupByDay(transactions, (transaction) => transaction.created_at)

  return (
    <div className={className}>
      {days.map(([day, rows]) => (
        <Fragment key={day}>
          <h3 className="label-caps sticky top-0 z-10 border-y border-rule bg-paper-sunken px-4 py-1.5 sm:px-5">
            {dayHeading(day)}
          </h3>
          <ul className="divide-y divide-rule">
            {rows.map((transaction) => (
              <TransactionRow
                key={transaction.id + transaction.reference}
                transaction={transaction}
                showReference={showReference}
              />
            ))}
          </ul>
        </Fragment>
      ))}
    </div>
  )
}

/** @example {isLoading ? <TransactionListSkeleton rows={6} /> : <TransactionList … />} */
export function TransactionListSkeleton({ rows = 5 }: { rows?: number }) {
  // Varied widths so the placeholder reads as text rather than a set of bars.
  const widths = ['62%', '45%', '73%', '51%', '68%', '40%', '58%', '66%']
  return (
    <SkeletonGroup label="Loading transactions" className="divide-y divide-rule">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-start gap-3 px-4 py-3 sm:px-5">
          <Skeleton width="1.75rem" height="1.75rem" shape="pill" className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton width={widths[index % widths.length]} height="0.9375rem" />
            <Skeleton width="7rem" height="0.75rem" className="mt-2" />
          </div>
          <Skeleton width="5rem" height="1rem" />
        </div>
      ))}
    </SkeletonGroup>
  )
}
