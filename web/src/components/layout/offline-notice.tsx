import { useEffect, useState } from 'react'
import { AlertIcon } from '~/components/icons'

/**
 * A standing bar shown while the browser reports no connection.
 *
 * It matters more here than in most apps: a balance rendered from cache while
 * offline may already be wrong, and a contribution attempted offline will fail
 * at the API rather than queue.
 */
export function OfflineNotice() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    // navigator.onLine is only meaningful after mount.
    setOffline(!navigator.onLine)
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 border-b border-clay-rule bg-clay-tint px-4 py-2 text-[0.8125rem] text-clay"
    >
      <AlertIcon size={16} />
      You are offline. Balances may be out of date and payments will not go through.
    </div>
  )
}
