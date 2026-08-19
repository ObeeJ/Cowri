import { ArrowIcon } from '~/components/icons'
import { cn } from '~/lib/cn'
import { Button } from './button'

export type PaginationProps = {
  /** Zero based, matching the API's `page` query parameter. */
  page: number
  onPageChange: (page: number) => void
  /** Total item count when the endpoint reports one. */
  total?: number
  perPage: number
  /**
   * For endpoints that return a bare array with no total (the wallet and bill
   * lists), pass the length of the current page so the control can tell whether
   * a next page might exist.
   */
  currentPageCount?: number
  className?: string
}

/**
 * Previous and next paging.
 *
 * Two of the list endpoints return a plain array with no total, so this control
 * infers the end of the data from a short final page rather than pretending to
 * know how many pages there are.
 *
 * @example
 * <Pagination page={page} perPage={20} currentPageCount={rows.length} onPageChange={setPage} />
 */
export function Pagination({
  page,
  onPageChange,
  total,
  perPage,
  currentPageCount,
  className,
}: PaginationProps) {
  const knownTotal = typeof total === 'number'
  const lastPage = knownTotal ? Math.max(0, Math.ceil(total / perPage) - 1) : null
  const hasNext = knownTotal
    ? page < (lastPage ?? 0)
    : currentPageCount !== undefined
      ? currentPageCount >= perPage
      : true
  const hasPrevious = page > 0

  const from = page * perPage + 1
  const shown = currentPageCount ?? perPage

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-4 pt-3', className)}
    >
      <p aria-live="polite" className="text-[0.8125rem] text-ink-muted">
        {shown === 0 ? (
          'No results'
        ) : (
          <>
            <span className="numeric">
              {from}
              {'–'}
              {from + shown - 1}
            </span>
            {knownTotal ? (
              <>
                {' of '}
                <span className="numeric">{total}</span>
              </>
            ) : null}
          </>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!hasPrevious}
          onClick={() => onPageChange(page - 1)}
          leading={<ArrowIcon direction="left" size={16} />}
        >
          Previous
        </Button>
        <Button
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
          trailing={<ArrowIcon direction="right" size={16} />}
        >
          Next
        </Button>
      </div>
    </nav>
  )
}
