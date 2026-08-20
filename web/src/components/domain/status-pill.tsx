import { cn } from '~/lib/cn'
import type { AjoStatus, BillStatus, KycStatus, TransactionStatus } from '~/lib/api/types'

export type StatusKind = 'ajo' | 'bill' | 'transaction' | 'kyc'

type Descriptor = { label: string; tone: 'accent' | 'clay' | 'neutral' | 'muted' }

const ajo: Record<AjoStatus, Descriptor> = {
  active: { label: 'Active', tone: 'accent' },
  completed: { label: 'Completed', tone: 'neutral' },
  paused: { label: 'Paused', tone: 'clay' },
}

const bill: Record<BillStatus, Descriptor> = {
  pending: { label: 'Awaiting payment', tone: 'clay' },
  partially_paid: { label: 'Part paid', tone: 'muted' },
  settled: { label: 'Settled', tone: 'accent' },
}

const transaction: Record<TransactionStatus, Descriptor> = {
  pending: { label: 'Pending', tone: 'muted' },
  success: { label: 'Settled', tone: 'accent' },
  failed: { label: 'Failed', tone: 'clay' },
}

// `unverified` (never attempted) and `failed` (attempted, rejected) get
// distinct labels — a resubmission path only makes sense for the latter.
const kyc: Record<KycStatus, Descriptor> = {
  unverified: { label: 'Not verified', tone: 'muted' },
  pending: { label: 'Checking…', tone: 'muted' },
  verified: { label: 'Verified', tone: 'accent' },
  failed: { label: 'Verification failed', tone: 'clay' },
}

const toneClasses = {
  accent: 'border-accent-rule bg-accent-tint text-accent',
  clay: 'border-clay-rule bg-clay-tint text-clay',
  neutral: 'border-rule-strong bg-paper-sunken text-ink-muted',
  muted: 'border-rule bg-paper-sunken text-ink-faint',
} as const

export type StatusPillProps =
  | { kind: 'ajo'; status: AjoStatus; className?: string }
  | { kind: 'bill'; status: BillStatus; className?: string }
  | { kind: 'transaction'; status: TransactionStatus; className?: string }
  | { kind: 'kyc'; status: KycStatus; className?: string }

/**
 * Turns an API status enum into a labelled pill.
 *
 * The label carries the meaning; colour only reinforces it, so the pill still
 * works in monochrome and for colour-blind readers.
 *
 * @example <StatusPill kind="bill" status={bill.status} />
 */
export function StatusPill(props: StatusPillProps) {
  const descriptor: Descriptor =
    props.kind === 'ajo'
      ? ajo[props.status]
      : props.kind === 'bill'
        ? bill[props.status]
        : props.kind === 'transaction'
          ? transaction[props.status]
          : kyc[props.status]

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-[var(--radius-pill)] border px-2 py-0.5',
        'text-xs font-medium',
        toneClasses[descriptor.tone],
        props.className,
      )}
    >
      {descriptor.label}
    </span>
  )
}
