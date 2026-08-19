import { Link, createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/domain/page-header'
import { BalanceCard, BalanceCardSkeleton } from '~/components/domain/balance-card'
import { TransactionList, TransactionListSkeleton } from '~/components/domain/transaction-list'
import { AjoGroupCard, AjoGroupCardSkeleton } from '~/components/domain/ajo'
import { BillCard, BillCardSkeleton } from '~/components/domain/bill'
import { Button } from '~/components/ui/button'
import { EmptyState, ErrorState } from '~/components/ui/states'
import {
  ArrowIcon,
  CircleGroupIcon,
  NoteIcon,
  PlusIcon,
  ReceiptIcon,
  WalletIcon,
} from '~/components/icons'
import { useAjoGroups, useBills, useTransactions, useWallet } from '~/lib/api/hooks'
import { useAuth } from '~/lib/auth'
import { firstName } from '~/lib/format'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = useAuth()
  const wallet = useWallet()
  const transactions = useTransactions(0, 5)
  const groups = useAjoGroups()
  const bills = useBills(0, 4)

  const outstandingBills = (bills.data ?? []).filter((bill) => bill.status !== 'settled')
  const activeGroups = (groups.data ?? []).filter((group) => group.status === 'active')

  return (
    <>
      <PageHeader
        title={user ? `Good to see you, ${firstName(user.name)}` : 'Your dashboard'}
        description="Your balance, the circles you are part of, and anything still owing."
        actions={
          <>
            <Link to="/ajo/new">
              <Button leading={<PlusIcon size={16} />}>New circle</Button>
            </Link>
            <Link to="/wallet">
              <Button variant="primary" leading={<NoteIcon size={16} />}>
                Add money
              </Button>
            </Link>
          </>
        }
      />

      {wallet.isPending ? (
        <BalanceCardSkeleton />
      ) : wallet.isError ? (
        <ErrorState error={wallet.error} onRetry={() => void wallet.refetch()} />
      ) : (
        <BalanceCard
          wallet={wallet.data}
          actions={
            <>
              <Link to="/wallet">
                <Button variant="primary" size="sm" leading={<NoteIcon size={16} />}>
                  Add money
                </Button>
              </Link>
              <Link to="/wallet">
                <Button size="sm" leading={<WalletIcon size={16} />}>
                  Transaction history
                </Button>
              </Link>
            </>
          }
        />
      )}

      <Section
        title="Recent activity"
        action={
          <Link
            to="/wallet"
            className="inline-flex items-center gap-1.5 text-sm text-accent underline decoration-accent-rule underline-offset-4 hover:decoration-accent"
          >
            All transactions
            <ArrowIcon size={15} />
          </Link>
        }
      >
        <div className="panel overflow-hidden">
          {transactions.isPending ? (
            <TransactionListSkeleton rows={4} />
          ) : transactions.isError ? (
            <div className="p-4">
              <ErrorState error={transactions.error} onRetry={() => void transactions.refetch()} />
            </div>
          ) : (
            <TransactionList
              transactions={transactions.data}
              empty={
                <div className="p-4">
                  <EmptyState
                    icon={<WalletIcon size={26} />}
                    title="Nothing has moved yet"
                    description="Once you add money or contribute to a circle, every entry shows up here."
                  />
                </div>
              }
            />
          )}
        </div>
      </Section>

      <Section
        title="Your savings circles"
        action={
          <Link
            to="/ajo"
            className="inline-flex items-center gap-1.5 text-sm text-accent underline decoration-accent-rule underline-offset-4 hover:decoration-accent"
          >
            All circles
            <ArrowIcon size={15} />
          </Link>
        }
      >
        {groups.isPending ? (
          <ul className="flex flex-col gap-3">
            <AjoGroupCardSkeleton />
            <AjoGroupCardSkeleton />
          </ul>
        ) : groups.isError ? (
          <ErrorState error={groups.error} onRetry={() => void groups.refetch()} />
        ) : activeGroups.length === 0 ? (
          <EmptyState
            icon={<CircleGroupIcon size={26} />}
            title="You are not in a circle yet"
            description="Start one and share the invite link with the people you already save with."
            action={
              <Link to="/ajo/new">
                <Button variant="primary">Start a circle</Button>
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {activeGroups.slice(0, 3).map((group) => (
              <AjoGroupCard key={group.id} group={group} />
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Bills still owing"
        action={
          <Link
            to="/bills"
            className="inline-flex items-center gap-1.5 text-sm text-accent underline decoration-accent-rule underline-offset-4 hover:decoration-accent"
          >
            All bills
            <ArrowIcon size={15} />
          </Link>
        }
      >
        {bills.isPending ? (
          <ul className="flex flex-col gap-3">
            <BillCardSkeleton />
          </ul>
        ) : bills.isError ? (
          <ErrorState error={bills.error} onRetry={() => void bills.refetch()} />
        ) : outstandingBills.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon size={26} />}
            title="Nothing outstanding"
            description="Split a bill and Cowri will work out everyone's share."
            action={
              <Link to="/bills/new">
                <Button>Split a bill</Button>
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {outstandingBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} currentUserId={user?.id} />
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-lg text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
