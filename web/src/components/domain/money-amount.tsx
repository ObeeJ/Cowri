import { useEffect, useRef, useState } from 'react'
import { cn } from '~/lib/cn'
import { formatKobo, speakKobo, type MoneyFormatOptions } from '~/lib/money'

export type MoneyAmountSize = 'sm' | 'md' | 'lg' | 'display'
export type MoneyTone = 'default' | 'muted' | 'credit' | 'debit' | 'auto'

export type MoneyAmountProps = {
  /** Integer kobo, exactly as the API returned it. */
  kobo: number
  size?: MoneyAmountSize
  /** 'auto' colours by sign: credits accent, debits clay. */
  tone?: MoneyTone
  /** Show a leading + or - . */
  signed?: boolean
  /** Kobo digits: 'auto' hides them on whole naira amounts. */
  koboDigits?: MoneyFormatOptions['kobo']
  /** Counts up to a changed value over 450ms. For the balance, not for lists. */
  animate?: boolean
  className?: string
}

const sizes: Record<MoneyAmountSize, string> = {
  sm: 'text-[0.8125rem]',
  md: 'text-[0.9375rem]',
  lg: 'text-xl',
  display: 'text-[2.125rem] leading-[1.1] sm:text-[2.75rem]',
}

const tones: Record<Exclude<MoneyTone, 'auto'>, string> = {
  default: 'text-ink',
  muted: 'text-ink-muted',
  credit: 'text-accent',
  debit: 'text-clay',
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])
  return reduced
}

/** Eases a displayed figure toward a new one. Returns the value to render. */
function useRollUp(target: number, enabled: boolean): number {
  const [displayed, setDisplayed] = useState(target)
  const frame = useRef<number>(0)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (!enabled || reduced) {
      setDisplayed(target)
      return
    }
    const from = displayed
    if (from === target) return

    const duration = 450
    const start = performance.now()

    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      // Ease out, so the figure settles rather than snapping.
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(from + (target - from) * eased))
      if (progress < 1) frame.current = requestAnimationFrame(step)
    }

    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, enabled, reduced])

  return enabled && !reduced ? displayed : target
}

/**
 * The only component that renders money.
 *
 * Figures are tabular so digits sit in fixed columns and a changing balance does
 * not shift the layout around it. Screen readers get a spoken form, because
 * "₦12,345.67" is read unreliably.
 *
 * @example
 * <MoneyAmount kobo={wallet.available_kobo} size="display" animate />
 *
 * @example
 * // In a ledger row, coloured by direction
 * <MoneyAmount kobo={transaction.kind === 'debit' ? -amount : amount} tone="auto" signed />
 */
export function MoneyAmount({
  kobo,
  size = 'md',
  tone = 'default',
  signed = false,
  koboDigits = 'auto',
  animate = false,
  className,
}: MoneyAmountProps) {
  const value = useRollUp(kobo, animate)
  const resolvedTone = tone === 'auto' ? (kobo < 0 ? 'debit' : 'credit') : tone

  return (
    <span
      className={cn('numeric tabular-nums', sizes[size], tones[resolvedTone], className)}
      // The animated figure would otherwise be announced on every frame.
      aria-label={speakKobo(kobo)}
    >
      <span aria-hidden="true">{formatKobo(value, { signed, kobo: koboDigits })}</span>
    </span>
  )
}
