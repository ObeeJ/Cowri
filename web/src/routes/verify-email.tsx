import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { AuthShell } from '~/components/layout/auth-shell'
import { Button } from '~/components/ui/button'
import { Field, Input } from '~/components/ui/field'
import { PinInput } from '~/components/ui/pin-input'
import { useResendOtp, useVerifyEmail } from '~/lib/api/hooks'
import { errorMessage } from '~/lib/api/client'
import { useToast } from '~/components/ui/toast'

type VerifySearch = { email?: string }

export const Route = createFileRoute('/verify-email')({
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const { email: prefilled } = useSearch({ from: '/verify-email' })
  const navigate = useNavigate()
  const { toast } = useToast()
  const verify = useVerifyEmail()
  const resend = useResendOtp()

  const [email, setEmail] = useState(prefilled ?? '')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(code: string) {
    setError(null)
    if (!email.includes('@')) {
      setError('Enter the email address you registered with.')
      return
    }
    if (code.length !== 6) {
      setError('The code is 6 digits.')
      return
    }
    try {
      await verify.mutateAsync({ email: email.trim(), otp: code })
      toast({ title: 'Email verified', description: 'You can sign in now.', tone: 'success' })
      await navigate({ to: '/login' })
    } catch (caught) {
      setError(errorMessage(caught))
      setOtp('')
    }
  }

  async function handleResend() {
    setError(null)
    try {
      await resend.mutateAsync({ email: email.trim() })
      toast({ title: 'New code sent', description: `Check ${email.trim()}.`, tone: 'success' })
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <AuthShell
      title="Confirm your email"
      description={
        <>
          We sent a 6 digit code to{' '}
          {prefilled ? <span className="text-ink">{prefilled}</span> : 'your email address'}. It
          expires after 15 minutes.
        </>
      }
      footer={
        <>
          Wrong address or already verified?{' '}
          <Link to="/login" className="font-medium text-accent underline underline-offset-4">
            Go to sign in
          </Link>
        </>
      }
    >
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault()
          void submit(otp)
        }}
        noValidate
        className="flex flex-col gap-5"
      >
        {prefilled ? null : (
          <Field label="Email address" required>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              inputMode="email"
            />
          </Field>
        )}

        <Field label="Verification code" error={error} required>
          <PinInput
            label="Verification code"
            length={6}
            autoComplete="one-time-code"
            autoFocus
            value={otp}
            onValueChange={setOtp}
            onComplete={(code) => void submit(code)}
            invalid={Boolean(error)}
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={verify.isPending}
          loadingText="Checking the code"
        >
          Verify email
        </Button>

        <div className="flex items-center justify-between gap-3 border-t border-rule pt-4">
          <p className="text-[0.8125rem] text-ink-muted">Code did not arrive?</p>
          <Button size="sm" onClick={handleResend} loading={resend.isPending} loadingText="Sending">
            Send a new code
          </Button>
        </div>
      </form>
    </AuthShell>
  )
}
