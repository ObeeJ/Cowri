import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '~/components/domain/page-header'
import { BillCard, BillCardSkeleton } from '~/components/domain/bill'
import { Button } from '~/components/ui/button'
import { Tabs } from '~/components/ui/tabs'
import { Pagination } from '~/components/ui/pagination'
import { EmptyState, ErrorState } from '~/components/ui/states'
import { PlusIcon, ReceiptIcon } from '~/components/icons'
import { useBills } from '~/lib/api/hooks'
import { useAuth } from '~/lib/auth'

const PER_PAGE = 20

export const Route = createFileRoute('/_app/bills/')({
  component: BillListPage,
})

type Filter = 'open' | 'settled' | 'all'

function BillListPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState<Filter>('open')
  const bills = useBills(page, PER_PAGE)

  const all = bills.data ?? []
  const shown = all.filter((bill) =>
    filter === 'all' ? true : filter === 'settled' ? bill.status === 'settled' : bill.status !== 'settled',
  )

  return (
    <>
      <PageHeader
        title="Bills"
        description="Bills you raised and bills you were included in."
        actions={
          <Link to="/bills/new">
            <Button variant="primary" leading={<PlusIcon size={16} />}>
              Split a bill
            </Button>
          </Link>
        }
      />

      {bills.isError ? (
        <ErrorState error={bills.error} onRetry={() => void bills.refetch()} />
      ) : (
        <>
          <Tabs
            label="Filter bills"
            value={filter}
            onValueChange={(next) => setFilter(next as Filter)}
            items={[
              {
                value: 'open',
                label: 'Outstanding',
                badge: bills.isPending ? undefined : all.filter((b) => b.status !== 'settled').length,
              },
              {
                value: 'settled',
                label: 'Settled',
                badge: bills.isPending ? undefined : all.filter((b) => b.status === 'settled').length,
              },
              { value: 'all', label: 'All', badge: bills.isPending ? undefined : all.length },
            ]}
          >
            {bills.isPending ? (
              <ul className="flex flex-col gap-3">
                <BillCardSkeleton />
                <BillCardSkeleton />
                <BillCardSkeleton />
              </ul>
            ) : shown.length === 0 ? (
              <EmptyState
                icon={<ReceiptIcon size={28} />}
                title={
                  all.length === 0
                    ? 'No bills yet'
                    : filter === 'settled'
                      ? 'Nothing settled on this page'
                      : 'Nothing outstanding'
                }
                description={
                  all.length === 0
                    ? 'Enter what a meal, a trip or a subscription cost, add everyone by phone number, and Cowri works out the shares.'
                    : 'Try the other tabs, or an earlier page.'
                }
                action={
                  <Link to="/bills/new">
                    <Button variant="primary">Split a bill</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {shown.map((bill) => (
                  <BillCard key={bill.id} bill={bill} currentUserId={user?.id} />
                ))}
              </ul>
            )}
          </Tabs>

          <Pagination
            page={page}
            perPage={PER_PAGE}
            currentPageCount={bills.data?.length}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  )
}
