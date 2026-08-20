import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { PageHeader } from '~/components/domain/page-header'
import { Button } from '~/components/ui/button'
import { Field, Input, Select } from '~/components/ui/field'
import { MoneyInput } from '~/components/ui/money-input'
import { useToast } from '~/components/ui/toast'
import { useCreateAjo } from '~/lib/api/hooks'
import { errorMessage } from '~/lib/api/client'
import { ajoFeeKobo, formatKobo } from '~/lib/money'
import { MoneyAmount } from '~/components/domain/money-amount'
import type { AjoFrequency } from '~/lib/api/types'

/** Limits enforced by services/ajo.rs. Mirrored here so errors arrive sooner. */
const MIN_CONTRIBUTION_KOBO = 10_000
const MIN_MEMBERS = 2
const MAX_MEMBERS = 50

export const Route = createFileRoute('/_app/ajo/new')({
  component: NewAjoPage,
})

type FormErrors = Partial<Record<'name' | 'contribution' | 'members' | 'form', string>>

function NewAjoPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const createAjo = useCreateAjo()

  const [name, setName] = useState('')
  const [contributionKobo, setContributionKobo] = useState<number | null>(null)
  const [frequency, setFrequency] = useState<AjoFrequency>('weekly')
  const [memberCount, setMemberCount] = useState('5')
  const [errors, setErrors] = useState<FormErrors>({})

  const members = Number(memberCount)
  const fee = contributionKobo === null ? 0 : ajoFeeKobo(contributionKobo)
  const payout = contributionKobo === null ? 0 : contributionKobo - fee

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const next: FormErrors = {}
    const trimmed = name.trim()
    if (trimmed.length === 0 || trimmed.length > 100) {
      next.name = 'Give the circle a name of up to 100 characters.'
    }
    if (contributionKobo === null || contributionKobo < MIN_CONTRIBUTION_KOBO) {
      next.contribution = `The smallest contribution is ${formatKobo(MIN_CONTRIBUTION_KOBO)}.`
    }
    if (!Number.isInteger(members) || members < MIN_MEMBERS || members > MAX_MEMBERS) {
      next.members = `A circle holds between ${MIN_MEMBERS} and ${MAX_MEMBERS} people.`
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    try {
      const group = await createAjo.mutateAsync({
        name: trimmed,
        contribution_kobo: contributionKobo!,
        frequency,
        member_count: members,
      })
      toast({
        title: 'Circle created',
        description: 'Share the invite link so people can take their seats.',
        tone: 'success',
      })
      await navigate({ to: '/ajo/$groupId', params: { groupId: group.id } })
    } catch (caught) {
      setErrors({ form: errorMessage(caught) })
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Savings circles"
        title="Start a circle"
        description="You take the first payout position. Everyone who joins after you takes the next seat in order."
        back={{ to: '/ajo', label: 'All circles' }}
      />

      <form onSubmit={handleSubmit} noValidate className="max-w-xl">
        <div className="panel flex flex-col gap-5 px-5 py-5">
          <Field label="Circle name" error={errors.name} required>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              placeholder="Owambe Circle"
              autoFocus
            />
          </Field>

          <Field
            label="Contribution per cycle"
            hint="What each member pays in, every cycle."
            error={errors.contribution}
            required
          >
            <MoneyInput
              valueKobo={contributionKobo}
              onValueChange={setContributionKobo}
              minKobo={MIN_CONTRIBUTION_KOBO}
              presetsKobo={[100_000, 250_000, 500_000, 1_000_000]}
              invalid={Boolean(errors.contribution)}
            />
          </Field>

          <Field label="How often" required>
            <Select
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as AjoFrequency)}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
          </Field>

          <Field
            label="Number of members"
            hint="This sets how many cycles the circle runs for. One member collects per cycle."
            error={errors.members}
            required
          >
            <Input
              type="number"
              inputMode="numeric"
              min={MIN_MEMBERS}
              max={MAX_MEMBERS}
              value={memberCount}
              onChange={(event) => setMemberCount(event.target.value)}
              className="numeric"
            />
          </Field>
        </div>

        {contributionKobo !== null && contributionKobo >= MIN_CONTRIBUTION_KOBO ? (
          <div className="panel mt-4 px-5 py-4">
            <h2 className="label-caps">What this circle looks like</h2>
            <dl className="mt-3 divide-y divide-rule">
              <Row term="Each member pays per cycle">
                <MoneyAmount kobo={contributionKobo} size="md" />
              </Row>
              <Row term="Platform fee, taken from each payout">
                <MoneyAmount kobo={fee} size="sm" tone="muted" koboDigits="always" />
              </Row>
              <Row term="Collected by that cycle's recipient, per contribution">
                <MoneyAmount kobo={payout} size="md" tone="credit" />
              </Row>
              {Number.isInteger(members) && members >= MIN_MEMBERS && members <= MAX_MEMBERS ? (
                <>
                  <Row term="Cycles until the circle completes">
                    <span className="numeric text-[0.9375rem] text-ink">{members}</span>
                  </Row>
                  <Row term="What you pay in over the whole circle">
                    <MoneyAmount kobo={contributionKobo * members} size="md" />
                  </Row>
                  <Row term="What you collect on your turn">
                    <MoneyAmount kobo={payout * members} size="md" tone="credit" />
                  </Row>
                </>
              ) : null}
            </dl>
          </div>
        ) : null}

        {errors.form ? (
          <p
            role="alert"
            className="mt-4 rounded-[var(--radius-panel)] border border-clay-rule bg-clay-tint px-3 py-2.5 text-sm text-clay"
          >
            {errors.form}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={createAjo.isPending}
            loadingText="Creating the circle"
          >
            Create circle
          </Button>
          <Button size="lg" onClick={() => void navigate({ to: '/ajo' })}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  )
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-ink-muted">{term}</dt>
      <dd>{children}</dd>
    </div>
  )
}
