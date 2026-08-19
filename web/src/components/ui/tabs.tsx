import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '~/lib/cn'

export type TabItem = {
  /** Stable key used as the controlled value. */
  value: string
  label: string
  /** Small count or status rendered after the label. */
  badge?: ReactNode
  disabled?: boolean
}

export type TabsProps = {
  items: TabItem[]
  value: string
  onValueChange: (value: string) => void
  /** Names the tab list. Required when more than one set is on a page. */
  label: string
  children: ReactNode
  className?: string
}

/**
 * A controlled tab set following the ARIA authoring practice: one tab stop for
 * the whole list, arrow keys to move between tabs, and manual activation so
 * arrowing through does not fire a data fetch per tab.
 *
 * @example
 * <Tabs
 *   label="Transaction type"
 *   value={filter}
 *   onValueChange={setFilter}
 *   items={[
 *     { value: 'all', label: 'All' },
 *     { value: 'credit', label: 'Money in' },
 *     { value: 'debit', label: 'Money out' },
 *   ]}
 * >
 *   <TransactionList transactions={filtered} />
 * </Tabs>
 */
export function Tabs({ items, value, onValueChange, label, children, className }: TabsProps) {
  const id = useId()
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const enabled = items
    .map((item, index) => (item.disabled ? -1 : index))
    .filter((index) => index >= 0)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = items.findIndex((item) => item.value === value)
    const position = enabled.indexOf(currentIndex)
    if (position < 0 || enabled.length === 0) return

    let nextPosition: number | null = null
    if (event.key === 'ArrowRight') nextPosition = (position + 1) % enabled.length
    if (event.key === 'ArrowLeft') nextPosition = (position - 1 + enabled.length) % enabled.length
    if (event.key === 'Home') nextPosition = 0
    if (event.key === 'End') nextPosition = enabled.length - 1
    if (nextPosition === null) return

    event.preventDefault()
    const nextIndex = enabled[nextPosition]!
    tabRefs.current[nextIndex]?.focus()
    onValueChange(items[nextIndex]!.value)
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={handleKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-rule"
      >
        {items.map((item, index) => {
          const selected = item.value === value
          return (
            <button
              key={item.value}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${id}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => onValueChange(item.value)}
              className={cn(
                'relative -mb-px flex cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2.5',
                'text-sm transition-colors duration-150 ease-[var(--ease-ui)]',
                'disabled:cursor-not-allowed disabled:text-ink-faint',
                selected
                  ? 'border-b-2 border-accent font-medium text-ink'
                  : 'border-b-2 border-transparent text-ink-muted hover:text-ink',
              )}
            >
              {item.label}
              {item.badge ? <span className="numeric text-xs text-ink-faint">{item.badge}</span> : null}
            </button>
          )
        })}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel-${value}`}
        aria-labelledby={`${id}-tab-${value}`}
        tabIndex={0}
        className="pt-4 focus-visible:outline-none"
      >
        {children}
      </div>
    </div>
  )
}
