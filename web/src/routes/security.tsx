import { Link, createFileRoute } from '@tanstack/react-router'
import { MarketingShell } from '~/components/layout/marketing-shell'
import { Article, Section } from '~/components/marketing/article'
import { Button } from '~/components/ui/button'

export const Route = createFileRoute('/security')({
  component: SecurityPage,
})

function SecurityPage() {
  return (
    <MarketingShell>
      <Article
        eyebrow="Security"
        title="How Cowri holds your money and your account"
        standfirst="What the system actually does, described plainly, including the parts that are still limits rather than guarantees."
      >
        <Section heading="Double entry, not a stored number">
          <p>
            A balance in Cowri is not a field somebody edits. Every movement writes matching entries
            into an append-only ledger, each one recording the amount, the direction, a reference and
            the resulting balance. Entries are never updated or deleted; a correction is a new
            entry.
          </p>
          <p>
            There is a reconciliation endpoint that recomputes every wallet from its own entries and
            reports any wallet whose recorded balance disagrees. Administrators can run it on demand
            from the console.
          </p>
        </Section>

        <Section heading="Whole kobo, no floating point">
          <p>
            Amounts are integers counted in kobo, from the database through the API to this
            interface. No part of the path converts money to a floating point number, which is what
            stops the fractions-of-a-kobo drift that plagues systems built on decimals.
          </p>
        </Section>

        <Section heading="One debit at a time">
          <p>
            Each wallet is locked while a debit is applied, so a balance check and the debit that
            follows it cannot be split apart by a second request arriving at the same moment. A
            wallet carries a version that increments on every mutation, and the balance available to
            spend is deliberately separate from the ledger balance, which can include amounts that
            have not settled.
          </p>
        </Section>

        <Section heading="Payments, and what Cowri never sees">
          <p>
            Top-ups are handled by Paystack. You are sent to Paystack's own checkout and your card
            details are entered there. Cowri receives a confirmation webhook, verifies its signature
            with HMAC-SHA512 against the shared secret, and only then credits the wallet.
          </p>
          <p>
            <strong>Your balance changes when Paystack confirms the payment</strong>, not when you
            press the button, which is why the app tells you to expect a short wait rather than
            showing an optimistic figure.
          </p>
          <p>
            Repeat webhook deliveries for the same payment reference are recognised and ignored, and
            top-up requests carry an idempotency key so a retried request replays the original
            response instead of opening a second checkout.
          </p>
        </Section>

        <Section heading="Your session">
          <p>
            Signing in sets two httpOnly, Secure, SameSite=Strict cookies: a short-lived access
            token and a longer-lived refresh token. Because they are httpOnly, no JavaScript on the
            page, including this app's own code, can read them. Refreshing rotates the refresh
            token, and signing out invalidates both server side rather than only clearing the
            browser.
          </p>
          <p>
            Repeated failed sign-in attempts on a phone number are rate limited. Your password is
            stored only as a hash — Cowri never sees or stores it in plain text.
          </p>
          <p>
            Signing in is not enough to move money. Every payment — an ajo contribution, a bill
            share, a transfer — asks again for your separate transaction PIN, so a stolen session
            alone can never spend from your wallet.
          </p>
        </Section>

        <Section heading="What administrators can see">
          <p>
            Administrators can read platform totals, the user list with balances, the full
            transaction record, every circle, and the health of the system. Administrator access is
            checked on the API for every one of those requests. Nothing is protected by hiding a
            link: an ordinary account that tries an admin address gets a refusal from the API, not a
            partially loaded page.
          </p>
        </Section>

        <Section heading="Limits worth knowing">
          <p>
            Cowri is a young system, and there are things it does not do yet. It cannot compel a
            member of a savings circle to keep contributing after they have collected. It has no
            withdrawal endpoint, so money added to a wallet moves between Cowri accounts rather than
            back out to a bank. There is no endpoint for editing your own name, phone number or
            email once the account exists.
          </p>
          <p>
            Cowri is not a bank and deposits are not insured. Treat it as a shared ledger with a
            payment rail attached, and keep circles to people you would trust with cash.
          </p>
        </Section>

        <Section heading="Reporting a problem">
          <p>
            If you believe you have found a security issue, please report it privately before
            disclosing it anywhere public, and include enough detail to reproduce it. Do not test
            against other people's accounts or balances.
          </p>
        </Section>
      </Article>

      <div className="border-t border-rule bg-paper-raised">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 sm:px-6">
          <p className="max-w-prose text-base leading-7 text-ink-muted">
            The Terms of Service and Privacy Policy set out the rest of the arrangement.
          </p>
          <div className="flex gap-3">
            <Link to="/terms">
              <Button size="lg">Terms of Service</Button>
            </Link>
            <Link to="/privacy">
              <Button size="lg">Privacy Policy</Button>
            </Link>
          </div>
        </div>
      </div>
    </MarketingShell>
  )
}
