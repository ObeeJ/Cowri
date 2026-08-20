import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { AuthShell } from '~/components/layout/auth-shell'
import { Button } from '~/components/ui/button'
import { Field, Input } from '~/components/ui/field'
import { PhoneInput, isPlausiblePhone } from '~/components/ui/phone-input'
import { PinInput } from '~/components/ui/pin-input'
import { useRegister } from '~/lib/api/hooks'
import { errorMessage } from '~/lib/api/client'
import { useToast } from '~/components/ui/toast'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

type FormErrors = Partial<Record<'name' | 'phone' | 'email' | 'pin' | 'confirmPin' | 'form', string>>

function RegisterPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const register = useRegister()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  function validate(): FormErrors {
    const next: FormErrors = {}
    const trimmedName = name.trim()
    if (trimmedName.length === 0 || trimmedName.length > 100) {
      next.name = 'Enter your name, up to 100 characters.'
    }
    if (!isPlausiblePhone(phone)) next.phone = 'Enter a valid Nigerian mobile number.'
    if (!email.includes('@') || email.trim().length === 0 || email.length > 254) {
      next.email = 'Enter an email address you can open right now.'
    }
    if (pin.length < 4) next.pin = 'Choose a PIN of 4 to 6 digits.'
    if (confirmPin !== pin) next.confirmPin = 'The two PINs do not match.'
    return next
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await register.mutateAsync({ name: name.trim(), phone, email: email.trim(), pin })
      toast({
        title: 'Account created',
        description: 'We sent a 6 digit code to your email address.',
        tone: 'success',
      })
      await navigate({ to: '/verify-email', search: { email: email.trim() } })
    } catch (error) {
      setErrors({ form: errorMessage(error) })
    }
  }

  return (
    <AuthShell
      title="Create your Cowri account"
      description="You will need an email address to confirm the account, and a PIN you can remember for payments."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Field label="Full name" error={errors.name} required>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            maxLength={100}
            autoFocus
          />
        </Field>

        <Field
          label="Phone number"
          hint="This is what you sign in with, and how friends find you when splitting a bill."
          error={errors.phone}
          required
        >
          <PhoneInput value={phone} onValueChange={setPhone} autoComplete="tel-national" />
        </Field>

        <Field label="Email address" error={errors.email} required>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            maxLength={254}
          />
        </Field>

        <Field label="Choose a PIN" hint="4 to 6 digits." error={errors.pin} required>
          <PinInput
            label="Choose a PIN"
            secret
            length={4}
            value={pin}
            onValueChange={setPin}
            invalid={Boolean(errors.pin)}
          />
        </Field>

        <Field label="Confirm your PIN" error={errors.confirmPin} required>
          <PinInput
            label="Confirm your PIN"
            secret
            length={4}
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
          loading={register.isPending}
          loadingText="Creating your account"
        >
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}
