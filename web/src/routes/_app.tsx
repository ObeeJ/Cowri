import { Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { AppShell } from '~/components/layout/app-shell'
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton'
import { useAuth } from '~/lib/auth'

/**
 * The signed-in layout.
 *
 * The gate is a render-time check rather than a router `beforeLoad` because the
 * session lives in httpOnly cookies: there is nothing to read synchronously, and
 * the only way to know whether the session is alive is to have asked the API.
 * While that first call is outstanding the shell renders its skeleton instead of
 * flashing the sign-in page at someone who is in fact signed in.
 *
 * This gate is convenience, not security. Every protected byte comes from the
 * API, which checks the cookie on every request.
 */
export const Route = createFileRoute('/_app')({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { status } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.href })

  useEffect(() => {
    if (status === 'anonymous') {
      void navigate({ to: '/login', search: { redirect: pathname }, replace: true })
    }
  }, [status, navigate, pathname])

  if (status !== 'authenticated') {
    return (
      <div className="min-h-dvh bg-paper px-4 py-8 sm:px-6">
        <SkeletonGroup label="Checking your session" className="mx-auto w-full max-w-3xl">
          <Skeleton width="12rem" height="1.75rem" />
          <Skeleton width="100%" height="9rem" shape="block" className="mt-6" />
          <Skeleton width="100%" height="14rem" shape="block" className="mt-4" />
        </SkeletonGroup>
      </div>
    )
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
