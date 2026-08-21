'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { ApiError } from '~/lib/api/client'
import { AuthProvider } from '~/lib/auth'
import { ThemeProvider } from '~/lib/theme'
import { ToastProvider } from '~/components/ui/toast'
import { routeTree } from '~/routeTree.gen'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Money changes on the server, not here. Refetch when the user comes back
      // to the tab rather than trusting a long-lived cache.
      refetchOnWindowFocus: true,
      staleTime: 15_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
    },
    mutations: {
      // A failed money movement is never retried automatically. The user
      // decides, so a double debit cannot come from a background retry.
      retry: false,
    },
  },
})

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
