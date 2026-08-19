import { Link, createFileRoute } from '@tanstack/react-router'
import { MarketingShell } from '~/components/layout/marketing-shell'
import { Article, Section, Steps } from '~/components/marketing/article'
import { BillPreview } from '~/components/marketing/product-preview'
import { Button } from '~/components/ui/button'

export const Route = createFileRoute('/split-bills')({
  component: SplitBillsPage,
})

function SplitBillsPage() {
  return (
    <MarketingShell>
      <Article
        eyebrow="Bills"
        title="Splitting a bill"
        standfirst="Enter what something cost, add the people who were there, and let each of them settle their own share from their wallet."
      >
        <Section heading="Creating a split">
          <Steps
            items={[
              {
                title: 'Name the bill and enter the total',
                body: 'The total is what you actually paid. Cowri works in whole kobo, so there is no rounding drift between what you enter and what gets collected.',
              },
              {
                title: 'Add people by phone number',
                body: 'Participants are matched against the number they registered with. A number that is not on Cowri is left out of the split rather than counted silently, and the app tells you what the shares work out to before you commit.',
              },
              {
                title: 'Everyone pays their own share',
                body: 'Each participant settles when they are ready. Paying moves money from their wallet to yours, and both sides get an entry with the same reference.',
              },
              {
                title: 'The bill closes itself',
                body: 'It reads as outstanding until the last share lands, then flips to settled. A share that has already been paid cannot be paid twice.',
              },
            ]}
          />
        </Section>

        <Section heading="How the shares are worked out">
          <p>
            The total is divided equally across everyone on the bill, including you. Division is
            down to the kobo and rounds down, so where a total does not divide evenly there is a
            small remainder that nobody is charged for.
          </p>
          <p>
            <strong>Cowri shows you that remainder before you create the bill</strong> instead of
            quietly absorbing it. On ₦1,000 split three ways, each person owes ₦333.33 and ₦0.01
            goes uncollected.
          </p>
        </Section>

        <Section heading="What the other side sees">
          <p>
            Everyone on the bill can see the title, the total, each share and who has paid. What
            they cannot see is anybody else's name, phone number or balance: the API deliberately
            returns participants as account ids only, and this app shows them that way rather than
            filling in details it has not been given.
          </p>
          <div className="mt-5">
            <BillPreview />
          </div>
        </Section>

        <Section heading="Limits">
          <p>
            A bill takes up to 49 other people besides you, and the smallest bill is ₦1. Shares come
            out of wallet balances, so a participant who is short needs to add money before they can
            settle.
          </p>
        </Section>
      </Article>

      <div className="border-t border-rule bg-paper-raised">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 sm:px-6">
          <p className="max-w-prose text-base leading-7 text-ink-muted">
            Splitting works best when everyone already has a Cowri account, so numbers resolve on
            the first try.
          </p>
          <div className="flex gap-3">
            <Link to="/register">
              <Button variant="primary" size="lg">
                Create an account
              </Button>
            </Link>
            <Link to="/security">
              <Button size="lg">How your money is held</Button>
            </Link>
          </div>
        </div>
      </div>
    </MarketingShell>
  )
}
