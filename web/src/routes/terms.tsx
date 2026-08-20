import { Link, createFileRoute } from '@tanstack/react-router'
import { MarketingShell } from '~/components/layout/marketing-shell'
import { Article, Section } from '~/components/marketing/article'
import { LegalNotice } from '~/components/marketing/legal-notice'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

function TermsPage() {
  return (
    <MarketingShell>
      <Article
        eyebrow="Legal"
        title="Terms of Service"
        standfirst="The agreement between you and the operator of Cowri when you use this service."
        updated="19 August 2026"
      >
        <LegalNotice />

        <Section heading="1. Who these terms are with" id="parties">
          <p>
            Cowri is operated by <strong>[Operating entity name, registration number and
            registered address]</strong> ("Cowri", "we", "us"). By creating an account you agree to
            these terms. If you do not agree to them, do not use the service.
          </p>
          <p>
            You must be at least 18 years old and legally able to enter into this agreement. You may
            only open an account for yourself, using your own details.
          </p>
        </Section>

        <Section heading="2. What Cowri is" id="service">
          <p>
            Cowri provides three things: a wallet that records a balance you have funded, rotating
            savings circles in which members contribute on a schedule and take turns receiving the
            pot, and bill splitting between Cowri accounts.
          </p>
          <p>
            <strong>Cowri is not a bank.</strong> Balances held in the service are not bank deposits
            and are not covered by any deposit insurance or protection scheme. We do not pay
            interest on balances.
          </p>
        </Section>

        <Section heading="3. Your account" id="account">
          <p>
            You register with your name, phone number, email address, a password, and a separate
            transaction PIN. You are responsible for keeping both secret and for everything done
            through your account. Tell us immediately if you believe someone else has access to it.
          </p>
          <p>
            Your phone number identifies you to other users when they add you to a split bill.
            Keeping it accurate is your responsibility.
          </p>
        </Section>

        <Section heading="4. Adding money" id="funding">
          <p>
            Money is added through our payment processor. Your balance is credited when the
            processor confirms the payment to us, which may be a short time after you complete
            checkout. Minimum and maximum top-up amounts apply and are shown in the app.
          </p>
          <p>
            We do not receive or store your card details. Payment card handling is governed by the
            processor's own terms.
          </p>
        </Section>

        <Section heading="5. Savings circles" id="circles">
          <p>
            When you join a circle you take a position in its payout order and undertake to
            contribute the circle's fixed amount for every cycle. Contributions are taken from your
            available wallet balance at the moment you contribute, and are transferred directly to
            that cycle's recipient.
          </p>
          <p>
            <strong>Contributions are final.</strong> Once a contribution has been transferred to
            another member, Cowri cannot reverse it. Cowri does not guarantee that other members
            will continue contributing after they have collected, does not underwrite or insure
            circles, and is not a party to the arrangement between members. Join circles only with
            people you trust.
          </p>
        </Section>

        <Section heading="6. Splitting bills" id="bills">
          <p>
            The person who creates a bill sets the total and the participants. Cowri divides the
            total equally, rounding each share down to the nearest kobo, which may leave a small
            remainder uncollected. Paying a share transfers money from the payer's wallet to the
            person who raised the bill, and is final once made.
          </p>
          <p>
            Cowri does not verify that a bill is genuine, that the total is correct, or that the
            people listed agreed to be on it. Disputes about a bill are between the people involved.
          </p>
        </Section>

        <Section heading="7. Fees" id="fees">
          <p>
            Cowri retains a platform fee of 0.5% of each savings circle contribution. The fee is
            deducted from the payout to the recipient, not added to the contribution. Splitting a
            bill carries no fee. Any change to fees will be published here and in the app before it
            takes effect.
          </p>
        </Section>

        <Section heading="8. Acceptable use" id="acceptable-use">
          <p>You agree not to use Cowri to:</p>
          <p>
            move the proceeds of crime, launder money, or finance terrorism; impersonate another
            person; open accounts on behalf of others without authority; attempt to gain access to
            accounts, data or systems you are not entitled to; interfere with the operation of the
            service; or use the service in breach of any law that applies to you.
          </p>
          <p>
            We may suspend or close an account we reasonably believe is being used in breach of this
            section, and may be required to report activity to the relevant authorities.
          </p>
        </Section>

        <Section heading="9. Availability" id="availability">
          <p>
            We aim to keep Cowri available but do not guarantee uninterrupted service. Maintenance,
            failures of third parties including our payment processor, and events outside our
            control may interrupt access. We are not liable for losses arising from an interruption,
            except where the law says otherwise.
          </p>
        </Section>

        <Section heading="10. Liability" id="liability">
          <p>
            Nothing in these terms excludes liability that cannot lawfully be excluded, including
            liability for fraud or for death or personal injury caused by negligence.
          </p>
          <p>
            Subject to that, we are not liable for indirect or consequential loss, loss of profit,
            or loss arising from the conduct of another user, including a member of a savings circle
            who stops contributing. Our total liability to you in any twelve month period is limited
            to <strong>[liability cap to be set with counsel]</strong>.
          </p>
        </Section>

        <Section heading="11. Closing your account" id="closing">
          <p>
            You may ask us to close your account at any time. We may close or suspend an account
            where required by law, where these terms have been breached, or on reasonable notice.
            Closing an account does not cancel obligations already incurred, including contributions
            due to a circle you joined.
          </p>
          <p>
            <strong>[Withdrawal and settlement of a remaining balance on closure to be completed
            once a withdrawal method is in place. The service does not currently support
            withdrawals.]</strong>
          </p>
        </Section>

        <Section heading="12. Changes to these terms" id="changes">
          <p>
            We may change these terms. Material changes will be notified in the app or by email
            before they take effect. Continuing to use Cowri after a change means you accept the
            revised terms.
          </p>
        </Section>

        <Section heading="13. Governing law" id="law">
          <p>
            These terms are governed by <strong>[governing law jurisdiction]</strong> and disputes
            are subject to the courts of that jurisdiction.
          </p>
        </Section>

        <Section heading="14. Contact" id="contact">
          <p>
            Questions about these terms can be sent to <strong>[support email address]</strong>.
          </p>
          <p>
            See also the{' '}
            <Link to="/privacy">Privacy Policy</Link> and the{' '}
            <Link to="/security">security overview</Link>.
          </p>
        </Section>
      </Article>
    </MarketingShell>
  )
}
