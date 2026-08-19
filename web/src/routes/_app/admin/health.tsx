import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Badge } from '~/components/ui/display'
import { Button } from '~/components/ui/button'
import { Progress } from '~/components/ui/display'
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton'
import { ErrorState } from '~/components/ui/states'
import { AlertIcon, RefreshIcon, TickIcon } from '~/components/icons'
import { useAdminOutbox, useHealth, useLedgerCheck } from '~/lib/api/hooks'
import { shortId } from '~/lib/format'

export const Route = createFileRoute('/_app/admin/health')({
  component: AdminHealthPage,
})

function AdminHealthPage() {
  const health = useHealth()
  const outbox = useAdminOutbox()
  const [ledgerRequested, setLedgerRequested] = useState(false)
  const ledger = useLedgerCheck(ledgerRequested)

  return (
    <>
      <section className="panel">
        <h2 className="label-caps border-b border-rule px-5 py-2.5">API</h2>
        {health.isPending ? (
          <SkeletonGroup label="Checking the API" className="px-5 py-4">
            <Skeleton width="12rem" height="1.25rem" />
          </SkeletonGroup>
        ) : health.isError ? (
          <div className="px-5 py-4">
            <ErrorState error={health.error} onRetry={() => void health.refetch()} />
          </div>
        ) : (
          <dl className="divide-y divide-rule">
            <Row term="Status">
              {health.data.status === 'ok' ? (
                <Badge tone="accent">Healthy</Badge>
              ) : (
                <Badge tone="clay">Degraded</Badge>
              )}
            </Row>
            <Row term="Database">
              <span className="numeric text-[0.9375rem] text-ink">{health.data.db}</span>
            </Row>
            <Row term="API version">
              <span className="numeric text-[0.9375rem] text-ink">{health.data.version}</span>
            </Row>
          </dl>
        )}
      </section>

      <section className="panel mt-6">
        <h2 className="label-caps border-b border-rule px-5 py-2.5">
          Outbox, the queue that delivers notifications
        </h2>
        {outbox.isPending ? (
          <SkeletonGroup label="Loading the outbox" className="px-5 py-4">
            <Skeleton width="100%" height="3rem" shape="block" />
          </SkeletonGroup>
        ) : outbox.isError ? (
          <div className="px-5 py-4">
            <ErrorState error={outbox.error} onRetry={() => void outbox.refetch()} />
          </div>
        ) : (
          <>
            <dl className="divide-y divide-rule">
              <Row term="Waiting to be delivered">
                <Count value={outbox.data.pending} tone={outbox.data.pending > 50 ? 'clay' : 'ink'} />
              </Row>
              <Row term="Delivered">
                <Count value={outbox.data.delivered} />
              </Row>
              <Row term="Failed">
                <Count value={outbox.data.failed} tone={outbox.data.failed > 0 ? 'clay' : 'ink'} />
              </Row>
            </dl>
            <div className="px-5 pb-4">
              <Progress
                value={outbox.data.delivered}
                max={Math.max(outbox.data.total, 1)}
                label="Events delivered out of the total staged"
                showLabel
              />
            </div>
          </>
        )}
        <p className="border-t border-rule px-5 py-3 text-[0.8125rem] leading-6 text-ink-faint">
          Events are written in the same transaction as the money movement and delivered afterwards
          by a background worker. A growing pending count means notifications are lagging, not that
          money is lost. This panel refreshes every 30 seconds.
        </p>
      </section>

      <section className="panel mt-6">
        <h2 className="label-caps border-b border-rule px-5 py-2.5">Ledger integrity</h2>
        <div className="px-5 py-4">
          <p className="max-w-prose text-sm leading-6 text-ink-muted">
            Recomputes every wallet balance by summing its credits and subtracting its debits, then
            reports any wallet whose stored balance disagrees. A clean result is the strongest
            evidence that no money has gone missing.
          </p>

          <Button
            className="mt-4"
            variant="primary"
            leading={<RefreshIcon size={16} />}
            loading={ledger.isFetching}
            loadingText="Recomputing every wallet"
            onClick={() => {
              if (ledgerRequested) void ledger.refetch()
              else setLedgerRequested(true)
            }}
          >
            Run the check
          </Button>

          {ledger.isError ? (
            <ErrorState className="mt-4" error={ledger.error} onRetry={() => void ledger.refetch()} />
          ) : null}

          {ledger.data ? (
            <div
              className={
                'mt-4 rounded-[var(--radius-panel)] border px-4 py-3 ' +
                (ledger.data.status === 'ok'
                  ? 'border-accent-rule bg-accent-tint'
                  : 'border-clay-rule bg-clay-tint')
              }
            >
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                {ledger.data.status === 'ok' ? (
                  <>
                    <TickIcon size={18} className="text-accent" />
                    Every wallet agrees with its ledger
                  </>
                ) : (
                  <>
                    <AlertIcon size={18} className="text-clay" />
                    {ledger.data.violations.length} wallet
                    {ledger.data.violations.length === 1 ? '' : 's'} disagree with the ledger
                  </>
                )}
              </p>
              <p className="numeric mt-1 text-xs text-ink-muted">
                {ledger.data.checked} wallet{ledger.data.checked === 1 ? '' : 's'} checked
              </p>

              {ledger.data.violations.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {ledger.data.violations.map((violation) => (
                    <li
                      key={violation.wallet_id}
                      className="rounded-[var(--radius-panel)] border border-clay-rule bg-paper-raised px-3 py-2"
                    >
                      <p className="numeric text-xs text-ink-faint">
                        wallet {shortId(violation.wallet_id)} · user {shortId(violation.user_id)}
                      </p>
                      <p className="mt-1 text-sm text-clay">{violation.error}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
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

function Count({ value, tone = 'ink' }: { value: number; tone?: 'ink' | 'clay' }) {
  return (
    <span
      className={
        'numeric text-[0.9375rem] ' + (tone === 'clay' ? 'text-clay' : 'text-ink')
      }
    >
      {value.toLocaleString('en-NG')}
    </span>
  )
}
