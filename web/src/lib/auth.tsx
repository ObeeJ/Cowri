/**
 * Session state.
 *
 * The access and refresh tokens live in httpOnly cookies that this code cannot
 * read, so "am I signed in?" is answered by asking the API, not by inspecting a
 * token. On boot we replay the cached profile for an instant first paint, then
 * confirm it against GET /wallet. If that call fails with 401 the cached profile
 * is discarded.
 *
 * The cached profile is display data only. `isAdmin` decides whether to render
 * an admin link, never whether admin data may be read: every /admin route is
 * gated server side by require_admin and returns 403 regardless of what this
 * cache says.
 */

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
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, api, onSessionExpired } from './api/client'
import { queryKeys } from './api/keys'
import type { LoginRequest, User, Wallet } from './api/types'

const PROFILE_STORAGE_KEY = 'cowri.profile.v1'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export type AuthContextValue = {
  status: AuthStatus
  user: User | null
  isAdmin: boolean
  signIn: (credentials: LoginRequest) => Promise<{ user: User; wallet: Wallet }>
  signOut: () => Promise<void>
  /** Replaces the cached profile, e.g. after a password reset changes nothing else. */
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readCachedProfile(): User | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as User
    return typeof parsed?.id === 'string' ? parsed : null
  } catch {
    return null
  }
}

function writeCachedProfile(user: User | null): void {
  try {
    if (user) window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(user))
    else window.localStorage.removeItem(PROFILE_STORAGE_KEY)
  } catch {
    // Private browsing modes can refuse storage. The session still works for
    // this tab; it just will not survive a reload.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUserState] = useState<User | null>(() => readCachedProfile())
  const [status, setStatus] = useState<AuthStatus>(() =>
    readCachedProfile() ? 'loading' : 'anonymous',
  )
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const clearSession = useCallback(() => {
    writeCachedProfile(null)
    setUserState(null)
    setStatus('anonymous')
    queryClient.clear()
  }, [queryClient])

  // Confirm the cookie session is still good before trusting the cached profile.
  useEffect(() => {
    if (status !== 'loading') return
    let cancelled = false

    api.wallet
      .get()
      .then((wallet) => {
        if (cancelled || !mounted.current) return
        queryClient.setQueryData(queryKeys.wallet, wallet)
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (cancelled || !mounted.current) return
        if (error instanceof ApiError && (error.isUnauthorized || error.isForbidden)) {
          clearSession()
          return
        }
        // A network blip or a degraded API is not proof the session ended.
        // Keep the cached profile and let the individual screens show the error.
        setStatus('authenticated')
      })

    return () => {
      cancelled = true
    }
  }, [status, queryClient, clearSession])

  // The client fires this once a refresh attempt has definitively failed.
  useEffect(() => onSessionExpired(clearSession), [clearSession])

  const signIn = useCallback(
    async (credentials: LoginRequest) => {
      const result = await api.auth.login(credentials)
      writeCachedProfile(result.user)
      setUserState(result.user)
      setStatus('authenticated')
      queryClient.setQueryData(queryKeys.wallet, result.wallet)
      return result
    },
    [queryClient],
  )

  const signOut = useCallback(async () => {
    try {
      await api.auth.logout()
    } finally {
      clearSession()
    }
  }, [clearSession])

  const setUser = useCallback((next: User) => {
    writeCachedProfile(next)
    setUserState(next)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAdmin: user?.role === 'admin',
      signIn,
      signOut,
      setUser,
    }),
    [status, user, signIn, signOut, setUser],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
