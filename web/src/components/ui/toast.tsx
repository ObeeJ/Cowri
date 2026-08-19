import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '~/lib/cn'
import { AlertIcon, CloseIcon, InfoIcon, TickIcon } from '~/components/icons'
import { IconButton } from './button'

export type ToastTone = 'info' | 'success' | 'warning'

export type Toast = {
  id: string
  title: string
  /** Optional second line. Keep it to one sentence. */
  description?: string
  tone: ToastTone
  /** Milliseconds before auto-dismiss. Pass 0 to require a manual dismiss. */
  duration: number
  action?: { label: string; onSelect: () => void }
}

export type ToastInput = Omit<Partial<Toast>, 'id'> & { title: string }

type ToastContextValue = {
  /** Shows a toast and returns its id, so it can be dismissed early. */
  toast: (input: ToastInput) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toneStyles: Record<ToastTone, { border: string; icon: ReactNode }> = {
  info: { border: 'border-rule-strong', icon: <InfoIcon size={18} /> },
  success: { border: 'border-accent-rule', icon: <TickIcon size={18} /> },
  warning: { border: 'border-clay-rule', icon: <AlertIcon size={18} /> },
}

/**
 * Transient messages.
 *
 * The live region is polite for info and success and assertive for warnings, so
 * a failed payment interrupts a screen reader while a copied invite link does
 * not. Nothing essential should live only in a toast: it disappears.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (input: ToastInput) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const next: Toast = {
        id,
        title: input.title,
        description: input.description,
        tone: input.tone ?? 'info',
        duration: input.duration ?? (input.tone === 'warning' ? 8000 : 5000),
        action: input.action,
      }
      setToasts((current) => [...current.slice(-3), next])
      if (next.duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), next.duration),
        )
      }
      return id
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending.values()) clearTimeout(timer)
      pending.clear()
    }
  }, [])

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext>
  )
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end">
      {toasts.map((item) => (
        <div
          key={item.id}
          role={item.tone === 'warning' ? 'alert' : 'status'}
          aria-live={item.tone === 'warning' ? 'assertive' : 'polite'}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-start gap-3 border bg-paper-raised',
            'rounded-[var(--radius-panel)] px-4 py-3',
            toneStyles[item.tone].border,
          )}
          style={{ animation: 'cowri-enter 150ms var(--ease-ui)' }}
        >
          <span
            aria-hidden="true"
            className={cn(
              'mt-0.5 shrink-0',
              item.tone === 'success' && 'text-accent',
              item.tone === 'warning' && 'text-clay',
              item.tone === 'info' && 'text-ink-faint',
            )}
          >
            {toneStyles[item.tone].icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">{item.title}</p>
            {item.description ? (
              <p className="mt-0.5 text-[0.8125rem] leading-5 text-ink-muted">{item.description}</p>
            ) : null}
            {item.action ? (
              <button
                type="button"
                onClick={() => {
                  item.action?.onSelect()
                  onDismiss(item.id)
                }}
                className="mt-1.5 cursor-pointer text-sm font-medium text-accent underline underline-offset-4"
              >
                {item.action.label}
              </button>
            ) : null}
          </div>
          <IconButton label="Dismiss" size="sm" onClick={() => onDismiss(item.id)}>
            <CloseIcon size={16} />
          </IconButton>
        </div>
      ))}
    </div>,
    document.body,
  )
}

/**
 * @example
 * const { toast } = useToast()
 * toast({ title: 'Invite link copied', tone: 'success' })
 * toast({ title: 'Payment failed', description: message, tone: 'warning' })
 */
export function useToast(): ToastContextValue {
  const context = use(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
