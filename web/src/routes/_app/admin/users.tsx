import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { DataTable } from '~/components/domain/data-table'
import { MoneyAmount } from '~/components/domain/money-amount'
import { StatusPill } from '~/components/domain/status-pill'
import { Badge } from '~/components/ui/display'
import { Button } from '~/components/ui/button'
import { Dialog } from '~/components/ui/dialog'
import { Input } from '~/components/ui/field'
import { EmptyState, ErrorState } from '~/components/ui/states'
import { useToast } from '~/components/ui/toast'
import { UserIcon } from '~/components/icons'
import { useAdminUsers, useSetUserRole } from '~/lib/api/hooks'
import { useAuth } from '~/lib/auth'
import { errorMessage } from '~/lib/api/client'
import { formatDate, shortId } from '~/lib/format'
import { formatPhone } from '~/components/ui/phone-input'
import type { AdminUserRow, UserRole } from '~/lib/api/types'

export const Route = createFileRoute('/_app/admin/users')({
  component: AdminUsersPage,
})

function AdminUsersPage() {
  const users = useAdminUsers()
  const { user: currentUser } = useAuth()
  const [query, setQuery] = useState('')
  const [pendingChange, setPendingChange] = useState<{ user: AdminUserRow; role: UserRole } | null>(
    null,
  )

  if (users.isError) {
    return <ErrorState error={users.error} onRetry={() => void users.refetch()} />
  }

  const term = query.trim().toLowerCase()
  const rows = (users.data?.users ?? []).filter((row) =>
    term === ''
      ? true
      : row.name.toLowerCase().includes(term) ||
        row.phone.includes(term) ||
        row.id.startsWith(term),
  )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-xs">
          <span className="label-caps">Find a user</span>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, phone or id"
          />
        </label>
        <p className="numeric text-sm text-ink-muted">
          {users.data ? `${rows.length} of ${users.data.total}` : null}
        </p>
      </div>

      <DataTable
        caption="All users"
        loading={users.isPending}
        rows={rows}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            icon={<UserIcon size={26} />}
            title={term ? 'Nobody matches that' : 'No users yet'}
            description={term ? 'Try a different name, number or id.' : undefined}
          />
        }
        columns={[
          {
            id: 'name',
            header: 'Name',
            cell: (row) => (
              <span className="flex flex-col">
                <span className="text-ink">{row.name}</span>
                <span className="numeric text-xs text-ink-faint">{shortId(row.id)}</span>
              </span>
            ),
          },
          {
            id: 'phone',
            header: 'Phone',
            hideOnMobile: true,
            cell: (row) => <span className="numeric">{formatPhone(row.phone)}</span>,
          },
          {
            id: 'role',
            header: 'Role',
            cell: (row) =>
              row.role === 'admin' ? <Badge tone="accent">Admin</Badge> : <Badge>Member</Badge>,
          },
          {
            id: 'kyc',
            header: 'KYC',
            hideOnMobile: true,
            cell: (row) => <StatusPill kind="kyc" status={row.kyc_status} />,
          },
          {
            id: 'balance',
            header: 'Balance',
            numeric: true,
            cell: (row) => <MoneyAmount kobo={row.balance_kobo} size="sm" koboDigits="always" />,
          },
          {
            id: 'joined',
            header: 'Joined',
            hideOnMobile: true,
            cell: (row) => <span className="text-ink-muted">{formatDate(row.created_at)}</span>,
          },
          {
            id: 'actions',
            header: <span className="sr-only">Change role</span>,
            numeric: true,
            cell: (row) => (
              <Button
                size="sm"
                disabled={row.id === currentUser?.id}
                title={
                  row.id === currentUser?.id
                    ? 'You cannot change your own role'
                    : undefined
                }
                onClick={() =>
                  setPendingChange({ user: row, role: row.role === 'admin' ? 'user' : 'admin' })
                }
              >
                {row.role === 'admin' ? 'Make member' : 'Make admin'}
              </Button>
            ),
          },
        ]}
      />

      <RoleChangeDialog change={pendingChange} onClose={() => setPendingChange(null)} />
    </>
  )
}

function RoleChangeDialog({
  change,
  onClose,
}: {
  change: { user: AdminUserRow; role: UserRole } | null
  onClose: () => void
}) {
  const { toast } = useToast()
  const setRole = useSetUserRole()
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!change) return
    setError(null)
    try {
      await setRole.mutateAsync({ id: change.user.id, role: change.role })
      toast({
        title: 'Role updated',
        description: `${change.user.name} is now ${change.role === 'admin' ? 'an administrator' : 'a member'}.`,
        tone: 'success',
      })
      onClose()
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <Dialog
      open={change !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null)
          onClose()
        }
      }}
      title={change?.role === 'admin' ? 'Grant administrator access' : 'Remove administrator access'}
      description={
        change
          ? change.role === 'admin'
            ? `${change.user.name} will be able to see every user, every transaction and every circle on the platform.`
            : `${change.user.name} will lose access to the admin console.`
          : undefined
      }
      dismissable={!setRole.isPending}
      footer={
        <>
          <Button onClick={onClose} disabled={setRole.isPending}>
            Cancel
          </Button>
          <Button
            variant={change?.role === 'admin' ? 'primary' : 'danger'}
            onClick={confirm}
            loading={setRole.isPending}
            loadingText="Saving"
          >
            {change?.role === 'admin' ? 'Grant admin' : 'Remove admin'}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-ink-muted">
        Roles are held in the API's own store. The change takes effect on that user's next request.
      </p>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-[var(--radius-panel)] border border-clay-rule bg-clay-tint px-3 py-2.5 text-sm text-clay"
        >
          {error}
        </p>
      ) : null}
    </Dialog>
  )
}
