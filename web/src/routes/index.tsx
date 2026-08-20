import { Link, createFileRoute } from '@tanstack/react-router'
import { MarketingShell } from '~/components/layout/marketing-shell'
import { Button } from '~/components/ui/button'
import { ArrowIcon, CircleGroupIcon, ReceiptIcon, ShellIcon, SplitIcon, WalletIcon } from '~/components/icons'

export const Route = createFileRoute('/')({
  component: HomePage,
})

const features = [
  {
    icon: CircleGroupIcon,
    label: 'Savings circles',
    caption: 'Contribute on a schedule, take turns collecting',
  },
  {
    icon: SplitIcon,
    label: 'Split payments',
    caption: 'Fair shares, settled from your wallet',
  },
  {
    icon: WalletIcon,
    label: 'One wallet',
    caption: 'Fund once, use it everywhere',
  },
  {
    icon: ReceiptIcon,
    label: 'A ledger you can check',
    caption: 'Every entry accounted for',
  },
]

function HomePage() {
  return (
    <MarketingShell>
      {/* Hero: one centered column, one CTA, nothing to scroll past to find it. */}
      <section className="px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <ShellIcon size={40} className="text-accent" />

          <p className="label-caps mt-6">Social finance, together</p>

          <h1 className="mt-3 text-[2.25rem] leading-[1.15] text-ink sm:text-[2.75rem]">
            Contribute together. Split what you owe.
          </h1>

          <p className="mt-4 max-w-md text-base leading-7 text-ink-muted">
            Cowri is a social finance app for joint savings circles and splitting payments with
            people you trust.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link to="/register">
              <Button variant="primary" size="lg" trailing={<ArrowIcon size={18} />}>
                Get started
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-sm text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-accent underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      {/* What Cowri does, named plainly, without explaining how. The how lives
          on its own page for anyone who wants it. */}
      <section className="border-y border-rule bg-paper-raised">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:px-6 md:grid-cols-4 md:gap-x-8">
          {features.map((feature) => (
            <div key={feature.label} className="flex flex-col items-center text-center">
              <feature.icon size={24} className="text-accent" />
              <p className="mt-3 text-sm font-semibold text-ink">{feature.label}</p>
              <p className="mt-1 text-[0.8125rem] leading-5 text-ink-muted">{feature.caption}</p>
            </div>
          ))}
        </div>
      </section>

      {/* One line, one button. No second sales pitch. */}
      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
          <p className="text-lg leading-8 text-ink">Set up your wallet in a couple of minutes.</p>
          <Link to="/register">
            <Button variant="primary" size="lg">
              Create your account
            </Button>
          </Link>
        </div>
      </section>
    </MarketingShell>
  )
}
