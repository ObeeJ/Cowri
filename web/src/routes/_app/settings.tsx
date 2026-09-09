import { Link, createFileRoute } from '@tanstack/react-router'
import { useRef, useState, type FormEvent } from 'react'
import { PageHeader } from '~/components/domain/page-header'
import { StatusPill } from '~/components/domain/status-pill'
import { Avatar, Badge } from '~/components/ui/display'
import { Button } from '~/components/ui/button'
import { Field, Input, Radio } from '~/components/ui/field'
import { PinInput } from '~/components/ui/pin-input'
import { useToast } from '~/components/ui/toast'
import { ExternalIcon, ShieldIcon, SignOutIcon } from '~/components/icons'
import { useAuth } from '~/lib/auth'
import { useInitializeMandate, useMandates, useUploadMedia, useVerifyBvn } from '~/lib/api/hooks'
import { ApiError, errorMessage, API_BASE_URL } from '~/lib/api/client'
import { useTheme, type ThemePreference } from '~/lib/theme'
import { formatDate } from '~/lib/format'
import { formatPhone } from '~/components/ui/phone-input'
import type { KycStatus } from '~/lib/api/types'

const MAX_AVATAR_BYTES = 10 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { user, isAdmin, signOut } = useAuth()
  const { preference, setPreference } = useTheme()

  return (
    <>
      <PageHeader
        title="Profile and settings"
        description="What Cowri knows about your account, and how this app behaves on this device."
      />

      <section className="panel px-5 py-4">
        <h2 className="text-base text-ink">Your account</h2>
        {user ? (
          <>
            <AvatarUpload />
            <dl className="mt-3 divide-y divide-rule">
              <Row term="Name">{user.name}</Row>
              <Row term="Phone number">
                <span className="numeric">{formatPhone(user.phone)}</span>
              </Row>
              <Row term="Email">
                <span className="flex flex-wrap items-center gap-2">
                  {user.email ?? 'Not set'}
                  {user.email_verified ? (
                    <Badge tone="accent">Verified</Badge>
                  ) : (
                    <Badge tone="clay">Not verified</Badge>
                  )}
                </span>
              </Row>
              <Row term="Role">{isAdmin ? <Badge tone="accent">Administrator</Badge> : 'Member'}</Row>
              <Row term="Member since">{formatDate(user.created_at)}</Row>
            </dl>
          </>
        ) : null}
        <p className="mt-4 text-[0.8125rem] leading-6 text-ink-faint">
          Cowri has no endpoint for editing these details yet. To change your name, phone number or
          email, contact support.
        </p>
      </section>

      <KycSection />

      <AutoDebitSection />

      <section className="panel mt-6 px-5 py-4">
        <h2 className="text-base text-ink">Security</h2>
        <p className="mt-1 text-sm leading-6 text-ink-muted">
          Your password signs you in. Change it if you think anyone else has seen it. Your
          transaction PIN is asked for separately, every time you move money.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/forgot-password">
            <Button leading={<ShieldIcon size={16} />}>Change your password</Button>
          </Link>
          <Button variant="danger" leading={<SignOutIcon size={16} />} onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
        <p className="mt-3 text-[0.8125rem] leading-6 text-ink-faint">
          Signing out clears your session on the server as well as in this browser, so the tokens
          cannot be reused.
        </p>
      </section>

      <section className="panel mt-6 px-5 py-4">
        <h2 className="text-base text-ink">Appearance</h2>
        <fieldset className="mt-3 border-0 p-0">
          <legend className="sr-only">Theme</legend>
          <div className="flex flex-col gap-1">
            {(
              [
                { value: 'system', label: 'Match my device', description: 'Follows your system setting.' },
                { value: 'light', label: 'Light', description: 'Warm paper canvas.' },
                { value: 'dark', label: 'Dark', description: 'Ink-dyed board.' },
              ] as Array<{ value: ThemePreference; label: string; description: string }>
            ).map((option) => (
              <Radio
                key={option.value}
                name="theme"
                value={option.value}
                label={option.label}
                description={option.description}
                checked={preference === option.value}
                onChange={() => setPreference(option.value)}
              />
            ))}
          </div>
        </fieldset>
      </section>

      <section className="panel mt-6 px-5 py-4">
        <h2 className="text-base text-ink">This app</h2>
        <dl className="mt-3 divide-y divide-rule">
          <Row term="API endpoint">
            <span className="numeric text-[0.8125rem]">{API_BASE_URL}</span>
          </Row>
          <Row term="Legal">
            <span className="flex flex-wrap gap-3">
              <Link to="/terms" className="text-accent underline underline-offset-4">
                Terms of Service
              </Link>
              <Link to="/privacy" className="text-accent underline underline-offset-4">
                Privacy Policy
              </Link>
            </span>
          </Row>
          <Row term="Design system">
            <Link
              to="/design-system"
              className="inline-flex items-center gap-1.5 text-accent underline underline-offset-4"
            >
              Component documentation
              <ExternalIcon size={15} />
            </Link>
          </Row>
        </dl>
      </section>
    </>
  )
}

