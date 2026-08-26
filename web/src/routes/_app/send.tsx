import { createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { PageHeader } from '~/components/domain/page-header'
import { Button } from '~/components/ui/button'
import { Field } from '~/components/ui/field'
import { MoneyInput } from '~/components/ui/money-input'
import { PhoneInput, isPlausiblePhone } from '~/components/ui/phone-input'
import { PinInput } from '~/components/ui/pin-input'
import { useToast } from '~/components/ui/toast'
import { api, errorMessage, newIdempotencyKey } from '~/lib/api/client'
import { formatKobo } from '~/lib/money'

export const Route = createFileRoute('/_app/send')({
  component: SendMoneyPage,
})

function SendMoneyPage() {
  const { toast } = useToast()
  const [phone, setPhone] = useState('')
  const [amountKobo, setAmountKobo] = useState<number | null>(null)
  const [transactionPin, setTransactionPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!isPlausiblePhone(phone)) {
      setError('Enter a valid Nigerian mobile number on Cowri.')
      return
    }
    if (amountKobo === null || amountKobo < 100) {
      setError(`Minimum send is ${formatKobo(100)}.`)
      return
    }
    if (transactionPin.length < 4) {
      setError('Enter your transaction PIN.')
      return
    }
    setLoading(true)
    try {
      const res = await api.payments.p2p(
        {
          to_phone: phone.trim(),
          amount_kobo: amountKobo,
          transaction_pin: transactionPin,
        },
        newIdempotencyKey(),
      )
      toast({
        title: 'Opening secure checkout',
        description: `Send ${formatKobo(amountKobo)} via Paystack.`,
        tone: 'success',
      })
      window.location.assign(res.authorization_url)
    } catch (caught) {
      setError(errorMessage(caught))
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Send money"
        description="Pay another Cowri user directly through Paystack. Cowri coordinates the payment — it does not hold the funds."
        back={{ to: '/wallet', label: 'Activity' }}
      />

      <form onSubmit={handleSubmit} noValidate className="panel max-w-md flex flex-col gap-5 px-5 py-5">
        <Field label="Recipient phone" required>
          <PhoneInput value={phone} onValueChange={setPhone} />
        </Field>
        <Field label="Amount" required>
          <MoneyInput valueKobo={amountKobo} onValueChange={setAmountKobo} />
        </Field>
        <Field label="Transaction PIN" required>
          <PinInput label="Transaction PIN" value={transactionPin} onValueChange={setTransactionPin} length={4} />
        </Field>
        {error ? <p className="text-sm text-clay">{error}</p> : null}
        <Button type="submit" variant="primary" loading={loading} loadingText="Starting checkout">
          Continue to Paystack
        </Button>
      </form>
    </>
  )
}
