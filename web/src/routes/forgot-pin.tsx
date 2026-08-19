import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { AuthShell } from '~/components/layout/auth-shell'
import { Button } from '~/components/ui/button'
import { Field, Input } from '~/components/ui/field'
import { useForgotPin } from '~/lib/api/hooks'
import { errorMessage } from '~/lib/api/client'

export const Route = createFileRoute('/forgot-pin')({
  component: ForgotPinPage,
})

function ForgotPinPage() {
  const navigate = useNavigate()
  const forgotPin = useForgotPin()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!email.includes('@')) {
      setError('Enter the email address on your account.')
      return
    }
    try {
      await forgotPin.mutateAsync({ email: email.trim() })
      // The API answers the same way whether or not the address is registered,
      // so this screen does too. Move straight on to the reset step.
      await navigate({ to: '/reset-pin', search: { email: email.trim() } })
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <AuthShell
      title="Reset your PIN"
      description="Enter the email address on your account and we will send a 6 digit reset code."
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-accent underline underline-offset-4">
            Back to sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Field label="Email address" error={error} required>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            autoFocus
          />
        </Field>

        <p className="text-[0.8125rem] leading-6 text-ink-faint">
          For your safety Cowri does not confirm whether an address is registered. If it is, the code
          will arrive within a minute or two.
        </p>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={forgotPin.isPending}
          loadingText="Sending the code"
        >
          Send reset code
        </Button>
      </form>
    </AuthShell>
  )
}
