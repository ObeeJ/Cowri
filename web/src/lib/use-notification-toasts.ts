import { useEffect, useRef } from 'react'
import { useNotifications } from './api/hooks'
import { useToast } from '~/components/ui/toast'

const LAST_SEEN_KEY = 'cowri.notifications.lastSeenAt.v1'

function readLastSeen(): string | null {
  try {
    return window.localStorage.getItem(LAST_SEEN_KEY)
  } catch {
    // Private browsing can refuse storage — toasts still work for this tab,
    // they just may repeat after a reload.
    return null
  }
}

function writeLastSeen(value: string): void {
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, value)
  } catch {
    // See above.
  }
}

/**
 * Surfaces new notifications as toasts while the app is open — money
 * received, a circle contribution, a bill share someone else paid. There is
 * no push channel yet, so `useNotifications` polls and this hook diffs each
 * batch against the newest timestamp already shown, so a poll never
 * re-toasts something the user already saw, and a reload doesn't either.
 *
 * Mounted once, in the authenticated app shell.
 */
export function useNotificationToasts(enabled: boolean) {
  const { data: notifications } = useNotifications(enabled)
  const { toast } = useToast()
  // null means "no watermark yet" — first-ever load on this device, nothing
  // to diff against, so the first batch only establishes the watermark
  // rather than replaying a stranger's account history as toasts.
  const lastSeenAt = useRef<string | null>(enabled ? readLastSeen() : null)

  useEffect(() => {
    const first = notifications?.[0]
    if (!enabled || !first) return

    const newest = first.created_at
    const baseline = lastSeenAt.current

    if (baseline) {
      // Oldest first, so a toast stack reads in the order things happened.
      const unseen = notifications.filter((n) => n.created_at > baseline)
      for (const n of [...unseen].reverse()) {
        toast({ title: n.title, description: n.body, tone: 'success' })
      }
    }

    if (newest !== baseline) {
      lastSeenAt.current = newest
      writeLastSeen(newest)
    }
  }, [enabled, notifications, toast])
}
