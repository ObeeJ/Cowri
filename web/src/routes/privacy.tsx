import { Link, createFileRoute } from '@tanstack/react-router'
import { MarketingShell } from '~/components/layout/marketing-shell'
import { Article, Section } from '~/components/marketing/article'
import { LegalNotice } from '~/components/marketing/legal-notice'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <MarketingShell>
      <Article
        eyebrow="Legal"
        title="Privacy Policy"
        standfirst="What Cowri collects, why it holds it, who else sees it and what you can ask us to do about it."
        updated="19 August 2026"
      >
        <LegalNotice />

        <Section heading="Who is responsible" id="controller">
          <p>
            <strong>[Operating entity name and registered address]</strong> is the data controller
            for the personal data described here. Questions and requests can be sent to{' '}
            <strong>[privacy contact email]</strong>.
          </p>
        </Section>

        <Section heading="What we collect" id="collected">
          <p>
            <strong>Account details you give us:</strong> your name, phone number, email address, a
            password, and a separate transaction PIN — both stored only as a hash. We never store
            either in a readable form.
          </p>
          <p>
            <strong>Financial records we create:</strong> your wallet balance, every ledger entry and
            transaction, the savings circles you belong to and your position in them, the bills you
            raise or are added to, and the shares you pay.
          </p>
          <p>
            <strong>Technical data:</strong> session cookies, and server logs recording requests
            including a request identifier, the address they came from and the response status.
          </p>
          <p>
            <strong>Payment data:</strong> handled by our payment processor. We receive a
            confirmation containing the amount, a reference and the email address the payment was
            made with. <strong>We do not receive or store card numbers.</strong>
          </p>
        </Section>

        <Section heading="Why we hold it" id="purposes">
          <p>
            To operate your account and move money as you instruct; to keep an accurate financial
            record and reconcile it, which is a requirement of running a ledger honestly; to send
            you the notifications the service depends on, such as a verification code, a password
            reset code, or confirmation that money arrived; to protect against fraud and unauthorised
            access, including rate limiting sign-in attempts; and to meet legal and regulatory
            obligations.
          </p>
        </Section>

        <Section heading="What other users can see" id="visibility">
          <p>
            Members of a savings circle can see the circle's terms, its payout order by position,
            and how many contributions have been made. <strong>They cannot see your name, phone
            number, email address or balance.</strong>
          </p>
          <p>
            Participants on a split bill can see the bill's title and total, each share, and which
            shares have been paid, identified by account id rather than by name. Adding someone to a
            bill by phone number confirms nothing back to the person adding them beyond whether a
            share was created.
          </p>
        </Section>

        <Section heading="Who else receives it" id="sharing">
          <p>
            Our payment processor, in order to take payment and confirm it. Our email provider, in
            order to deliver verification codes and notifications. Our hosting and database
            providers, who store the data on our behalf. Authorities and regulators where we are
            legally required to disclose.
          </p>
          <p>
            <strong>We do not sell personal data, and we do not share it for advertising.</strong>
          </p>
        </Section>

        <Section heading="Cookies" id="cookies">
          <p>
            Cowri sets two cookies, both strictly necessary: an access token and a refresh token.
            Both are httpOnly, Secure and SameSite=Strict, which means they are sent only to Cowri
            and cannot be read by any script running in your browser. There are no advertising,
            analytics or tracking cookies.
          </p>
          <p>
            This app also stores your theme preference and a copy of your own profile in your
            browser's local storage, so the interface can render immediately on return. That copy is
            removed when you sign out.
          </p>
        </Section>

        <Section heading="How long we keep it" id="retention">
          <p>
            Financial records are kept for as long as required for accounting and regulatory
            purposes, which typically runs to several years after an account closes. Ledger entries
            are append-only and are not deleted, because a ledger that can be edited is not a
            ledger. Account details are kept while the account is open and for the retention period
            afterwards. <strong>[Exact retention periods to be confirmed against the applicable
            regulations.]</strong>
          </p>
        </Section>

        <Section heading="Your rights" id="rights">
          <p>
            You can ask for a copy of the personal data we hold about you, ask us to correct
            inaccurate details, ask us to delete data we no longer have a lawful reason to keep, and
            object to particular processing. Requests go to{' '}
            <strong>[privacy contact email]</strong>.
          </p>
          <p>
            Some data cannot be deleted on request while a legal obligation to retain it stands,
            most obviously the financial record of transactions you have made. Where that applies we
            will tell you which parts we cannot remove and why.
          </p>
        </Section>

        <Section heading="Security" id="security">
          <p>
            Passwords and transaction PINs are hashed separately. Session tokens are httpOnly and short-lived, with rotation on refresh
            and server-side invalidation on sign-out. Payment webhooks are signature-verified before
            they are acted on. A fuller account is on the{' '}
            <Link to="/security">security page</Link>.
          </p>
          <p>
            No system is perfectly secure. If a breach affects your personal data we will notify you
            and the relevant authority as required by law.
          </p>
        </Section>

        <Section heading="Changes" id="changes">
          <p>
            We will post any change to this policy here and update the date at the top. Material
            changes will also be notified in the app or by email.
          </p>
        </Section>
      </Article>
    </MarketingShell>
  )
}
