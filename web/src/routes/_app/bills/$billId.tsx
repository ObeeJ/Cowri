import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '~/components/domain/page-header'
import { MoneyAmount } from '~/components/domain/money-amount'
import { ParticipantSplitRow } from '~/components/domain/bill'
import { StatusPill } from '~/components/domain/status-pill'
import { Button } from '~/components/ui/button'
import { Dialog } from '~/components/ui/dialog'
import { Field } from '~/components/ui/field'
import { MoneyInput } from '~/components/ui/money-input'
import { PinInput } from '~/components/ui/pin-input'
import { Progress } from '~/components/ui/display'
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton'
import { ErrorState } from '~/components/ui/states'
import { useToast } from '~/components/ui/toast'
import { NoteIcon } from '~/components/icons'
import { useBill, usePayBillShare } from '~/lib/api/hooks'
import { useAuth } from '~/lib/auth'
import { ApiError, errorMessage } from '~/lib/api/client'
import { formatDateTime } from '~/lib/format'
import { formatKobo } from '~/lib/money'

export const Route = createFileRoute('/_app/bills/$billId')({
  component: BillDetailPage,
})

function BillDetailPage() {
  const { billId } = useParams({ from: '/_app/bills/$billId' })
  const { user } = useAuth()
  const detail = useBill(billId)
  const [confirming, setConfirming] = useState(false)

  if (detail.isPending) return <BillDetailSkeleton />
  if (detail.isError) {
    return (
      <>
        <PageHeader title="Bill" back={{ to: '/bills', label: 'All bills' }} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </>
    )
  }

  const { bill, participants, my_share } = detail.data
  const paidCount = participants.filter((participant) => participant.paid).length
  const collected = participants
    .filter((participant) => participant.paid)
    .reduce((sum, participant) => sum + participant.share_kobo, 0)

  const canPay = my_share !== null && !my_share.paid

  return (
    <>
      <PageHeader
        eyebrow="Bill"
        title={bill.title}
        back={{ to: '/bills', label: 'All bills' }}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusPill kind="bill" status={bill.status} />
            <span>Raised {formatDateTime(bill.created_at)}</span>
            <span aria-hidden="true">·</span>
            <span>Complete by {formatDateTime(bill.complete_by_at)}</span>
            {bill.creator_id === user?.id ? (
              <>
                <span aria-hidden="true">·</span>
                <span>by you</span>
              </>
            ) : null}
          </span>
        }
        actions={
          canPay ? (
            <Button
              variant="primary"
              leading={<NoteIcon size={16} />}
              onClick={() => setConfirming(true)}
            >
              Pay {formatKobo(my_share.share_kobo)}
            </Button>
          ) : null
        }
      />

      <section className="panel px-5 py-4">
        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          <div>
            <dt className="label-caps">Bill total</dt>
            <dd className="mt-1">
              <MoneyAmount kobo={bill.total_kobo} size="lg" />
            </dd>
          </div>
          <div>
            <dt className="label-caps">Collected so far</dt>
            <dd className="mt-1">
              <MoneyAmount kobo={collected} size="lg" tone="credit" />
            </dd>
          </div>
          {my_share ? (
            <div>
              <dt className="label-caps">Your share</dt>
              <dd className="mt-1">
                <MoneyAmount
                  kobo={my_share.share_kobo}
                  size="lg"
                  tone={my_share.paid ? 'muted' : 'debit'}
                />
                {my_share.paid ? (
                  <span className="ml-2 text-xs text-ink-faint">paid</span>
                ) : null}
              </dd>
            </div>
          ) : null}
        </dl>

        <Progress
          className="mt-5"
          value={paidCount}
          max={Math.max(participants.length, 1)}
          label="Shares settled"
          showLabel
        />
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg text-ink">Who is on this bill</h2>
        <div className="panel overflow-hidden">
          <ul className="divide-y divide-rule">
            {participants.map((participant) => (
              <ParticipantSplitRow
                key={participant.user_id}
                participant={participant}
                currentUserId={user?.id}
                creatorId={bill.creator_id}
                action={
                  participant.user_id === user?.id && !participant.paid ? (
                    <Button size="sm" variant="primary" onClick={() => setConfirming(true)}>
                      Pay
                    </Button>
                  ) : null
                }
              />
            ))}
          </ul>
        </div>
        <p className="mt-2 text-[0.8125rem] leading-6 text-ink-faint">
          Other participants are shown by their account id. The API does not release their names to
          you, and Cowri does not guess at them.
        </p>
      </section>

      {my_share ? (
        <PayShareDialog
          open={confirming}
          onOpenChange={setConfirming}
          billId={billId}
          billTitle={bill.title}
          shareKobo={my_share.share_kobo}
          remainingKobo={my_share.remaining_kobo ?? my_share.share_kobo - (my_share.amount_paid_kobo ?? 0)}
          completeBy={bill.complete_by_at}
          deadline={bill.deadline_at}
        />
      ) : null}
    </>
  )
}

