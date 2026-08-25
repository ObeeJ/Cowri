import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '~/components/domain/page-header'
import { BalanceCard, BalanceCardSkeleton } from '~/components/domain/balance-card'
import { TransactionList, TransactionListSkeleton } from '~/components/domain/transaction-list'
import { Button } from '~/components/ui/button'
import { Dialog } from '~/components/ui/dialog'
import { Field } from '~/components/ui/field'
import { MoneyInput } from '~/components/ui/money-input'
import { Tabs } from '~/components/ui/tabs'
import { Pagination } from '~/components/ui/pagination'
import { EmptyState, ErrorState } from '~/components/ui/states'
import { useToast } from '~/components/ui/toast'
import { ExternalIcon, NoteIcon, RefreshIcon, WalletIcon } from '~/components/icons'
import { useFundWallet, useTransactions, useWallet } from '~/lib/api/hooks'
import { useAuth } from '~/lib/auth'
import { errorMessage } from '~/lib/api/client'
import { formatKobo } from '~/lib/money'

/** The API's own limits, from services/wallet.rs. */
const MIN_TOPUP_KOBO = 10_000
const MAX_TOPUP_KOBO = 100_000_000
const PER_PAGE = 20

export const Route = createFileRoute('/_app/wallet')({
  component: WalletPage,
})

type Filter = 'all' | 'credit' | 'debit'

function WalletPage() {
  const wallet = useWallet()
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  const [fundOpen, setFundOpen] = useState(false)
  const transactions = useTransactions(page, PER_PAGE)

  const rows = (transactions.data ?? []).filter((transaction) =>
    filter === 'all' ? true : transaction.kind === filter,
  )

  return (
    <>
      <PageHeader
        title="Activity"
        description="Display-only summary of Paystack-confirmed activity. Cowri does not hold your cash — payments go through the provider (card, transfer, USSD, or wallet)."
        actions={
          <>
            <Button
              onClick={() => {
                void wallet.refetch()
                void transactions.refetch()
              }}
              leading={<RefreshIcon size={16} />}
              loading={wallet.isFetching || transactions.isFetching}
              loadingText="Refreshing"
            >
              Refresh
            </Button>
            <Button variant="primary" leading={<NoteIcon size={16} />} onClick={() => setFundOpen(true)}>
              Add money
            </Button>
            <Button leading={<WalletIcon size={16} />} onClick={() => void (window.location.href = '/send')}>
              Send money
            </Button>
          </>
        }
      />

      {wallet.isPending ? (
        <BalanceCardSkeleton />
      ) : wallet.isError ? (
        <ErrorState error={wallet.error} onRetry={() => void wallet.refetch()} />
      ) : (
        <BalanceCard wallet={wallet.data} />
      )}

      <section className="mt-8">
        <h2 className="sr-only">Transaction history</h2>
        <Tabs
          label="Filter transactions"
          value={filter}
          onValueChange={(next) => setFilter(next as Filter)}
          items={[
            { value: 'all', label: 'Everything' },
            { value: 'credit', label: 'Money in' },
            { value: 'debit', label: 'Money out' },
          ]}
        >
          <div className="panel overflow-hidden">
            {transactions.isPending ? (
              <TransactionListSkeleton rows={6} />
            ) : transactions.isError ? (
              <div className="p-4">
                <ErrorState error={transactions.error} onRetry={() => void transactions.refetch()} />
              </div>
            ) : (
              <TransactionList
                transactions={rows}
                grouped
                showReference
                empty={
                  <div className="p-4">
                    <EmptyState
                      icon={<WalletIcon size={26} />}
                      title={
                        filter === 'all'
                          ? 'No transactions on this page'
                          : `No ${filter === 'credit' ? 'incoming' : 'outgoing'} entries here`
                      }
                      description={
                        filter === 'all'
                          ? 'Add money to your wallet and the entry will appear here straight away.'
                          : 'Try the other tabs, or an earlier page.'
                      }
                    />
                  </div>
                }
              />
            )}
          </div>
        </Tabs>

        <Pagination
          page={page}
          perPage={PER_PAGE}
          currentPageCount={transactions.data?.length}
          onPageChange={setPage}
        />
      </section>

      <FundDialog open={fundOpen} onOpenChange={setFundOpen} />
    </>
  )
}

/**
 * Funding hands off to Paystack.
 *
 * The API returns a checkout URL and credits the wallet from the Paystack
 * webhook, not from this request, so the balance only moves once the payment has
 * actually settled server side. This dialog says so rather than implying the
 * money is already there.
 */
function FundDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const fund = useFundWallet()
  const [amountKobo, setAmountKobo] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFund() {
    setError(null)
    if (amountKobo === null) {
      setError('Enter an amount.')
      return
    }
    if (amountKobo < MIN_TOPUP_KOBO) {
      setError(`The smallest top-up is ${formatKobo(MIN_TOPUP_KOBO)}.`)
      return
    }
    if (amountKobo > MAX_TOPUP_KOBO) {
      setError(`The largest top-up is ${formatKobo(MAX_TOPUP_KOBO)}.`)
      return
    }
    if (!user?.email) {
      setError('Your account has no email address, so Paystack cannot raise a receipt.')
      return
    }

    try {
      const result = await fund.mutateAsync({ amount_kobo: amountKobo, email: user.email })
      onOpenChange(false)
      toast({
        title: 'Continue on Paystack',
        description: 'Your balance updates once Paystack confirms the payment.',
        tone: 'info',
      })
      // Same tab: the user comes back to /wallet, where the balance is refetched.
      window.location.assign(result.authorization_url)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add money to your wallet"
      description="Payment is handled by Paystack. Cowri never sees your card details."
      dismissable={!fund.isPending}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={fund.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleFund}
            loading={fund.isPending}
            loadingText="Opening Paystack"
            trailing={<ExternalIcon size={16} />}
          >
            Continue to Paystack
          </Button>
        </>
      }
    >
      <Field label="Amount" error={error} required>
        <MoneyInput
          valueKobo={amountKobo}
          onValueChange={setAmountKobo}
          minKobo={MIN_TOPUP_KOBO}
          maxKobo={MAX_TOPUP_KOBO}
          presetsKobo={[100_000, 200_000, 500_000, 1_000_000]}
          invalid={Boolean(error)}
          autoFocus
        />
      </Field>

      <p className="mt-4 text-[0.8125rem] leading-6 text-ink-muted">
        Your balance changes when Paystack confirms the payment to Cowri, which is usually within a
        few seconds. If it has not appeared after a minute, use Refresh on this page.
      </p>
    </Dialog>
  )
}
