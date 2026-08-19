import { Link, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { PageHeader } from '~/components/domain/page-header'
import { cn } from '~/lib/cn'
import { useAuth } from '~/lib/auth'

/**
 * The admin section.
 *
 * The role flag on the cached profile decides what this app draws, and nothing
 * more. Every admin endpoint is gated by `require_admin` on the API, which
 * returns 403 no matter what this client believes, so a tampered-with cache buys
 * an attacker an empty page and a row of error states.
 */
export const Route = createFileRoute('/_app/admin')({
  component: AdminLayout,
})

const tabs = [
  { to: '/admin', label: 'Overview', exact: true },
  { to: '/admin/users', label: 'Users', exact: false },
  { to: '/admin/transactions', label: 'Transactions', exact: false },
  { to: '/admin/ajo', label: 'Circles', exact: false },
  { to: '/admin/health', label: 'System health', exact: false },
] as const

function AdminLayout() {
  const { isAdmin } = useAuth()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Administration" />
        <div
          role="alert"
          className="rounded-[var(--radius-panel)] border border-clay-rule bg-clay-tint px-5 py-5"
        >
          <h2 className="text-base text-ink">This area is for administrators</h2>
          <p className="mt-1 max-w-prose text-sm leading-6 text-ink-muted">
            Your account does not have the administrator role. If you believe it should, ask an
            existing administrator to grant it from the Users page.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Admin console"
        description="Platform totals, user roles, the transaction record, and the health of the ledger and the outbox."
      />

      <nav aria-label="Admin sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-rule">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to)
          return (
            <Link
              key={tab.to}
              to={tab.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm',
                'transition-colors duration-150 ease-[var(--ease-ui)]',
                active
                  ? 'border-accent font-medium text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink',
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>

      <Outlet />
    </>
  )
}
