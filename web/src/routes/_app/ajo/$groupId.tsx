import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '~/components/domain/page-header'
import { AjoCycleTimeline, ContributionSchedule, frequencyPhrase } from '~/components/domain/ajo'
import { StatusPill } from '~/components/domain/status-pill'
import { MoneyAmount } from '~/components/domain/money-amount'
import { Button } from '~/components/ui/button'
import { Dialog } from '~/components/ui/dialog'
import { Field } from '~/components/ui/field'
import { PinInput } from '~/components/ui/pin-input'
import { Progress } from '~/components/ui/display'
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton'
import { ErrorState } from '~/components/ui/states'
import { useToast } from '~/components/ui/toast'
import { CopyIcon, NoteIcon, TickIcon } from '~/components/icons'
import { useAjoGroup, useAjoInvite, useContributeAjo, useWallet } from '~/lib/api/hooks'
import { useAuth } from '~/lib/auth'
import { ApiError, errorMessage } from '~/lib/api/client'
import { formatKobo } from '~/lib/money'

export const Route = createFileRoute('/_app/ajo/$groupId')({
  component: AjoDetailPage,
})

function AjoDetailPage() {
  const { groupId } = useParams({ from: '/_app/ajo/$groupId' })
  const { user } = useAuth()
  const detail = useAjoGroup(groupId)
  const wallet = useWallet()
  const [confirming, setConfirming] = useState(false)

  const group = detail.data?.group
  const isGroupAdmin = Boolean(group && user && group.admin_id === user.id)
  const invite = useAjoInvite(groupId, isGroupAdmin)

  if (detail.isPending) return <AjoDetailSkeleton />
  if (detail.isError) {
    return (
      <>
        <PageHeader title="Savings circle" back={{ to: '/ajo', label: 'All circles' }} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </>
    )
  }

  const { members, contributions_this_cycle, members_total } = detail.data
  const activeGroup = detail.data.group
  const seatsOpen = activeGroup.member_count - members_total

  return (
    <>
      <PageHeader
        eyebrow="Savings circle"
        title={activeGroup.name}
        back={{ to: '/ajo', label: 'All circles' }}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusPill kind="ajo" status={activeGroup.status} />
            <span>
              <MoneyAmount kobo={activeGroup.contribution_kobo} size="sm" tone="muted" />{' '}
              {frequencyPhrase(activeGroup.frequency)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="numeric">
              {members_total}/{activeGroup.member_count}
            </span>
            <span>members</span>
          </span>
        }
        actions={
          activeGroup.status === 'active' ? (
            <Button
              variant="primary"
              leading={<NoteIcon size={16} />}
              onClick={() => setConfirming(true)}
            >
              Contribute {formatKobo(activeGroup.contribution_kobo)}
            </Button>
          ) : null
        }
      />

      {seatsOpen > 0 ? (
        <p className="mb-5 rounded-[var(--radius-panel)] border border-rule-strong bg-paper-sunken px-4 py-3 text-sm text-ink-muted">
          <span className="numeric">{seatsOpen}</span>{' '}
          {seatsOpen === 1 ? 'seat is' : 'seats are'} still open. The circle keeps running, but the
          later cycles have nobody to pay out to until they are filled.
        </p>
      ) : null}

      <section className="panel px-5 py-4">
        <h2 className="text-base text-ink">This cycle</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Cycle <span className="numeric">{activeGroup.current_cycle + 1}</span> of{' '}
          <span className="numeric">{activeGroup.member_count}</span>. The circle moves on once
          everyone has contributed.
        </p>
        <Progress
          className="mt-4"
          value={contributions_this_cycle}
          max={Math.max(members_total, 1)}
          label="Contributions collected this cycle"
          showLabel
        />
        <ContributionSchedule detail={detail.data} className="mt-4 border-t border-rule pt-2" />
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg text-ink">Payout order</h2>
        <div className="panel overflow-hidden">
          <AjoCycleTimeline group={activeGroup} members={members} currentUserId={user?.id} />
        </div>
        <p className="mt-2 text-[0.8125rem] leading-6 text-ink-faint">
          Members are shown by position rather than by name. The API does not expose other members'
          details to you, and Cowri will not invent them.
        </p>
      </section>

      {isGroupAdmin ? (
        <InviteSection
          inviteUrl={invite.data?.invite_url}
          loading={invite.isPending}
          error={invite.isError ? invite.error : null}
        />
      ) : null}

      <ContributeDialog
        open={confirming}
        onOpenChange={setConfirming}
        groupId={groupId}
        groupName={activeGroup.name}
        contributionKobo={activeGroup.contribution_kobo}
        availableKobo={wallet.data?.available_kobo}
      />
    </>
  )
}

