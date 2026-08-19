import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '~/components/domain/page-header'
import { AjoGroupCard, AjoGroupCardSkeleton } from '~/components/domain/ajo'
import { Button } from '~/components/ui/button'
import { Tabs } from '~/components/ui/tabs'
import { EmptyState, ErrorState } from '~/components/ui/states'
import { CircleGroupIcon, PlusIcon } from '~/components/icons'
import { useAjoGroups } from '~/lib/api/hooks'
import type { AjoStatus } from '~/lib/api/types'

export const Route = createFileRoute('/_app/ajo/')({
  component: AjoListPage,
})

type Filter = 'active' | 'completed' | 'all'

function matches(status: AjoStatus, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'active') return status === 'active' || status === 'paused'
  return status === 'completed'
}

function AjoListPage() {
  const groups = useAjoGroups()
  const [filter, setFilter] = useState<Filter>('active')

  const all = groups.data ?? []
  const shown = all.filter((group) => matches(group.status, filter))

  return (
    <>
      <PageHeader
        title="Savings circles"
        description="Every circle you belong to, with the cycle it has reached."
        actions={
          <Link to="/ajo/new">
            <Button variant="primary" leading={<PlusIcon size={16} />}>
              Start a circle
            </Button>
          </Link>
        }
      />

      {groups.isError ? (
        <ErrorState error={groups.error} onRetry={() => void groups.refetch()} />
      ) : (
        <Tabs
          label="Filter circles"
          value={filter}
          onValueChange={(next) => setFilter(next as Filter)}
          items={[
            {
              value: 'active',
              label: 'Running',
              badge: groups.isPending
                ? undefined
                : all.filter((group) => matches(group.status, 'active')).length,
            },
            {
              value: 'completed',
              label: 'Finished',
              badge: groups.isPending
                ? undefined
                : all.filter((group) => matches(group.status, 'completed')).length,
            },
            { value: 'all', label: 'All', badge: groups.isPending ? undefined : all.length },
          ]}
        >
          {groups.isPending ? (
            <ul className="flex flex-col gap-3">
              <AjoGroupCardSkeleton />
              <AjoGroupCardSkeleton />
              <AjoGroupCardSkeleton />
            </ul>
          ) : shown.length === 0 ? (
            <EmptyState
              icon={<CircleGroupIcon size={28} />}
              title={
                filter === 'completed'
                  ? 'No finished circles yet'
                  : all.length === 0
                    ? 'You are not in a circle yet'
                    : 'Nothing running right now'
              }
              description={
                all.length === 0
                  ? 'A circle is a group who contribute the same amount on a schedule, taking turns to collect the pot. Start one and invite the people you already save with.'
                  : 'Circles you finish will stay here so you can look back at them.'
              }
              action={
                <Link to="/ajo/new">
                  <Button variant="primary">Start a circle</Button>
                </Link>
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {shown.map((group) => (
                <AjoGroupCard key={group.id} group={group} />
              ))}
            </ul>
          )}
        </Tabs>
      )}
    </>
  )
}
