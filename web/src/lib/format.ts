/** Date and text formatting, in the locale Cowri is used in. */

const LOCALE = 'en-NG'

const dateOnly = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const dateTime = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const timeOnly = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' })

const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

export function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : dateOnly.format(date)
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : dateTime.format(date)
}

export function formatTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : timeOnly.format(date)
}

/** "3 days ago", "in 2 hours". Falls back to a date beyond a month. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  const seconds = (date.getTime() - now.getTime()) / 1000
  const absolute = Math.abs(seconds)

  if (absolute < 60) return 'just now'
  if (absolute < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (absolute < 86_400) return relative.format(Math.round(seconds / 3600), 'hour')
  if (absolute < 2_592_000) return relative.format(Math.round(seconds / 86_400), 'day')
  return dateOnly.format(date)
}

/** Groups a list by calendar day, newest first, for a ledger view. */
export function groupByDay<T>(items: T[], getDate: (item: T) => string): Array<[string, T[]]> {
  const buckets = new Map<string, T[]>()
  for (const item of items) {
    const key = getDate(item).slice(0, 10)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(item)
    else buckets.set(key, [item])
  }
  return [...buckets.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
}

/** "Today", "Yesterday", or a full date. */
export function dayHeading(isoDay: string, now: Date = new Date()): string {
  const today = now.toISOString().slice(0, 10)
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10)
  if (isoDay === today) return 'Today'
  if (isoDay === yesterday) return 'Yesterday'
  return formatDate(`${isoDay}T00:00:00Z`)
}

/** First name only, for greetings. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

/** Shortens a uuid for display in an audit table. */
export function shortId(id: string): string {
  return id.slice(0, 8)
}
