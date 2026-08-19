import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { AuthShell } from '~/components/layout/auth-shell'
import { Button } from '~/components/ui/button'
import { Field, Input } from '~/components/ui/field'
import { PinInput } from '~/components/ui/pin-input'
import { useForgotPin, useResetPin } from '~/lib/api/hooks'
import { errorMessage } from '~/lib/api/client'
import { useToast } from '~/components/ui/toast'

type ResetSearch = { email?: string }

export const Route = createFileRoute('/reset-pin')({
  validateSearch: (search: Record<string, unknown>): ResetSearch => ({
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
  component: ResetPinPage,
})

type FormErrors = Partial<Record<'email' | 'otp' | 'pin' | 'confirmPin' | 'form', string>>

function ResetPinPage() {
  const { email: prefilled } = useSearch({ from: '/reset-pin' })
  const navigate = useNavigate()
  const { toast } = useToast()
  const resetPin = useResetPin()
  const forgotPin = useForgotPin()

  const [email, setEmail] = useState(prefilled ?? '')
  const [otp, setOtp] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const next: FormErrors = {}
    if (!email.includes('@')) next.email = 'Enter the email address on your account.'
    if (otp.length !== 6) next.otp = 'The reset code is 6 digits.'
    if (pin.length < 4) next.pin = 'Choose a new PIN of 4 to 6 digits.'
    if (confirmPin !== pin) next.confirmPin = 'The two PINs do not match.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    try {
      await resetPin.mutateAsync({ email: email.trim(), otp, new_pin: pin })
      toast({ title: 'PIN changed', description: 'Sign in with your new PIN.', tone: 'success' })
      await navigate({ to: '/login' })
    } catch (caught) {
      setErrors({ form: errorMessage(caught) })
      setOtp('')
    }
  }

  return (
    <AuthShell
      title="Set a new PIN"
      description="Enter the code from your email, then choose the PIN you will use for payments."
      footer={
        <>
          Need a new code?{' '}
          <button
            type="button"
            onClick={() => void forgotPin.mutateAsync({ email: email.trim() })}
            className="cursor-pointer font-medium text-accent underline underline-offset-4"
          >
            Send another
          </button>
          {' · '}
          <Link to="/login" className="font-medium text-accent underline underline-offset-4">
            Back to sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Field label="Email address" error={errors.email} required>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
          />
        </Field>

        <Field label="Reset code" error={errors.otp} required>
          <PinInput
            label="Reset code"
            length={6}
            autoComplete="one-time-code"
            value={otp}
            onValueChange={setOtp}
            invalid={Boolean(errors.otp)}
            autoFocus={Boolean(prefilled)}
          />
        </Field>

        <Field label="New PIN" hint="4 to 6 digits." error={errors.pin} required>
          <PinInput
            label="New PIN"
            secret
            value={pin}
            onValueChange={setPin}
            invalid={Boolean(errors.pin)}
          />
        </Field>

        <Field label="Confirm new PIN" error={errors.confirmPin} required>
          <PinInput
            label="Confirm new PIN"
            secret
            value={confirmPin}
            onValueChange={setConfirmPin}
            invalid={Boolean(errors.confirmPin)}
          />
        </Field>

        {errors.form ? (
          <p
            role="alert"
            className="rounded-[var(--radius-panel)] border border-clay-rule bg-clay-tint px-3 py-2.5 text-sm text-clay"
          >
            {errors.form}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={resetPin.isPending}
          loadingText="Saving your new PIN"
        >
          Save new PIN
        </Button>
      </form>
    </AuthShell>
  )
}
