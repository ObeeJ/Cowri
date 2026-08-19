import { Link, createFileRoute } from '@tanstack/react-router'
import { MarketingShell } from '~/components/layout/marketing-shell'
import { Article, Section, Steps } from '~/components/marketing/article'
import { AjoPreview } from '~/components/marketing/product-preview'
import { Button } from '~/components/ui/button'

export const Route = createFileRoute('/how-ajo-works')({
  component: HowAjoWorksPage,
})

function HowAjoWorksPage() {
  return (
    <MarketingShell>
      <Article
        eyebrow="Savings circles"
        title="How a Cowri circle works"
        standfirst="Ajo, esusu, adashe: a group contributes the same amount on a schedule and each member takes the whole pot in turn. Cowri keeps the order, moves the money and writes both sides of every entry."
      >
        <Section heading="The shape of a circle">
          <p>
            A circle has a fixed contribution, a schedule, and a number of members. Whoever creates
            it takes the first payout position. Everyone who joins afterwards takes the next open
            seat, so the payout order is simply the order people joined.
          </p>
          <p>
            The number of members also sets the length of the circle. A circle of eight people runs
            for eight cycles, and each member collects once.
          </p>
        </Section>

        <Section heading="Contributing">
          <Steps
            items={[
              {
                title: 'You contribute for the current cycle',
                body: 'The contribution is taken from your available wallet balance. If the balance is short, the contribution is refused outright rather than putting you into an overdraft.',
              },
              {
                title: 'It goes straight to that cycle’s recipient',
                body: 'The member whose payout position matches the current cycle is credited immediately, less the platform fee. There is no pot sitting in the middle.',
              },
              {
                title: 'The cycle closes when everybody has paid',
                body: 'Once every member has contributed for the cycle, the circle advances and the next member starts collecting. Nobody can contribute twice in the same cycle.',
              },
              {
                title: 'The circle completes',
                body: 'After the last position has collected, the circle is marked completed and no further contributions are accepted.',
              },
            ]}
          />
        </Section>

        <Section heading="What it costs">
          <p>
            Cowri keeps half a percent of each contribution. The fee comes out of the payout, not
            out of your contribution, so you always pay in exactly the amount the circle was set up
            for.
          </p>
          <p>
            On a ₦5,000 contribution the fee is ₦25 and the recipient is credited ₦4,975. The
            arithmetic is integer division on kobo, so it is the same every time and never rounds
            in a surprising direction.
          </p>
        </Section>

        <Section heading="Seats that are still empty">
          <p>
            A circle starts running as soon as it is created, even before it is full. Cycles that
            match an unfilled seat have nobody to pay out to, so it is worth filling the circle
            before contributions begin. Both the circle page and the admin console show the current
            headcount against the target.
          </p>
        </Section>

        <Section heading="Seeing it">
          <p>
            The circle page draws the whole payout order, marks the cycle currently collecting, and
            shows how many contributions have landed against how many members there are.
          </p>
          <div className="mt-5">
            <AjoPreview />
          </div>
        </Section>

        <Section heading="Trust, honestly stated">
          <p>
            A rotating circle depends on people continuing to contribute after they have collected.
            Cowri does not change that: it will not advance a cycle until everyone has paid, and it
            will not let anyone pay from money they do not have, but it cannot compel a member to
            keep going.
          </p>
          <p>
            <strong>Run circles with people you would trust with cash.</strong> What Cowri adds is
            an exact, shared record of who has paid what, so a disagreement is a matter of reading
            the ledger rather than remembering.
          </p>
        </Section>
      </Article>

      <div className="border-t border-rule bg-paper-raised">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 sm:px-6">
          <p className="max-w-prose text-base leading-7 text-ink-muted">
            You can create a circle before anyone else joins, then share the invite link.
          </p>
          <div className="flex gap-3">
            <Link to="/register">
              <Button variant="primary" size="lg">
                Create an account
              </Button>
            </Link>
            <Link to="/split-bills">
              <Button size="lg">Splitting bills</Button>
            </Link>
          </div>
        </div>
      </div>
    </MarketingShell>
  )
}
