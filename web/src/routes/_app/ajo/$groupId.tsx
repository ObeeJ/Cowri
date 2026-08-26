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
import {
  useAjoGroup,
  useAjoInvite,
  useCloseAjo,
  useContributeAjo,
  useRemoveAjoMember,
  useSetAjoPaymentMode,
  useWallet,
} from '~/lib/api/hooks'
import { useAuth } from '~/lib/auth'
import { ApiError, errorMessage } from '~/lib/api/client'
import { formatKobo } from '~/lib/money'
import type { AjoDetail, AjoMemberSummary, Uuid } from '~/lib/api/types'

export const Route = createFileRoute('/_app/ajo/$groupId')({
  component: AjoDetailPage,
})

function AjoDetailPage() {
  const { groupId } = useParams({ from: '/_app/ajo/$groupId' })
  const { user } = useAuth()
  const detail = useAjoGroup(groupId)
  const wallet = useWallet()
  const [confirming, setConfirming] = useState(false)
  const [settingMode, setSettingMode] = useState(false)

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
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingMode(true)}
                aria-label="Set auto-debit"
              >
                Auto-debit
              </Button>
              <Button
                variant="primary"
                leading={<NoteIcon size={16} />}
                onClick={() => setConfirming(true)}
              >
                Contribute {formatKobo(activeGroup.contribution_kobo)}
              </Button>
            </div>
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
        <>
          <InviteSection
            inviteUrl={invite.data?.invite_url}
            loading={invite.isPending}
            error={invite.isError ? invite.error : null}
          />
          <ManageCircleSection groupId={groupId} detail={detail.data} />
        </>
      ) : null}

      <ContributeDialog
        open={confirming}
        onOpenChange={setConfirming}
        groupId={groupId}
        groupName={activeGroup.name}
        contributionKobo={activeGroup.contribution_kobo}
        availableKobo={wallet.data?.available_kobo}
      />

      <AutoDebitDialog
        open={settingMode}
        onOpenChange={setSettingMode}
        groupId={groupId}
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

