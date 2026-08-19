import { Link, createFileRoute } from '@tanstack/react-router'
import { MarketingShell } from '~/components/layout/marketing-shell'
import { AjoPreview, WalletPreview } from '~/components/marketing/product-preview'
import { Button } from '~/components/ui/button'
import { ArrowIcon, ReceiptIcon, ShieldIcon } from '~/components/icons'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <MarketingShell>
      {/* Hero. Text column is deliberately narrower than the product column, and
          the whole thing sits left of centre rather than being centred. */}
      <section className="border-b border-rule">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16 lg:py-20">
          <div className="max-w-prose">
            <p className="label-caps">Ajo, bills and a wallet</p>
            <h1 className="mt-3 text-[2.5rem] leading-[1.08] text-ink sm:text-[3.25rem]">
              Save together the way you already do, with the books kept properly.
            </h1>
            <p className="mt-5 text-base leading-7 text-ink-muted">
              Cowri runs the rotating savings circle you would otherwise track in a notebook, splits
              bills among people by phone number, and keeps the money in a wallet backed by a double
              entry ledger.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/register">
                <Button variant="primary" size="lg" trailing={<ArrowIcon size={18} />}>
                  Create an account
                </Button>
              </Link>
              <Link to="/how-ajo-works">
                <Button variant="link" size="lg">
                  See how a circle works
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-[0.8125rem] leading-6 text-ink-faint">
              Top-ups are handled by Paystack. Cowri never sees your card details.
            </p>
          </div>

          <WalletPreview className="lg:pt-6" />
        </div>
      </section>

      {/* The ledger claim, stated plainly on a single band rather than split
          into feature cards. */}
      <section className="border-b border-rule bg-paper-raised">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
            <h2 className="text-2xl leading-8 text-ink">Every kobo has two sides</h2>
            <div className="max-w-prose">
              <p className="text-base leading-7 text-ink-muted">
                Balances are not a number that gets edited. Each movement writes a matching debit and
                credit into an append-only ledger, and the wallet balance is derived from those
                entries. There is a reconciliation endpoint that recomputes every wallet from its
                entries and reports any wallet that disagrees.
              </p>
              <p className="mt-4 text-base leading-7 text-ink-muted">
                Amounts are stored as whole kobo. No floating point arithmetic touches your money at
                any point, in the API or in this interface.
              </p>
              <Link
                to="/security"
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent underline decoration-accent-rule underline-offset-4 hover:decoration-accent"
              >
                <ShieldIcon size={17} />
                How Cowri handles your money and data
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Ajo, with the product visual leading and the prose following. */}
      <section className="border-b border-rule">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-16">
          <AjoPreview />
          <div className="max-w-prose lg:pt-4">
            <p className="label-caps">Savings circles</p>
            <h2 className="mt-3 text-[1.75rem] leading-9 text-ink">
              One person collects each cycle, in an order everybody can see
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-muted">
              Set the contribution and how many people are in the circle. Members join through an
              invite link and take the next seat in the payout order. When everyone has contributed
              for a cycle, the circle advances and the next member collects.
            </p>
            <p className="mt-4 text-base leading-7 text-ink-muted">
              Contributions move straight from your wallet balance. If the money is not there, the
              contribution is refused rather than putting you into an overdraft.
            </p>
            <Link
              to="/how-ajo-works"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent underline decoration-accent-rule underline-offset-4 hover:decoration-accent"
            >
              Read how cycles and payouts work
              <ArrowIcon size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Bills, as a ruled prose block with a single inline figure reference. */}
      <section className="border-b border-rule bg-paper-raised">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="max-w-prose">
            <p className="label-caps">Splitting bills</p>
            <h2 className="mt-3 text-[1.75rem] leading-9 text-ink">
              Enter the total, list the phone numbers, and let people settle from their wallets
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-muted">
              Cowri divides the total across everyone including you, and each person pays their own
              share when they are ready. Paying a share moves money from that person's wallet to
              whoever raised the bill, and the bill closes when the last share lands.
            </p>
          </div>

          <div className="mt-8 grid gap-x-12 gap-y-6 border-t border-rule pt-6 sm:grid-cols-2 lg:max-w-4xl">
            <Detail
              term="Matched by phone number"
              detail="Participants are found by the number they registered with. Anyone not yet on Cowri is left off the split rather than silently dropped from the total."
            />
            <Detail
              term="Shares are whole kobo"
              detail="The total is divided down to the kobo. Where a total cannot divide evenly, the app shows you the remainder instead of hiding it."
            />
            <Detail
              term="Nobody can pay twice"
              detail="A share that is already settled cannot be paid again, and the request is refused at the API rather than in the browser."
            />
            <Detail
              term="Everything lands in the ledger"
              detail="A settled share appears on both wallets' transaction histories with the same reference."
            />
          </div>

          <Link
            to="/split-bills"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-accent underline decoration-accent-rule underline-offset-4 hover:decoration-accent"
          >
            <ReceiptIcon size={17} />
            More about splitting a bill
          </Link>
        </div>
      </section>

      <section>
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-6 px-4 py-14 sm:px-6">
          <div className="max-w-prose">
            <h2 className="text-[1.75rem] leading-9 text-ink">Start a circle this week</h2>
            <p className="mt-3 text-base leading-7 text-ink-muted">
              Creating an account takes a name, a phone number, an email address and a PIN. You can
              set up a circle before anyone else joins.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/register">
              <Button variant="primary" size="lg">
                Create an account
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg">Sign in</Button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}

function Detail({ term, detail }: { term: string; detail: string }) {
  return (
    <div>
      <h3 className="text-[0.9375rem] font-semibold text-ink">{term}</h3>
      <p className="mt-1.5 text-sm leading-6 text-ink-muted">{detail}</p>
    </div>
  )
}
