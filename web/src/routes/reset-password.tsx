import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { AuthShell } from '~/components/layout/auth-shell'
import { Button, IconButton } from '~/components/ui/button'
import { Field, Input } from '~/components/ui/field'
import { EyeIcon, EyeOffIcon } from '~/components/icons'
import { PinInput } from '~/components/ui/pin-input'
import { useForgotPassword, useResetPassword } from '~/lib/api/hooks'
import { errorMessage } from '~/lib/api/client'
import { useToast } from '~/components/ui/toast'

type ResetSearch = { email?: string }

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>): ResetSearch => ({
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
  component: ResetPasswordPage,
})

type FormErrors = Partial<Record<'email' | 'otp' | 'password' | 'confirmPassword' | 'form', string>>

function ResetPasswordPage() {
  const { email: prefilled } = useSearch({ from: '/reset-password' })
  const navigate = useNavigate()
  const { toast } = useToast()
  const resetPassword = useResetPassword()
  const forgotPassword = useForgotPassword()

  const [email, setEmail] = useState(prefilled ?? '')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const next: FormErrors = {}
    if (!email.includes('@')) next.email = 'Enter the email address on your account.'
    if (otp.length !== 6) next.otp = 'The reset code is 6 digits.'
    if (password.length < 8) next.password = 'Choose a password of at least 8 characters.'
    if (confirmPassword !== password) next.confirmPassword = 'The two passwords do not match.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    try {
      await resetPassword.mutateAsync({ email: email.trim(), otp, new_password: password })
      toast({ title: 'Password changed', description: 'Sign in with your new password.', tone: 'success' })
      await navigate({ to: '/login' })
    } catch (caught) {
      setErrors({ form: errorMessage(caught) })
      setOtp('')
    }
  }

  return (
    <AuthShell
      title="Set a new password"
      description="Enter the code from your email, then choose the password you will sign in with."
      footer={
        <>
          Need a new code?{' '}
          <button
            type="button"
            onClick={() => void forgotPassword.mutateAsync({ email: email.trim() })}
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

        <Field label="New password" hint="At least 8 characters, with letters and numbers." error={errors.password} required>
          <Input
            type={revealed ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            invalid={Boolean(errors.password)}
            suffix={
              <IconButton
                type="button"
                label={revealed ? 'Hide password' : 'Show password'}
                size="sm"
                onClick={() => setRevealed((current) => !current)}
              >
                {revealed ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </IconButton>
            }
          />
        </Field>

        <Field label="Confirm new password" error={errors.confirmPassword} required>
          <Input
            type={revealed ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            invalid={Boolean(errors.confirmPassword)}
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
          loading={resetPassword.isPending}
          loadingText="Saving your new password"
        >
          Save new password
        </Button>
      </form>
    </AuthShell>
  )
}
