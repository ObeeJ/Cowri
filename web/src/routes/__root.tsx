import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { ShellIcon } from '~/components/icons'
import { Button } from '~/components/ui/button'
import { ErrorState } from '~/components/ui/states'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
})

function RootLayout() {
  return <Outlet />
}

function Centred({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-start justify-center bg-paper px-6 py-16">
      <div className="mx-auto w-full max-w-lg">
        <Link to="/" className="mb-8 inline-flex items-center gap-2.5 text-ink">
          <ShellIcon size={26} className="text-accent" />
          <span className="font-display text-xl">Cowri</span>
        </Link>
        {children}
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <Centred>
      <p className="label-caps">Error 404</p>
      <h1 className="mt-2 text-[2rem] leading-10 text-ink">This page is not here</h1>
      <p className="mt-3 max-w-prose text-sm leading-6 text-ink-muted">
        The link may be out of date, or the page may have moved. Your wallet, circles and bills are
        all still where you left them.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/dashboard">
          <Button variant="primary">Go to your dashboard</Button>
        </Link>
        <Link to="/">
          <Button>Back to the home page</Button>
        </Link>
      </div>
    </Centred>
  )
}

/**
 * The last line of defence. A render error anywhere in the tree lands here
 * rather than blanking the page.
 */
function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Centred>
      <ErrorState error={error} onRetry={reset} title="Something broke on this page" />
      <div className="mt-4">
        <Link to="/dashboard">
          <Button>Go to your dashboard</Button>
        </Link>
      </div>
    </Centred>
  )
}