function InviteSection({
  inviteUrl,
  loading,
  error,
}: {
  inviteUrl?: string
  loading: boolean
  error: unknown
}) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      toast({ title: 'Invite link copied', tone: 'success' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: 'Could not copy automatically',
        description: 'Select the link and copy it by hand.',
        tone: 'warning',
      })
    }
  }

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg text-ink">Invite members</h2>
      <div className="panel px-5 py-4">
        {loading ? (
          <SkeletonGroup label="Loading the invite link">
            <Skeleton width="100%" height="2.75rem" shape="block" />
          </SkeletonGroup>
        ) : error ? (
          <ErrorState error={error} title="Invite link unavailable" />
        ) : (
          <>
            <p className="text-sm text-ink-muted">
              Anyone with this link who has a Cowri account can take the next open seat.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="numeric min-w-0 flex-1 truncate rounded-[var(--radius-control)] border border-rule bg-paper-sunken px-3 py-2.5 text-[0.8125rem] text-ink">
                {inviteUrl}
              </code>
              <Button
                onClick={copy}
                leading={copied ? <TickIcon size={16} /> : <CopyIcon size={16} />}
              >
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function ContributeDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  contributionKobo,
  availableKobo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  groupName: string
  contributionKobo: number
  availableKobo?: number
}) {
  const { toast } = useToast()
  const contribute = useContributeAjo()
  const [error, setError] = useState<string | null>(null)
  const [transactionPin, setTransactionPin] = useState('')
  const [pinError, setPinError] = useState(false)

  const shortfall =
    availableKobo === undefined ? null : Math.max(contributionKobo - availableKobo, 0)

  async function handleContribute() {
    setError(null)
    setPinError(false)
    if (transactionPin.length < 4) {
      setPinError(true)
      return
    }
    try {
      await contribute.mutateAsync({ id: groupId, transactionPin })
      onOpenChange(false)
      toast({
        title: 'Contribution sent',
        description: `${formatKobo(contributionKobo)} left your wallet for ${groupName}.`,
        tone: 'success',
      })
    } catch (caught) {
      if (caught instanceof ApiError && caught.isConflict) {
        setError('You have already contributed for this cycle.')
      } else if (caught instanceof ApiError && caught.isInsufficientFunds) {
        setError('There is not enough in your wallet for this contribution.')
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
      title="Contribute to this circle"
      description={`${formatKobo(contributionKobo)} will leave your wallet now and go to this cycle's recipient.`}
      dismissable={!contribute.isPending}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={contribute.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleContribute}
            loading={contribute.isPending}
            loadingText="Sending"
            disabled={shortfall !== null && shortfall > 0}
          >
            Contribute {formatKobo(contributionKobo)}
          </Button>
        </>
      }
    >
      <dl className="divide-y divide-rule">
        <div className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-sm text-ink-muted">Contribution</dt>
          <dd>
            <MoneyAmount kobo={contributionKobo} size="md" />
          </dd>
        </div>
        {availableKobo !== undefined ? (
          <>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-sm text-ink-muted">Your balance now</dt>
              <dd>
                <MoneyAmount kobo={availableKobo} size="md" tone="muted" />
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-sm text-ink-muted">Balance afterwards</dt>
              <dd>
                <MoneyAmount
                  kobo={availableKobo - contributionKobo}
                  size="md"
                  tone={availableKobo - contributionKobo < 0 ? 'debit' : 'default'}
                />
              </dd>
            </div>
          </>
        ) : null}
      </dl>

      {shortfall !== null && shortfall > 0 ? (
        <p className="mt-4 rounded-[var(--radius-panel)] border border-clay-rule bg-clay-tint px-3 py-2.5 text-sm text-clay">
          You need {formatKobo(shortfall)} more in your wallet before you can contribute.
        </p>
      ) : (
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
            onComplete={handleContribute}
          />
        </Field>
      )}

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

function AjoDetailSkeleton() {
  return (
    <SkeletonGroup label="Loading the circle">
      <Skeleton width="6rem" height="0.8125rem" />
      <Skeleton width="14rem" height="2rem" className="mt-3" />
      <Skeleton width="18rem" height="1rem" className="mt-3" />
      <Skeleton width="100%" height="12rem" shape="block" className="mt-6" />
      <Skeleton width="100%" height="16rem" shape="block" className="mt-4" />
    </SkeletonGroup>
  )
}