function AvatarUpload() {
  const { user, setUser } = useAuth()
  const uploadMedia = useUploadMedia()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // let the same file be re-picked after an error
    if (!file) return

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast({ title: 'Unsupported file type', description: 'Use a JPEG, PNG or WebP image.', tone: 'warning' })
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ title: 'Image is too large', description: 'Keep it under 10MB.', tone: 'warning' })
      return
    }

    try {
      const media = await uploadMedia.mutateAsync({ file, purpose: 'avatar' })
      setUser({ ...user!, avatar_url: media.public_url })
      toast({ title: 'Profile photo updated', tone: 'success' })
    } catch (caught) {
      toast({ title: 'Could not update your photo', description: errorMessage(caught), tone: 'warning' })
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={user.name} src={user.avatar_url} size="lg" />
      <div>
        <Button size="sm" loading={uploadMedia.isPending} loadingText="Uploading" onClick={() => inputRef.current?.click()}>
          Change photo
        </Button>
        <p className="mt-1 text-[0.8125rem] text-ink-faint">JPEG, PNG or WebP, up to 10MB.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_AVATAR_TYPES.join(',')}
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}

function isPlausibleBvn(bvn: string): boolean {
  return /^\d{11}$/.test(bvn)
}

function KycSection() {
  const { user, setUser } = useAuth()
  const verifyBvn = useVerifyBvn()
  const [bvn, setBvn] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!user) return null
  const canSubmit = user.kyc_status === 'unverified' || user.kyc_status === 'failed'

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!isPlausibleBvn(bvn)) {
      setError('Enter your 11-digit BVN.')
      return
    }
    try {
      const result = await verifyBvn.mutateAsync({ bvn })
      setUser({ ...user!, kyc_status: result.kyc_status })
      setBvn('')
    } catch (caught) {
      // A rejected verification (422) still carries a fresh kyc_status —
      // reflect it rather than leaving the badge stuck on the old one.
      if (caught instanceof ApiError && caught.status === 422) {
        const body = caught.body as { kyc_status?: KycStatus } | undefined
        if (body?.kyc_status) setUser({ ...user!, kyc_status: body.kyc_status })
      }
      setError(errorMessage(caught))
    }
  }

  return (
    <section className="panel mt-6 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base text-ink">Identity verification</h2>
        <StatusPill kind="kyc" status={user.kyc_status} />
      </div>
      <p className="mt-1 text-sm leading-6 text-ink-muted">
        Verifying your BVN confirms it's really you — Cowri sends it once, straight to our
        verification partner, and never stores the number itself.
      </p>

      {canSubmit ? (
        <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-3 sm:max-w-sm">
          <Field label="Bank Verification Number" error={error} required>
            <Input
              value={bvn}
              onChange={(event) => setBvn(event.target.value.replace(/\D/g, '').slice(0, 11))}
              inputMode="numeric"
              maxLength={11}
              placeholder="22112345678"
              autoComplete="off"
            />
          </Field>
          <Button
            type="submit"
            variant="primary"
            loading={verifyBvn.isPending}
            loadingText="Verifying"
            className="self-start"
          >
            Verify BVN
          </Button>
        </form>
      ) : user.kyc_status === 'verified' ? (
        <p className="mt-3 text-[0.8125rem] leading-6 text-ink-faint">Your identity is verified.</p>
      ) : null}
    </section>
  )
}

function AutoDebitSection() {
  const mandates = useMandates()
  const init = useInitializeMandate()
  const { toast } = useToast()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const active = (mandates.data?.mandates ?? []).filter((m) => m.status === 'active')

  async function handleLink() {
    setError(null)
    if (pin.length < 4) {
      setError('Enter your transaction PIN.')
      return
    }
    try {
      await init.mutateAsync(pin)
      toast({
        title: 'Opening Paystack',
        description: 'A ₦100 charge links a reusable card for Ajo auto-debit. Cowri does not store the card.',
        tone: 'success',
      })
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <section className="panel mt-6 px-5 py-4">
      <h2 className="text-base text-ink">Auto-debit card</h2>
      <p className="mt-1 text-sm leading-6 text-ink-muted">
        Link a card via Paystack (₦100 checkout). We store only a reusable authorization code so
        Ajo can charge on the circle&apos;s schedule. Money still moves at Paystack — not in a Cowri vault.
      </p>
      {mandates.isPending ? (
        <p className="mt-3 text-sm text-ink-faint">Checking linked cards…</p>
      ) : active.length > 0 ? (
        <ul className="mt-3 text-sm text-ink">
          {active.map((m) => (
            <li key={m.id}>
              {m.card_type ?? 'Card'} {m.card_last4 ? `ending ${m.card_last4}` : ''}{' '}
              {m.bank ? `· ${m.bank}` : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink-faint">No card linked yet.</p>
      )}
      <div className="mt-4 flex max-w-sm flex-col gap-3">
        <Field label="Transaction PIN" error={error} required>
          <PinInput label="Transaction PIN" value={pin} onValueChange={setPin} length={4} secret />
        </Field>
        <Button
          variant="primary"
          onClick={() => void handleLink()}
          loading={init.isPending}
          loadingText="Starting checkout"
          className="self-start"
        >
          {active.length > 0 ? 'Link another card' : 'Link card (₦100)'}
        </Button>
      </div>
    </section>
  )
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
      <dt className="text-sm text-ink-muted">{term}</dt>
      <dd className="text-[0.9375rem] text-ink">{children}</dd>
    </div>
  )
}
