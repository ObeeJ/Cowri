import { Link, createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { AuthShell } from '~/components/layout/auth-shell'
import { Button, IconButton } from '~/components/ui/button'
import { Field, Input } from '~/components/ui/field'
import { EyeIcon, EyeOffIcon } from '~/components/icons'
import { PhoneInput, isPlausiblePhone } from '~/components/ui/phone-input'
import { ApiError, errorMessage } from '~/lib/api/client'
import { useAuth } from '~/lib/auth'
import { useToast } from '~/components/ui/toast'

type LoginSearch = { redirect?: string; phone?: string }

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    phone: typeof search.phone === 'string' ? search.phone : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect, phone: prefilledPhone } = useSearch({ from: '/login' })
  const router = useRouter()
  const { signIn } = useAuth()
  const { toast } = useToast()

  const [phone, setPhone] = useState(prefilledPhone ?? '')
  const [password, setPassword] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [errors, setErrors] = useState<{ phone?: string; password?: string; form?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [unverifiedEmailPrompt, setUnverifiedEmailPrompt] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    if (!isPlausiblePhone(phone)) nextErrors.phone = 'Enter the phone number on your account.'
    if (password.length < 8) nextErrors.password = 'Enter your password.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setUnverifiedEmailPrompt(false)
    try {
      await signIn({ phone, password })
      // Only ever an internal path from the route guard. A value that is not a
      // same-site path is discarded rather than followed, so the redirect
      // parameter cannot be used to bounce someone off to another origin.
      const target =
        redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard'
      router.history.push(target)
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnverifiedEmailPrompt(true)
        setErrors({ form: error.message })
      } else {
        setErrors({ form: errorMessage(error) })
      }
      toast({ title: 'Could not sign you in', description: errorMessage(error), tone: 'warning' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Sign in"
      description="Use the phone number and password you registered with."
      footer={
        <>
          New to Cowri?{' '}
          <Link to="/register" className="font-medium text-accent underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Field label="Phone number" error={errors.phone} required>
          <PhoneInput
            value={phone}
            onValueChange={setPhone}
            autoComplete="tel-national"
            autoFocus
          />
        </Field>

        <Field
          label="Password"
          error={errors.password}
          required
          action={
            <Link
              to="/forgot-password"
              className="text-[0.8125rem] text-accent underline underline-offset-4"
            >
              Forgot your password?
            </Link>
          }
        >
          <Input
            type={revealed ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
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

        {errors.form ? (
          <p role="alert" className="rounded-[var(--radius-panel)] border border-clay-rule bg-clay-tint px-3 py-2.5 text-sm text-clay">
            {errors.form}
            {unverifiedEmailPrompt ? (
              <>
                {' '}
                <Link to="/verify-email" className="font-medium underline underline-offset-4">
                  Verify your email
                </Link>
              </>
            ) : null}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={submitting}
          loadingText="Signing in"
        >
          Sign in
        </Button>
      </form>
    </AuthShell>
  )
}
