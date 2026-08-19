/**
 * Marketing previews.
 *
 * These render the product's own components against sample data, so what a
 * visitor sees on the marketing pages is literally the interface they will get,
 * not a drawing of it. Every preview is labelled as sample data. Nothing here
 * is presented as a real customer, a real balance or a real quote.
 */

import type { AjoGroup, AjoMemberSummary, Bill, BillParticipantSummary, Transaction, Wallet } from '~/lib/api/types'
import { BalanceCard } from '~/components/domain/balance-card'
import { TransactionList } from '~/components/domain/transaction-list'
import { AjoCycleTimeline } from '~/components/domain/ajo'
import { ParticipantSplitRow } from '~/components/domain/bill'
import { StatusPill } from '~/components/domain/status-pill'
import { MoneyAmount } from '~/components/domain/money-amount'
import { Button } from '~/components/ui/button'
import { NoteIcon } from '~/components/icons'
import { cn } from '~/lib/cn'

const SAMPLE_WALLET: Wallet = {
  id: '00000000-0000-4000-8000-000000000001',
  user_id: '00000000-0000-4000-8000-000000000002',
  available_kobo: 4_875_000,
  ledger_kobo: 4_875_000,
  version: 42,
}

const day = 86_400_000
const now = Date.now()

const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    wallet_id: SAMPLE_WALLET.id,
    kind: 'credit',
    amount_kobo: 2_000_000,
    reference: 'fund-sample-01',
    description: 'Wallet top-up via Paystack',
    status: 'success',
    created_at: new Date(now - 2 * 3_600_000).toISOString(),
  },
  {
    id: 't2',
    wallet_id: SAMPLE_WALLET.id,
    kind: 'debit',
    amount_kobo: 500_000,
    reference: 'ajo-sample-02',
    description: 'Ajo contribution: Owambe Circle',
    status: 'success',
    created_at: new Date(now - 1 * day).toISOString(),
  },
  {
    id: 't3',
    wallet_id: SAMPLE_WALLET.id,
    kind: 'debit',
    amount_kobo: 187_500,
    reference: 'bill-sample-03',
    description: 'Bill split payment',
    status: 'success',
    created_at: new Date(now - 2 * day).toISOString(),
  },
]

const SAMPLE_GROUP: AjoGroup = {
  id: '00000000-0000-4000-8000-000000000003',
  name: 'Owambe Circle',
  admin_id: SAMPLE_WALLET.user_id,
  contribution_kobo: 500_000,
  frequency: 'weekly',
  member_count: 5,
  current_cycle: 2,
  status: 'active',
  created_at: new Date(now - 30 * day).toISOString(),
}

const SAMPLE_MEMBERS: AjoMemberSummary[] = [
  { user_id: 'm-0', payout_position: 0, has_received: true },
  { user_id: 'm-1', payout_position: 1, has_received: true },
  { user_id: SAMPLE_WALLET.user_id, payout_position: 2, has_received: false },
  { user_id: 'm-3', payout_position: 3, has_received: false },
  { user_id: 'm-4', payout_position: 4, has_received: false },
]

const SAMPLE_BILL: Bill = {
  id: '00000000-0000-4000-8000-000000000004',
  title: 'Dinner at Terra Kulture',
  creator_id: SAMPLE_WALLET.user_id,
  total_kobo: 750_000,
  status: 'partially_paid',
  created_at: new Date(now - 3 * day).toISOString(),
}

const SAMPLE_PARTICIPANTS: BillParticipantSummary[] = [
  { user_id: SAMPLE_WALLET.user_id, share_kobo: 187_500, paid: true },
  { user_id: 'p-2', share_kobo: 187_500, paid: true },
  { user_id: 'p-3', share_kobo: 187_500, paid: false },
  { user_id: 'p-4', share_kobo: 187_500, paid: false },
]

function PreviewFrame({
  children,
  caption,
  className,
}: {
  children: React.ReactNode
  caption: string
  className?: string
}) {
  return (
    <figure className={cn('min-w-0', className)}>
      <div
        // Inert: this is a picture of the product, not a working control.
        aria-hidden="true"
        className="pointer-events-none select-none border border-rule-strong bg-paper p-3 sm:p-4"
      >
        {children}
      </div>
      <figcaption className="mt-2 text-xs text-ink-faint">{caption}</figcaption>
    </figure>
  )
}

/** The wallet as it appears on the dashboard. */
export function WalletPreview({ className }: { className?: string }) {
  return (
    <PreviewFrame
      className={className}
      caption="The wallet screen, rendered with the product's own components. Sample amounts."
    >
      <BalanceCard
        wallet={SAMPLE_WALLET}
        animate={false}
        actions={
          <>
            <Button variant="primary" size="sm" leading={<NoteIcon size={16} />}>
              Add money
            </Button>
            <Button size="sm">Transaction history</Button>
          </>
        }
      />
      <div className="panel mt-3">
        <h3 className="label-caps border-b border-rule px-4 py-2">Recent activity</h3>
        <TransactionList transactions={SAMPLE_TRANSACTIONS} />
      </div>
    </PreviewFrame>
  )
}

/** The payout order of a savings circle. */
export function AjoPreview({ className }: { className?: string }) {
  return (
    <PreviewFrame
      className={className}
      caption="A circle's payout order, exactly as the app draws it. Sample circle."
    >
      <div className="panel">
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
          <div>
            <h3 className="text-base text-ink">{SAMPLE_GROUP.name}</h3>
            <p className="text-xs text-ink-faint">Weekly · 5 members</p>
          </div>
          <StatusPill kind="ajo" status={SAMPLE_GROUP.status} />
        </div>
        <AjoCycleTimeline
          group={SAMPLE_GROUP}
          members={SAMPLE_MEMBERS}
          currentUserId={SAMPLE_WALLET.user_id}
        />
      </div>
    </PreviewFrame>
  )
}

/** A split bill and who has settled. */
export function BillPreview({ className }: { className?: string }) {
  return (
    <PreviewFrame
      className={className}
      caption="A split bill in the app. Participants are shown by id, since the API does not expose other members' names. Sample bill."
    >
      <div className="panel">
        <div className="flex items-start justify-between gap-3 border-b border-rule px-4 py-3">
          <div>
            <h3 className="text-base text-ink">{SAMPLE_BILL.title}</h3>
            <p className="text-xs text-ink-faint">
              Total <MoneyAmount kobo={SAMPLE_BILL.total_kobo} size="sm" tone="muted" /> · 4 people
            </p>
          </div>
          <StatusPill kind="bill" status={SAMPLE_BILL.status} />
        </div>
        <ul className="divide-y divide-rule">
          {SAMPLE_PARTICIPANTS.map((participant) => (
            <ParticipantSplitRow
              key={participant.user_id}
              participant={participant}
              currentUserId={SAMPLE_WALLET.user_id}
              creatorId={SAMPLE_BILL.creator_id}
            />
          ))}
        </ul>
      </div>
    </PreviewFrame>
  )
}