function ManageCircleSection({ groupId, detail }: { groupId: Uuid; detail: AjoDetail }) {
  const [removing, setRemoving] = useState<AjoMemberSummary | null>(null)
  const [closing, setClosing] = useState(false)
  const { group, members } = detail

  // Position <= current_cycle means already paid out, or their cycle is
  // currently collecting — the API rejects removing either, so there's no
  // point offering a button that can only fail.
  const removable = members.filter(
    (m) => m.payout_position > group.current_cycle && m.user_id !== group.admin_id,
  )

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg text-ink">Manage circle</h2>
      <div className="panel px-5 py-4">
        <h3 className="text-sm font-medium text-ink">Members not yet due a payout</h3>
        {removable.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            Nobody can be removed right now — every remaining member has either already been paid
            or their payout is due this cycle.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-rule">
            {removable.map((member) => (
              <li key={member.user_id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-ink-muted">
                  Position <span className="numeric">{member.payout_position + 1}</span>
                </span>
                <Button size="sm" variant="danger" onClick={() => setRemoving(member)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        {group.status === 'active' ? (
          <div className="mt-5 border-t border-rule pt-4">
            <h3 className="text-sm font-medium text-ink">Close this circle</h3>
            <p className="mt-1 text-[0.8125rem] leading-6 text-ink-faint">
              Stops every future contribution and closes the circle to new members. Payouts already
              made are not affected or refunded — this cannot be undone.
            </p>
            <Button size="sm" variant="danger" className="mt-3" onClick={() => setClosing(true)}>
              Close circle
            </Button>
          </div>
        ) : null}
      </div>

      <RemoveMemberDialog groupId={groupId} member={removing} onOpenChange={(open) => !open && setRemoving(null)} />
      <CloseCircleDialog groupId={groupId} open={closing} onOpenChange={setClosing} />
    </section>
  )
}

function RemoveMemberDialog({
  groupId,
  member,
  onOpenChange,
}: {
  groupId: Uuid
  member: AjoMemberSummary | null
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const removeMember = useRemoveAjoMember()
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!member) return
    setError(null)
    try {
      await removeMember.mutateAsync({ groupId, memberId: member.user_id })
      toast({ title: 'Member removed', tone: 'success' })
      onOpenChange(false)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <Dialog
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) setError(null)
        onOpenChange(open)
      }}
      title="Remove this member?"
      description={
        member
          ? `They'll lose their seat at position ${member.payout_position + 1}. Everyone scheduled after them moves up.`
          : undefined
      }
      dismissable={!removeMember.isPending}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={removeMember.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} loading={removeMember.isPending} loadingText="Removing">
            Remove member
          </Button>
        </>
      }
    >
      {error ? (
        <p role="alert" className="rounded-[var(--radius-panel)] border border-clay-rule bg-clay-tint px-3 py-2.5 text-sm text-clay">
          {error}
        </p>
      ) : null}
    </Dialog>
  )
}

function CloseCircleDialog({
  groupId,
  open,
  onOpenChange,
}: {
  groupId: Uuid
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const closeAjo = useCloseAjo()
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setError(null)
    try {
      await closeAjo.mutateAsync(groupId)
      toast({ title: 'Circle closed', tone: 'success' })
      onOpenChange(false)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null)
        onOpenChange(next)
      }}
      title="Close this circle?"
      description="No more contributions or new members. Money already paid out stays where it is — this cannot be undone."
      dismissable={!closeAjo.isPending}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={closeAjo.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} loading={closeAjo.isPending} loadingText="Closing">
            Close circle
          </Button>
        </>
      }
    >
      {error ? (
        <p role="alert" className="rounded-[var(--radius-panel)] border border-clay-rule bg-clay-tint px-3 py-2.5 text-sm text-clay">
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

// ── Auto-Debit Dialog ─────────────────────────────────────────────────────────

function AutoDebitDialog({
  open,
  onOpenChange,
  groupId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: Uuid
}) {
  const { toast } = useToast()
  const setMode = useSetAjoPaymentMode()
  const [mode, setModeState] = useState<'manual' | 'auto'>('manual')
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    try {
      await setMode.mutateAsync({ id: groupId, mode })
      onOpenChange(false)
      toast({
        title: mode === 'auto' ? 'Auto-debit enabled' : 'Switched to manual',
        description:
          mode === 'auto'
            ? 'Your saved card will be charged automatically each cycle.'
            : 'You will contribute manually each cycle.',
        tone: 'success',
      })
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400 && caught.message.includes('mandate')) {
        setError(
          'You need a saved card before enabling auto-debit. Complete a manual contribution first — your card will be saved automatically after the first successful Paystack charge.',
        )
      } else {
        setError(errorMessage(caught))
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Contribution method"
      description="Choose how you contribute each cycle. Auto-debit requires a saved Paystack card (saved automatically after your first contribution)."
      dismissable={!setMode.isPending}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={setMode.isPending}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={setMode.isPending} loadingText="Saving">
            Save
          </Button>
        </>
      }
    >
      <fieldset className="space-y-3">
        <legend className="sr-only">Contribution method</legend>
        {(['manual', 'auto'] as const).map((m) => (
          <label
            key={m}
            className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-panel)] border p-4 transition-colors ${
              mode === m ? 'border-brand bg-brand-tint' : 'border-rule hover:border-rule-strong'
            }`}
          >
            <input
              type="radio"
              name="payment-mode"
              value={m}
              checked={mode === m}
              onChange={() => setModeState(m)}
              className="mt-0.5"
            />
            <div>
              <p className="font-medium text-ink">{m === 'manual' ? 'Manual' : 'Auto-debit'}</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                {m === 'manual'
                  ? 'You open Paystack checkout yourself each cycle.'
                  : 'Your saved card is charged automatically on the cycle date.'}
              </p>
            </div>
          </label>
        ))}
      </fieldset>

      {error ? (
        <p role="alert" className="mt-4 rounded-[var(--radius-panel)] border border-clay-rule bg-clay-tint px-3 py-2.5 text-sm text-clay">
          {error}
        </p>
      ) : null}
    </Dialog>
  )
}