function PayShareDialog({
  open,
  onOpenChange,
  billId,
  billTitle,
  shareKobo,
  remainingKobo,
  completeBy,
  deadline,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  billId: string
  billTitle: string
  shareKobo: number
  remainingKobo: number
  completeBy: string
  deadline: string
}) {
  const { toast } = useToast()
  const pay = usePayBillShare()
  const [error, setError] = useState<string | null>(null)
  const [transactionPin, setTransactionPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [amountKobo, setAmountKobo] = useState<number | null>(remainingKobo)

  async function handlePay() {
    setError(null)
    setPinError(false)
    if (transactionPin.length < 4) {
      setPinError(true)
      return
    }
    const bit = amountKobo ?? remainingKobo
    if (bit <= 0 || bit > remainingKobo) {
      setError(`Pay between ${formatKobo(100)} and the remaining ${formatKobo(remainingKobo)}.`)
      return
    }
    try {
      await pay.mutateAsync({ id: billId, transactionPin, amountKobo: bit })
      onOpenChange(false)
      toast({
        title: 'Opening secure checkout',
        description: `Pay ${formatKobo(bit)} for ${billTitle} via Paystack (card, transfer, USSD, or wallet).`,
        tone: 'success',
      })
    } catch (caught) {
      if (caught instanceof ApiError && caught.isConflict) {
        setError('This share has already been paid.')
      } else if (caught instanceof ApiError && caught.status === 403) {
        setPinError(true)
        setTransactionPin('')
        setError('Incorrect transaction PIN.')
      } else {
        setError(errorMessage(caught))
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pay your share"
      description={`Pay in full or in bits. Must be complete by ${formatDateTime(completeBy)} (24h before ${formatDateTime(deadline)}). Money moves via Paystack — Cowri does not hold it.`}
      dismissable={!pay.isPending}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={pay.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handlePay}
            loading={pay.isPending}
            loadingText="Opening checkout"
          >
            Continue to Paystack
          </Button>
        </>
      }
    >
      <dl className="divide-y divide-rule">
        <div className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-sm text-ink-muted">Your share</dt>
          <dd>
            <MoneyAmount kobo={shareKobo} size="md" koboDigits="always" />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-sm text-ink-muted">Still owing</dt>
          <dd>
            <MoneyAmount kobo={remainingKobo} size="md" tone="debit" koboDigits="always" />
          </dd>
        </div>
      </dl>
      <Field
        className="mt-4"
        label="Amount this time"
        hint="Leave as the remaining balance, or pay a smaller bit toward it."
      >
        <MoneyInput valueKobo={amountKobo} onValueChange={setAmountKobo} />
      </Field>

      <Field label="Transaction PIN" className="mt-4" required>
        <PinInput
          label="Transaction PIN"
          secret
          value={transactionPin}
          onValueChange={(next) => {
            setTransactionPin(next)
            setPinError(false)
          }}
          invalid={pinError}
          onComplete={handlePay}
        />
      </Field>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-[var(--radius-panel)] border border-clay-rule bg-clay-tint px-3 py-2.5 text-sm text-clay"
        >
          {error}
        </p>
      ) : null}
    </Dialog>
  )
}

function BillDetailSkeleton() {
  return (
    <SkeletonGroup label="Loading the bill">
      <Skeleton width="4rem" height="0.8125rem" />
      <Skeleton width="16rem" height="2rem" className="mt-3" />
      <Skeleton width="20rem" height="1rem" className="mt-3" />
      <Skeleton width="100%" height="9rem" shape="block" className="mt-6" />
      <Skeleton width="100%" height="14rem" shape="block" className="mt-4" />
    </SkeletonGroup>
  )
}
