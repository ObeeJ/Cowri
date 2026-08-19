import { createFileRoute } from '@tanstack/react-router'
import { DataTable } from '~/components/domain/data-table'
import { MoneyAmount } from '~/components/domain/money-amount'
import { StatusPill } from '~/components/domain/status-pill'
import { EmptyState, ErrorState } from '~/components/ui/states'
import { CircleGroupIcon } from '~/components/icons'
import { useAdminAjo } from '~/lib/api/hooks'
import { formatDate, shortId } from '~/lib/format'

export const Route = createFileRoute('/_app/admin/ajo')({
  component: AdminAjoPage,
})

function AdminAjoPage() {
  const groups = useAdminAjo()

  if (groups.isError) {
    return <ErrorState error={groups.error} onRetry={() => void groups.refetch()} />
  }

  const rows = groups.data?.groups ?? []

  return (
    <>
      <DataTable
        caption="All savings circles"
        loading={groups.isPending}
        rows={rows}
        getRowId={(row) => row.group.id}
        empty={
          <EmptyState
            icon={<CircleGroupIcon size={26} />}
            title="No circles yet"
            description="Circles created by any user will appear here."
          />
        }
        columns={[
          {
            id: 'name',
            header: 'Circle',
            cell: (row) => (
              <span className="flex flex-col">
                <span className="text-ink">{row.group.name}</span>
                <span className="numeric text-xs text-ink-faint">{shortId(row.group.id)}</span>
              </span>
            ),
          },
          {
            id: 'status',
            header: 'Status',
            cell: (row) => <StatusPill kind="ajo" status={row.group.status} />,
          },
          {
            id: 'members',
            header: 'Members',
            numeric: true,
            cell: (row) => `${row.member_count} / ${row.group.member_count}`,
          },
          {
            id: 'cycle',
            header: 'Cycle',
            numeric: true,
            hideOnMobile: true,
            cell: (row) => `${row.group.current_cycle + 1} / ${row.group.member_count}`,
          },
          {
            id: 'contribution',
            header: 'Contribution',
            numeric: true,
            hideOnMobile: true,
            cell: (row) => <MoneyAmount kobo={row.group.contribution_kobo} size="sm" />,
          },
          {
            id: 'contributions',
            header: 'Paid in',
            numeric: true,
            cell: (row) => row.total_contributions,
          },
          {
            id: 'fees',
            header: 'Fees kept',
            numeric: true,
            cell: (row) => (
              <MoneyAmount kobo={row.fee_collected_kobo} size="sm" koboDigits="always" />
            ),
          },
          {
            id: 'created',
            header: 'Created',
            hideOnMobile: true,
            cell: (row) => (
              <span className="text-ink-muted">{formatDate(row.group.created_at)}</span>
            ),
          },
        ]}
      />

      <p className="mt-4 text-[0.8125rem] leading-6 text-ink-faint">
        Members is the current headcount against the size the circle was created for. A circle keeps
        running with empty seats, but the cycles matching those seats have nobody to pay out to.
      </p>
    </>
  )
}
