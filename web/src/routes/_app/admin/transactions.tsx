import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { DataTable } from '~/components/domain/data-table'
import { MoneyAmount } from '~/components/domain/money-amount'
import { StatusPill } from '~/components/domain/status-pill'
import { Pagination } from '~/components/ui/pagination'
import { EmptyState, ErrorState } from '~/components/ui/states'
import { WalletIcon } from '~/components/icons'
import { useAdminTransactions } from '~/lib/api/hooks'
import { formatDateTime, shortId } from '~/lib/format'

const PER_PAGE = 50

export const Route = createFileRoute('/_app/admin/transactions')({
  component: AdminTransactionsPage,
})

function AdminTransactionsPage() {
  const [page, setPage] = useState(0)
  const transactions = useAdminTransactions(page, PER_PAGE)

  if (transactions.isError) {
    return <ErrorState error={transactions.error} onRetry={() => void transactions.refetch()} />
  }

  const rows = transactions.data?.transactions ?? []

  return (
    <>
      <DataTable
        caption="All transactions"
        loading={transactions.isPending}
        rows={rows}
        getRowId={(row) => row.id + row.reference}
        empty={
          <EmptyState
            icon={<WalletIcon size={26} />}
            title="No transactions recorded"
            description="Nothing has moved on the platform yet."
          />
        }
        columns={[
          {
            id: 'when',
            header: 'When',
            cell: (row) => (
              <span className="text-ink-muted">{formatDateTime(row.created_at)}</span>
            ),
          },
          {
            id: 'description',
            header: 'Description',
            cell: (row) => (
              <span className="flex flex-col">
                <span className="text-ink">{row.description}</span>
                <span className="numeric text-xs text-ink-faint">{row.reference}</span>
              </span>
            ),
          },
          {
            id: 'wallet',
            header: 'Wallet',
            hideOnMobile: true,
            cell: (row) => <span className="numeric text-ink-faint">{shortId(row.wallet_id)}</span>,
          },
          {
            id: 'status',
            header: 'Status',
            hideOnMobile: true,
            cell: (row) => <StatusPill kind="transaction" status={row.status} />,
          },
          {
            id: 'amount',
            header: 'Amount',
            numeric: true,
            cell: (row) => (
              <MoneyAmount
                kobo={row.kind === 'debit' ? -row.amount_kobo : row.amount_kobo}
                size="sm"
                tone="auto"
                signed
                koboDigits="always"
              />
            ),
          },
        ]}
      />

      <Pagination
        page={page}
        perPage={PER_PAGE}
        total={transactions.data?.total}
        currentPageCount={rows.length}
        onPageChange={setPage}
      />
    </>
  )
}
