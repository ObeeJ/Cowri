/**
 * Money handling.
 *
 * The API stores and returns every amount as an integer number of kobo
 * (1 naira = 100 kobo). Nothing in this file converts to a float. Formatting is
 * done by splitting the integer into naira and kobo parts, so a value can make
 * a full round trip through the UI without drifting.
 */

export const KOBO_PER_NAIRA = 100

const NAIRA = '₦'

export type MoneyFormatOptions = {
  /** Render the naira sign. Default true. */
  sign?: boolean
  /** Render the kobo part. 'auto' hides it when the amount is whole naira. */
  kobo?: 'always' | 'never' | 'auto'
  /** Prefix a non-zero amount with + or -. Default false. */
  signed?: boolean
}

function groupThousands(digits: string): string {
  let out = ''
  for (let i = 0; i < digits.length; i++) {
    const fromEnd = digits.length - i
    out += digits[i]
    if (fromEnd > 1 && fromEnd % 3 === 1) out += ','
  }
  return out
}

/**
 * Format an integer kobo amount for display.
 *
 * formatKobo(1234567)            // "₦12,345.67"
 * formatKobo(500000)             // "₦5,000"
 * formatKobo(500000, { kobo: 'always' })  // "₦5,000.00"
 * formatKobo(-2500, { signed: true })     // "-₦25"
 */
export function formatKobo(amountKobo: number, options: MoneyFormatOptions = {}): string {
  const { sign = true, kobo = 'auto', signed = false } = options
  const safe = Number.isFinite(amountKobo) ? Math.trunc(amountKobo) : 0
  const negative = safe < 0
  const absolute = Math.abs(safe)

  const naira = Math.floor(absolute / KOBO_PER_NAIRA)
  const remainder = absolute % KOBO_PER_NAIRA

  const showKobo = kobo === 'always' || (kobo === 'auto' && remainder !== 0)
  const body =
    groupThousands(String(naira)) + (showKobo ? '.' + String(remainder).padStart(2, '0') : '')

  const prefix = negative ? '-' : signed && safe > 0 ? '+' : ''
  return prefix + (sign ? NAIRA : '') + body
}

/** Spoken form for screen readers, which do not read ₦ or grouped digits well. */
export function speakKobo(amountKobo: number): string {
  const safe = Math.trunc(amountKobo)
  const negative = safe < 0
  const absolute = Math.abs(safe)
  const naira = Math.floor(absolute / KOBO_PER_NAIRA)
  const remainder = absolute % KOBO_PER_NAIRA
  const parts = [`${naira} naira`]
  if (remainder !== 0) parts.push(`${remainder} kobo`)
  return (negative ? 'minus ' : '') + parts.join(' ')
}

/**
 * Parse user input in naira into integer kobo.
 *
 * Returns null when the input cannot be read as an amount, so callers can show
 * a field error rather than silently funding the wrong number.
 */
export function parseNairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[\s,]/g, '').replace(NAIRA, '')
  if (cleaned === '') return null
  if (!/^\d*(\.\d{0,2})?$/.test(cleaned)) return null

  const [wholePart = '', fractionPart = ''] = cleaned.split('.')
  const whole = wholePart === '' ? 0 : Number(wholePart)
  if (!Number.isSafeInteger(whole)) return null

  const kobo = Number(fractionPart.padEnd(2, '0') || '0')
  return whole * KOBO_PER_NAIRA + kobo
}

/** Naira-only text for an input field, without the sign or grouping. */
export function koboToInputValue(amountKobo: number): string {
  const safe = Math.trunc(amountKobo)
  const naira = Math.floor(Math.abs(safe) / KOBO_PER_NAIRA)
  const remainder = Math.abs(safe) % KOBO_PER_NAIRA
  const body = remainder === 0 ? String(naira) : `${naira}.${String(remainder).padStart(2, '0')}`
  return safe < 0 ? `-${body}` : body
}

/**
 * Split an amount into n shares with the remainder distributed one kobo at a
 * time, so the shares always sum back to the original amount.
 *
 * The API currently floors every share instead (see backend/src/services/bills.rs),
 * which leaves a remainder uncollected. Use `splitFloor` to preview what the API
 * will actually do, and this function anywhere the frontend owns the arithmetic.
 */
export function splitFairly(totalKobo: number, shares: number): number[] {
  if (shares <= 0) return []
  const total = Math.trunc(totalKobo)
  const base = Math.floor(total / shares)
  const remainder = total - base * shares
  return Array.from({ length: shares }, (_, index) => base + (index < remainder ? 1 : 0))
}

/** Mirrors the API's floor division, including the uncollected remainder. */
export function splitFloor(
  totalKobo: number,
  shares: number,
): { shareKobo: number; unallocatedKobo: number } {
  if (shares <= 0) return { shareKobo: 0, unallocatedKobo: Math.trunc(totalKobo) }
  const total = Math.trunc(totalKobo)
  const shareKobo = Math.floor(total / shares)
  return { shareKobo, unallocatedKobo: total - shareKobo * shares }
}

/** The API charges 0.5% of each Ajo contribution, by integer division. */
export function ajoFeeKobo(contributionKobo: number): number {
  return Math.floor(Math.trunc(contributionKobo) / 200)
}
