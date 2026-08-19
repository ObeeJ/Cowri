import type { ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton'

export type Column<Row> = {
  /** Stable key. Also used as the React key for cells. */
  id: string
  header: ReactNode
  /** Renders the cell. Return a string for text, or any node. */
  cell: (row: Row) => ReactNode
  /** Right aligns and applies tabular figures. Use for every money column. */
  numeric?: boolean
  /** Hides the column below the sm breakpoint. */
  hideOnMobile?: boolean
  width?: string
}

export type DataTableProps<Row> = {
  columns: Array<Column<Row>>
  rows: Row[]
  getRowId: (row: Row) => string
  /** Names the table. Required. */
  caption: string
  /** Hides the caption visually while keeping it for screen readers. */
  hideCaption?: boolean
  loading?: boolean
  /** Shown instead of the table body when there are no rows. */
  empty?: ReactNode
  className?: string
}

/**
 * A ruled table for the admin surfaces.
 *
 * Scrolls horizontally inside its own container rather than pushing the page
 * wide, and keeps the caption in the accessibility tree even when hidden.
 *
 * @example
 * <DataTable
 *   caption="All users"
 *   rows={data.users}
 *   getRowId={(user) => user.id}
 *   columns={[
 *     { id: 'name', header: 'Name', cell: (user) => user.name },
 *     { id: 'balance', header: 'Balance', numeric: true,
 *       cell: (user) => <MoneyAmount kobo={user.balance_kobo} size="sm" /> },
 *   ]}
 * />
 */
export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  caption,
  hideCaption = true,
  loading = false,
  empty,
  className,
}: DataTableProps<Row>) {
  if (loading) {
    return (
      <SkeletonGroup label={`Loading ${caption.toLowerCase()}`} className={cn('panel', className)}>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 border-b border-rule px-4 py-3 last:border-b-0">
            {columns.map((column) => (
              <Skeleton
                key={column.id}
                width={column.numeric ? '4.5rem' : '8rem'}
                height="0.875rem"
                className={column.numeric ? 'ml-auto' : undefined}
              />
            ))}
          </div>
        ))}
      </SkeletonGroup>
    )
  }

  if (rows.length === 0 && empty) return <>{empty}</>

  return (
    <div className={cn('panel overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-sm">
        <caption className={cn('px-4 py-3 text-left', hideCaption ? 'sr-only' : 'label-caps')}>
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-rule-strong">
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={cn(
                  'label-caps whitespace-nowrap px-4 py-2.5',
                  column.numeric && 'text-right',
                  column.hideOnMobile && 'hidden sm:table-cell',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {rows.map((row) => (
            <tr key={getRowId(row)} className="transition-colors duration-150 ease-[var(--ease-ui)] hover:bg-paper-sunken">
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={cn(
                    'px-4 py-3 align-middle text-ink',
                    column.numeric && 'numeric text-right',
                    column.hideOnMobile && 'hidden sm:table-cell',
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
