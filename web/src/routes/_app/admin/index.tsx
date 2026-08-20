import { createFileRoute } from '@tanstack/react-router'
import { MoneyAmount } from '~/components/domain/money-amount'
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton'
import { ErrorState } from '~/components/ui/states'
import { useAdminDashboard } from '~/lib/api/hooks'

export const Route = createFileRoute('/_app/admin/')({
  component: AdminOverviewPage,
})

function AdminOverviewPage() {
  const dashboard = useAdminDashboard()

  if (dashboard.isPending) {
    return (
      <SkeletonGroup label="Loading platform totals" className="panel divide-y divide-rule">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-baseline justify-between gap-4 px-5 py-3">
            <Skeleton width="10rem" height="0.875rem" />
            <Skeleton width="5rem" height="1.125rem" />
          </div>
        ))}
      </SkeletonGroup>
    )
  }

  if (dashboard.isError) {
    return <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
  }

  const data = dashboard.data

  return (
    <>
      {/* Money first, then counts. Ruled rows rather than a grid of tiles, so
          figures line up in one column and can be read down. */}
      <section className="panel">
        <h2 className="label-caps border-b border-rule px-5 py-2.5">Money on the platform</h2>
        <dl className="divide-y divide-rule">
          <Row term="Held across all wallets">
            <MoneyAmount kobo={data.total_balance_kobo} size="lg" koboDigits="always" />
          </Row>
          <Row term="Total credited, all time">
            <MoneyAmount kobo={data.volume_kobo} size="md" tone="credit" koboDigits="always" />
          </Row>
          <Row term="Fee revenue from Ajo contributions">
            <MoneyAmount kobo={data.fee_revenue_kobo} size="md" koboDigits="always" />
          </Row>
        </dl>
      </section>

      <section className="panel mt-6">
        <h2 className="label-caps border-b border-rule px-5 py-2.5">Counts</h2>
        <dl className="divide-y divide-rule">
          <Row term="Registered users">
            <Count value={data.users} />
          </Row>
          <Row term="Wallets">
            <Count value={data.wallets} />
          </Row>
          <Row term="Transactions recorded">
            <Count value={data.transactions} />
          </Row>
          <Row term="Savings circles">
            <Count value={data.ajo_groups} />
          </Row>
          <Row term="Circles currently active">
            <Count value={data.active_groups} />
          </Row>
          <Row term="Contributions made">
            <Count value={data.contributions} />
          </Row>
          <Row term="Bills raised">
            <Count value={data.bills} />
          </Row>
        </dl>
      </section>

      <p className="mt-4 text-[0.8125rem] leading-6 text-ink-faint">
        Fee revenue is derived from contribution counts at half a percent of each contribution, using
        integer division. It is an estimate of what has been retained, not an accounting figure.
      </p>
    </>
  )
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3">
      <dt className="text-sm text-ink-muted">{term}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Count({ value }: { value: number }) {
  return <span className="numeric text-[0.9375rem] text-ink">{value.toLocaleString('en-NG')}</span>
}
