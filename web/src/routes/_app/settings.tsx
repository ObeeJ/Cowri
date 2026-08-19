import { Link, createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/domain/page-header'
import { Badge } from '~/components/ui/display'
import { Button } from '~/components/ui/button'
import { Radio } from '~/components/ui/field'
import { ExternalIcon, ShieldIcon, SignOutIcon } from '~/components/icons'
import { useAuth } from '~/lib/auth'
import { useTheme, type ThemePreference } from '~/lib/theme'
import { formatDate } from '~/lib/format'
import { formatPhone } from '~/components/ui/phone-input'
import { API_BASE_URL } from '~/lib/api/client'

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
        ) : null}
        <p className="mt-4 text-[0.8125rem] leading-6 text-ink-faint">
          Cowri has no endpoint for editing these details yet. To change your name, phone number or
          email, contact support.
        </p>
      </section>

      <section className="panel mt-6 px-5 py-4">
        <h2 className="text-base text-ink">Security</h2>
        <p className="mt-1 text-sm leading-6 text-ink-muted">
          Your PIN authorises payments. Change it if you think anyone else has seen it.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/forgot-pin">
            <Button leading={<ShieldIcon size={16} />}>Change your PIN</Button>
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

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
      <dt className="text-sm text-ink-muted">{term}</dt>
      <dd className="text-[0.9375rem] text-ink">{children}</dd>
    </div>
  )
}
