import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { PageHeader } from '~/components/domain/page-header'
import { MoneyAmount } from '~/components/domain/money-amount'
import { Button, IconButton } from '~/components/ui/button'
import { Field, Input, Label } from '~/components/ui/field'
import { MoneyInput } from '~/components/ui/money-input'
import { PhoneInput, isPlausiblePhone } from '~/components/ui/phone-input'
import { useToast } from '~/components/ui/toast'
import { CloseIcon, PlusIcon } from '~/components/icons'
import { useCreateBill } from '~/lib/api/hooks'
import { errorMessage } from '~/lib/api/client'
import { formatKobo, splitFloor } from '~/lib/money'

/** Limits enforced by services/bills.rs. */
const MIN_TOTAL_KOBO = 100
const MAX_PARTICIPANTS = 49

export const Route = createFileRoute('/_app/bills/new')({
  component: NewBillPage,
})

type FormErrors = Partial<Record<'title' | 'total' | 'participants' | 'form', string>>

function NewBillPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const createBill = useCreateBill()

  const [title, setTitle] = useState('')
  const [totalKobo, setTotalKobo] = useState<number | null>(null)
  const [phones, setPhones] = useState<string[]>([''])
  const [errors, setErrors] = useState<FormErrors>({})

  const validPhones = phones.map((phone) => phone.trim()).filter((phone) => isPlausiblePhone(phone))
  // The creator always counts as a participant, hence the +1.
  const headcount = validPhones.length + 1
  const preview = totalKobo === null ? null : splitFloor(totalKobo, headcount)

  function updatePhone(index: number, value: string) {
    setPhones((current) => current.map((phone, position) => (position === index ? value : phone)))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const next: FormErrors = {}
    const trimmedTitle = title.trim()
    if (trimmedTitle.length === 0 || trimmedTitle.length > 200) {
      next.title = 'Give the bill a name of up to 200 characters.'
    }
    if (totalKobo === null || totalKobo < MIN_TOTAL_KOBO) {
      next.total = `The smallest bill is ${formatKobo(MIN_TOTAL_KOBO)}.`
    }
    const entered = phones.filter((phone) => phone.trim() !== '')
    if (entered.some((phone) => !isPlausiblePhone(phone))) {
      next.participants = 'One of the numbers is not a valid Nigerian mobile number.'
    }
    if (entered.length > MAX_PARTICIPANTS) {
      next.participants = `You can add up to ${MAX_PARTICIPANTS} other people.`
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    try {
      const bill = await createBill.mutateAsync({
        title: trimmedTitle,
        total_kobo: totalKobo!,
        participant_phones: validPhones,
      })
      toast({ title: 'Bill created', description: 'Everyone can now settle their share.', tone: 'success' })
      await navigate({ to: '/bills/$billId', params: { billId: bill.id } })
    } catch (caught) {
      setErrors({ form: errorMessage(caught) })
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Bills"
        title="Split a bill"
        description="Enter the total and add everyone by the phone number they use on Cowri."
        back={{ to: '/bills', label: 'All bills' }}
      />

      <form onSubmit={handleSubmit} noValidate className="max-w-xl">
        <div className="panel flex flex-col gap-5 px-5 py-5">
          <Field label="What was it for" error={errors.title} required>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              placeholder="Dinner at Terra Kulture"
              autoFocus
            />
          </Field>

          <Field label="Total amount" error={errors.total} required>
            <MoneyInput
              valueKobo={totalKobo}
              onValueChange={setTotalKobo}
              minKobo={MIN_TOTAL_KOBO}
              invalid={Boolean(errors.total)}
            />
          </Field>

          <fieldset className="border-0 p-0">
            <legend className="mb-1.5">
              <Label>Who else is on this bill</Label>
            </legend>
            <p className="mb-3 text-[0.8125rem] leading-5 text-ink-faint">
              You are included automatically. A number that is not registered on Cowri is left out
              of the split, so check them before you send.
            </p>

            <div className="flex flex-col gap-2">
              {phones.map((phone, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <PhoneInput
                      value={phone}
                      onValueChange={(value) => updatePhone(index, value)}
                      aria-label={`Participant ${index + 1} phone number`}
                    />
                  </div>
                  <IconButton
                    label={`Remove participant ${index + 1}`}
                    onClick={() =>
                      setPhones((current) =>
                        current.length === 1 ? [''] : current.filter((_, position) => position !== index),
                      )
                    }
                  >
                    <CloseIcon size={18} />
                  </IconButton>
                </div>
              ))}
            </div>

            {errors.participants ? (
              <p role="alert" className="mt-2 text-[0.8125rem] text-clay">
                {errors.participants}
              </p>
            ) : null}

            <Button
              className="mt-3"
              size="sm"
              leading={<PlusIcon size={16} />}
              disabled={phones.length >= MAX_PARTICIPANTS}
              onClick={() => setPhones((current) => [...current, ''])}
            >
              Add another person
            </Button>
          </fieldset>
        </div>

        {preview && totalKobo !== null && totalKobo >= MIN_TOTAL_KOBO ? (
          <div className="panel mt-4 px-5 py-4">
            <h2 className="label-caps">How this splits</h2>
            <dl className="mt-3 divide-y divide-rule">
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-sm text-ink-muted">People on the bill, including you</dt>
                <dd className="numeric text-[0.9375rem] text-ink">{headcount}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-sm text-ink-muted">Each share</dt>
                <dd>
                  <MoneyAmount kobo={preview.shareKobo} size="md" koboDigits="always" />
                </dd>
              </div>
              {preview.unallocatedKobo > 0 ? (
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-sm text-ink-muted">
                    Left unallocated, because the total does not divide evenly
                  </dt>
                  <dd>
                    <MoneyAmount
                      kobo={preview.unallocatedKobo}
                      size="sm"
                      tone="debit"
                      koboDigits="always"
                    />
                  </dd>
                </div>
              ) : null}
            </dl>
            {preview.unallocatedKobo > 0 ? (
              <p className="mt-3 text-[0.8125rem] leading-6 text-ink-faint">
                Cowri rounds each share down to the kobo, so the shares add up to slightly less than
                the total. Round the total up if you need the full amount collected.
              </p>
            ) : null}
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
            loading={createBill.isPending}
            loadingText="Creating the bill"
          >
            Create bill
          </Button>
          <Button size="lg" onClick={() => void navigate({ to: '/bills' })}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  )
}
