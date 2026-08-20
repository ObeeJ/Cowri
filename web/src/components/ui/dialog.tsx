import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '~/lib/cn'
import { useDismiss, useFocusTrap, useScrollLock } from '~/lib/a11y'
import { CloseIcon } from '~/components/icons'
import { IconButton } from './button'

type BaseOverlayProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Required. Becomes the accessible name of the surface. */
  title: string
  /** Optional supporting line, wired up as the accessible description. */
  description?: string
  /** Hides the visible header while keeping the accessible name. */
  hideTitle?: boolean
  children: ReactNode
  /** Rendered on a ruled row at the bottom. Put the actions here. */
  footer?: ReactNode
  /** Blocks Escape and backdrop dismissal. Use only while a payment is in flight. */
  dismissable?: boolean
  className?: string
}

function useMounted(open: boolean) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted && open
}

function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <div
      aria-hidden="true"
      onClick={onClick}
      className="fixed inset-0 z-40 bg-ink/45"
      style={{ animation: 'cowri-enter 150ms var(--ease-ui)' }}
    />
  )
}

/**
 * A modal dialog.
 *
 * Focus is trapped inside while open and returned to the trigger on close.
 * Escape and a backdrop click both close it unless `dismissable` is false.
 *
 * @example
 * <Dialog
 *   open={confirming}
 *   onOpenChange={setConfirming}
 *   title="Pay your share"
 *   description="₦4,500 will leave your wallet now."
 *   footer={
 *     <>
 *       <Button onClick={() => setConfirming(false)}>Cancel</Button>
 *       <Button variant="primary" onClick={pay} loading={isPending}>Pay ₦4,500</Button>
 *     </>
 *   }
 * >
 *   <p>This settles your portion of Dinner at Yellow Chilli.</p>
 * </Dialog>
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  hideTitle = false,
  children,
  footer,
  dismissable = true,
  className,
}: BaseOverlayProps) {
  const surface = useRef<HTMLDivElement>(null)
  const id = useId()
  const isOpen = useMounted(open)

  useFocusTrap(surface, isOpen)
  useScrollLock(isOpen)
  useDismiss(surface, isOpen && dismissable, () => onOpenChange(false))

  if (!isOpen) return null

  return createPortal(
    <>
      <Backdrop onClick={() => dismissable && onOpenChange(false)} />
      <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
        <div
          ref={surface}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-title`}
          aria-describedby={description ? `${id}-description` : undefined}
          className={cn(
            'panel relative w-full max-w-lg bg-paper-raised',
            'rounded-t-[10px] sm:rounded-[var(--radius-panel)]',
            className,
          )}
          style={{ animation: 'cowri-enter 150ms var(--ease-ui)' }}
        >
          <div className={cn('flex items-start gap-4 px-5 py-4', hideTitle ? 'sr-only' : 'rule-b')}>
            <div className="min-w-0 flex-1">
              <h2 id={`${id}-title`} className="text-lg leading-6">
                {title}
              </h2>
              {description ? (
                <p id={`${id}-description`} className="mt-1 text-sm text-ink-muted">
                  {description}
                </p>
              ) : null}
            </div>
            {dismissable && !hideTitle ? (
              <IconButton label="Close" size="sm" onClick={() => onOpenChange(false)}>
                <CloseIcon size={18} />
              </IconButton>
            ) : null}
          </div>

          <div className="px-5 py-4">{children}</div>

          {footer ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule bg-paper px-5 py-3">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </>,
    document.body,
  )
}

/**
 * A sheet that rises from the bottom on phones and sits on the right on wider
 * screens. Same semantics as Dialog, different geometry.
 *
 * @example
 * <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} title="Filter transactions">
 *   <TransactionFilters value={filters} onChange={setFilters} />
 * </Drawer>
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  hideTitle = false,
  children,
  footer,
  dismissable = true,
  className,
}: BaseOverlayProps) {
  const surface = useRef<HTMLDivElement>(null)
  const id = useId()
  const isOpen = useMounted(open)

  useFocusTrap(surface, isOpen)
  useScrollLock(isOpen)
  useDismiss(surface, isOpen && dismissable, () => onOpenChange(false))

  if (!isOpen) return null

  return createPortal(
    <>
      <Backdrop onClick={() => dismissable && onOpenChange(false)} />
      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-y-0 sm:left-auto sm:right-0">
        <div
          ref={surface}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-title`}
          aria-describedby={description ? `${id}-description` : undefined}
          className={cn(
            'flex max-h-[85vh] w-full flex-col border-t border-rule bg-paper-raised',
            'sm:h-full sm:max-h-none sm:w-[26rem] sm:border-l sm:border-t-0',
            className,
          )}
        >
          <div className={cn('flex items-start gap-4 px-5 py-4', hideTitle ? 'sr-only' : 'rule-b')}>
            <div className="min-w-0 flex-1">
              <h2 id={`${id}-title`} className="text-lg leading-6">
                {title}
              </h2>
              {description ? (
                <p id={`${id}-description`} className="mt-1 text-sm text-ink-muted">
                  {description}
                </p>
              ) : null}
            </div>
            {dismissable && !hideTitle ? (
              <IconButton label="Close" size="sm" onClick={() => onOpenChange(false)}>
                <CloseIcon size={18} />
              </IconButton>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer ? (
            <div className="flex items-center justify-end gap-2 border-t border-rule bg-paper px-5 py-3">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </>,
    document.body,
  )
}
