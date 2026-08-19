import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { cn } from '~/lib/cn'
import { useDismiss } from '~/lib/a11y'

type Align = 'start' | 'end'

const surfaceClasses =
  'absolute z-50 min-w-[12rem] border border-rule-strong bg-paper-raised ' +
  'rounded-[var(--radius-panel)] py-1'

// ── Popover ─────────────────────────────────────────────────────────────────

export type PopoverProps = {
  /** The control that opens the surface. Gets the aria wiring automatically. */
  trigger: ReactElement<Record<string, unknown>>
  children: ReactNode
  /** Names the surface for assistive technology. */
  label: string
  align?: Align
  className?: string
}

/**
 * A non-modal surface anchored to its trigger. The page behind stays scrollable
 * and interactive, which is the difference between this and Dialog.
 *
 * @example
 * <Popover label="Wallet details" trigger={<Button>Details</Button>}>
 *   <dl className="p-3 text-sm">…</dl>
 * </Popover>
 */
export function Popover({ trigger, children, label, align = 'start', className }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const surface = useRef<HTMLDivElement>(null)
  const anchor = useRef<HTMLDivElement>(null)
  const id = useId()

  useDismiss(surface, open, () => setOpen(false), { ignore: anchor })

  return (
    <div ref={anchor} className="relative inline-block">
      {cloneElement(trigger, {
        'aria-expanded': open,
        'aria-haspopup': 'dialog',
        'aria-controls': open ? id : undefined,
        onClick: () => setOpen((current) => !current),
      })}
      {open ? (
        <div
          ref={surface}
          id={id}
          role="dialog"
          aria-label={label}
          className={cn(
            surfaceClasses,
            'top-[calc(100%+6px)]',
            align === 'end' ? 'right-0' : 'left-0',
            className,
          )}
          style={{ animation: 'cowri-enter 150ms var(--ease-ui)' }}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

// ── DropdownMenu ────────────────────────────────────────────────────────────

export type MenuItem = {
  label: string
  onSelect: () => void
  /** Rendered before the label. */
  icon?: ReactNode
  /** Renders the item in the warning tone. Use for sign out and destructive items. */
  danger?: boolean
  disabled?: boolean
}

export type DropdownMenuProps = {
  trigger: ReactElement<Record<string, unknown>>
  items: MenuItem[]
  label: string
  align?: Align
  className?: string
}

/**
 * A menu of actions. Arrow keys move through the items, Home and End jump to
 * the ends, Escape closes and returns focus to the trigger.
 *
 * @example
 * <DropdownMenu
 *   label="Account"
 *   align="end"
 *   trigger={<IconButton label="Account"><UserIcon /></IconButton>}
 *   items={[
 *     { label: 'Settings', icon: <SettingsIcon size={16} />, onSelect: goToSettings },
 *     { label: 'Sign out', icon: <SignOutIcon size={16} />, danger: true, onSelect: signOut },
 *   ]}
 * />
 */
export function DropdownMenu({
  trigger,
  items,
  label,
  align = 'start',
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const surface = useRef<HTMLDivElement>(null)
  const anchor = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const id = useId()

  useDismiss(surface, open, () => setOpen(false), { ignore: anchor })

  const enabledIndexes = items
    .map((item, index) => (item.disabled ? -1 : index))
    .filter((index) => index >= 0)

  useEffect(() => {
    if (!open) return
    const first = enabledIndexes[0] ?? 0
    setActiveIndex(first)
    itemRefs.current[first]?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function move(delta: number) {
    if (enabledIndexes.length === 0) return
    const position = enabledIndexes.indexOf(activeIndex)
    const nextPosition =
      (position + delta + enabledIndexes.length) % enabledIndexes.length
    const next = enabledIndexes[nextPosition]!
    setActiveIndex(next)
    itemRefs.current[next]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      move(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      move(-1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      const first = enabledIndexes[0]
      if (first !== undefined) {
        setActiveIndex(first)
        itemRefs.current[first]?.focus()
      }
    } else if (event.key === 'End') {
      event.preventDefault()
      const last = enabledIndexes[enabledIndexes.length - 1]
      if (last !== undefined) {
        setActiveIndex(last)
        itemRefs.current[last]?.focus()
      }
    }
  }

  return (
    <div ref={anchor} className="relative inline-block">
      {cloneElement(trigger, {
        'aria-expanded': open,
        'aria-haspopup': 'menu',
        'aria-controls': open ? id : undefined,
        onClick: () => setOpen((current) => !current),
      })}
      {open ? (
        <div
          ref={surface}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={handleKeyDown}
          className={cn(
            surfaceClasses,
            'top-[calc(100%+6px)]',
            align === 'end' ? 'right-0' : 'left-0',
            className,
          )}
          style={{ animation: 'cowri-enter 150ms var(--ease-ui)' }}
        >
          {items.map((item, index) => (
            <button
              key={item.label}
              ref={(node) => {
                itemRefs.current[index] = node
              }}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm',
                'transition-colors duration-150 ease-[var(--ease-ui)]',
                'disabled:cursor-not-allowed disabled:text-ink-faint',
                item.danger ? 'text-clay hover:bg-clay-tint' : 'text-ink hover:bg-paper-sunken',
              )}
            >
              {item.icon ? <span className="shrink-0 text-ink-faint">{item.icon}</span> : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ── Tooltip ─────────────────────────────────────────────────────────────────

export type TooltipProps = {
  /** Short supporting text. Never put anything essential in here. */
  content: string
  children: ReactElement<{ ref?: Ref<HTMLElement>; 'aria-describedby'?: string }>
  align?: Align | 'center'
  className?: string
}

/**
 * A hint attached to a control, shown on hover and on keyboard focus.
 *
 * Tooltips are invisible on touch devices by nature, so they only ever repeat
 * or expand on something already visible, never carry it alone.
 *
 * @example
 * <Tooltip content="Held funds settle within minutes">
 *   <button type="button" className="underline">Ledger balance</button>
 * </Tooltip>
 */
export function Tooltip({ content, children, align = 'center', className }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      {cloneElement(children, { 'aria-describedby': open ? id : undefined })}
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={cn(
            'pointer-events-none absolute bottom-[calc(100%+6px)] z-50 w-max max-w-[16rem]',
            'border border-rule-strong bg-ink px-2.5 py-1.5 text-xs leading-4 text-ink-inverse',
            'rounded-[var(--radius-panel)]',
            align === 'start' && 'left-0',
            align === 'end' && 'right-0',
            align === 'center' && 'left-1/2 -translate-x-1/2',
            className,
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  )
}
