import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Spinner } from '~/components/ui/spinner'
import { Button } from '~/components/ui/button'
import { TickIcon, AlertIcon } from '~/components/icons'
import { usePaymentStatus } from '~/lib/api/hooks'

type VerifySearch = { reference?: string }

export const Route = createFileRoute('/_app/wallet/verify')({
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    reference: typeof search.reference === 'string' ? search.reference : undefined,
  }),
  component: WalletVerifyPage,
})

/**
 * Where Paystack redirects after a wallet top-up. The webhook that actually
 * settles the attempt lands asynchronously — sometimes after the browser is
 * already back here — so this page polls rather than assuming the redirect
 * alone means the money moved, then sends the user on to /wallet once it
 * knows either way.
 */
function WalletVerifyPage() {
  const { reference } = useSearch({ from: '/_app/wallet/verify' })
  const navigate = useNavigate()
  const status = usePaymentStatus(reference)

  const settled = status.data?.attempt_status === 'settled'
  const failed = status.data?.attempt_status === 'failed' || (!reference && !status.isLoading)

  useEffect(() => {
    if (!settled) return
    const timer = setTimeout(() => void navigate({ to: '/wallet' }), 1500)
    return () => clearTimeout(timer)
  }, [settled, navigate])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {failed ? (
        <>
          <AlertIcon size={32} className="text-clay" />
          <h1 className="mt-4 text-xl text-ink">That payment did not go through</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-ink-muted">
            {reference
              ? "Paystack reported this payment as unsuccessful. You have not been charged for it — try again from your wallet."
              : 'No payment reference was given, so there is nothing to confirm here.'}
          </p>
          <Button className="mt-6" variant="primary" onClick={() => void navigate({ to: '/wallet' })}>
            Back to wallet
          </Button>
        </>
      ) : settled ? (
        <>
          <TickIcon size={32} className="text-accent" />
          <h1 className="mt-4 text-xl text-ink">Payment confirmed</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-ink-muted">
            Your wallet balance has been updated. Taking you back now.
          </p>
        </>
      ) : (
        <>
          <Spinner size={32} label="Confirming your payment" />
          <h1 className="mt-4 text-xl text-ink">Confirming your payment</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-ink-muted">
            Paystack has told us the payment page closed — we are just waiting for their final
            confirmation. This is usually a few seconds; it is safe to leave this page open.
          </p>
        </>
      )}
    </div>
  )
}
