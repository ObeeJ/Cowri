import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '~/components/domain/page-header'
import { Button } from '~/components/ui/button'
import { ErrorState } from '~/components/ui/states'
import { useToast } from '~/components/ui/toast'
import { CircleGroupIcon } from '~/components/icons'
import { useJoinAjo } from '~/lib/api/hooks'
import { ApiError } from '~/lib/api/client'

/**
 * The landing page for an invite link.
 *
 * The API only lets members read a circle's detail, so there is nothing to show
 * about the circle before joining. This page is therefore an explicit confirm
 * step rather than a preview: it explains what joining commits you to, then
 * sends you to the circle once you are in.
 */
export const Route = createFileRoute('/_app/ajo/join/$groupId')({
  component: JoinAjoPage,
})

function JoinAjoPage() {
  const { groupId } = useParams({ from: '/_app/ajo/join/$groupId' })
  const navigate = useNavigate()
  const { toast } = useToast()
  const join = useJoinAjo()
  const [error, setError] = useState<unknown>(null)

  async function handleJoin() {
    setError(null)
    try {
      const member = await join.mutateAsync(groupId)
      toast({
        title: 'You are in',
        description: `You hold payout position ${member.payout_position + 1}.`,
        tone: 'success',
      })
      await navigate({ to: '/ajo/$groupId', params: { groupId } })
    } catch (caught) {
      if (caught instanceof ApiError && caught.isConflict) {
        // Already a member, or the circle filled up. Either way the circle page
        // is the right place to land.
        if (caught.message.toLowerCase().includes('already')) {
          await navigate({ to: '/ajo/$groupId', params: { groupId } })
          return
        }
      }
      setError(caught)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Invitation"
        title="Join this savings circle"
        back={{ to: '/ajo', label: 'All circles' }}
      />

      <div className="panel max-w-xl px-5 py-6">
        <span className="text-ink-faint">
          <CircleGroupIcon size={30} />
        </span>
        <h2 className="mt-3 text-lg text-ink">What joining means</h2>
        <ul className="mt-3 flex flex-col gap-3 text-sm leading-6 text-ink-muted">
          <li>
            You take the next open seat. Your position in that order decides which cycle you collect
            the pot.
          </li>
          <li>
            You contribute the circle's fixed amount every cycle, taken from your wallet balance at
            the moment you contribute.
          </li>
          <li>
            A small platform fee is deducted from each payout, not from your contribution.
          </li>
        </ul>
        <p className="mt-4 text-[0.8125rem] leading-6 text-ink-faint">
          Cowri cannot show you the circle's name or terms until you are a member, because the API
          only releases those details to members.
        </p>

        {error ? <ErrorState className="mt-5" error={error} title="Could not join" /> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="lg"
            onClick={handleJoin}
            loading={join.isPending}
            loadingText="Joining"
          >
            Join the circle
          </Button>
          <Button size="lg" onClick={() => void navigate({ to: '/ajo' })}>
            Not now
          </Button>
        </div>
      </div>
    </>
  )
}
