/**
 * TanStack Query bindings.
 *
 * Invalidation rule for this app: anything that moves money invalidates the
 * wallet and the transaction list, plus whichever domain object it touched.
 * Balances are never patched optimistically. The server owns the ledger and a
 * stale-but-honest figure is better than a fast wrong one.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { ApiError, api, newIdempotencyKey } from './client'
import { queryKeys } from './keys'
import type {
  CreateAjoRequest,
  CreateBillRequest,
  FundWalletRequest,
  UserRole,
  Uuid,
} from './types'

/** Reads that only make sense for a signed-in user share these defaults. */
const privateRead = {
  retry: (failureCount: number, error: unknown) => {
    if (error instanceof ApiError && (error.isUnauthorized || error.isForbidden)) return false
    return failureCount < 2
  },
  staleTime: 15_000,
} satisfies Partial<UseQueryOptions>

// ── Wallet ──────────────────────────────────────────────────────────────────

export function useWallet(enabled = true) {
  return useQuery({
    queryKey: queryKeys.wallet,
    queryFn: ({ signal }) => api.wallet.get(signal),
    enabled,
    ...privateRead,
  })
}

export function useTransactions(page = 0, perPage = 20, enabled = true) {
  return useQuery({
    queryKey: queryKeys.transactions(page, perPage),
    queryFn: ({ signal }) => api.wallet.transactions(page, perPage, signal),
    enabled,
    ...privateRead,
  })
}

/**
 * Opens a Paystack checkout. The idempotency key is generated once per attempt
 * and reused if the request is retried, so a flaky connection cannot produce two
 * checkout sessions for one intent.
 */
export function useFundWallet() {
  return useMutation({
    mutationFn: (body: FundWalletRequest) => api.wallet.fund(body, newIdempotencyKey()),
  })
}

// ── Ajo ─────────────────────────────────────────────────────────────────────

export function useAjoGroups(enabled = true) {
  return useQuery({
    queryKey: queryKeys.ajoList,
    queryFn: ({ signal }) => api.ajo.list(signal),
    enabled,
    ...privateRead,
  })
}

export function useAjoGroup(id: Uuid, enabled = true) {
  return useQuery({
    queryKey: queryKeys.ajoDetail(id),
    queryFn: ({ signal }) => api.ajo.get(id, signal),
    enabled: enabled && Boolean(id),
    ...privateRead,
  })
}

/** Group admins only. A 403 here is expected for ordinary members. */
export function useAjoInvite(id: Uuid, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.ajoInvite(id),
    queryFn: ({ signal }) => api.ajo.invite(id, signal),
    enabled: enabled && Boolean(id),
    retry: false,
    staleTime: 5 * 60_000,
  })
}

export function useCreateAjo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateAjoRequest) => api.ajo.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ajoList })
    },
  })
}

export function useJoinAjo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Uuid) => api.ajo.join(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ajoList })
      void queryClient.invalidateQueries({ queryKey: queryKeys.ajoDetail(id) })
    },
  })
}

/** Debits the wallet and credits this cycle's recipient in one server call. */
export function useContributeAjo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Uuid) => api.ajo.contribute(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallet })
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactionsAll })
      void queryClient.invalidateQueries({ queryKey: queryKeys.ajoDetail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.ajoList })
    },
  })
}

// ── Bills ───────────────────────────────────────────────────────────────────

export function useBills(page = 0, perPage = 20, enabled = true) {
  return useQuery({
    queryKey: queryKeys.billList(page, perPage),
    queryFn: ({ signal }) => api.bills.list(page, perPage, signal),
    enabled,
    ...privateRead,
  })
}

export function useBill(id: Uuid, enabled = true) {
  return useQuery({
    queryKey: queryKeys.billDetail(id),
    queryFn: ({ signal }) => api.bills.get(id, signal),
    enabled: enabled && Boolean(id),
    ...privateRead,
  })
}

export function useCreateBill() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateBillRequest) => api.bills.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.billListAll })
    },
  })
}

export function usePayBillShare() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Uuid) => api.bills.pay(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallet })
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactionsAll })
      void queryClient.invalidateQueries({ queryKey: queryKeys.billDetail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.billListAll })
    },
  })
}

// ── Auth flows ──────────────────────────────────────────────────────────────

export function useRegister() {
  return useMutation({ mutationFn: api.auth.register })
}

export function useVerifyEmail() {
  return useMutation({ mutationFn: api.auth.verifyEmail })
}

export function useResendOtp() {
  return useMutation({ mutationFn: api.auth.resendOtp })
}

export function useForgotPin() {
  return useMutation({ mutationFn: api.auth.forgotPin })
}

export function useResetPin() {
  return useMutation({ mutationFn: api.auth.resetPin })
}

// ── Admin ───────────────────────────────────────────────────────────────────

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.adminDashboard,
    queryFn: ({ signal }) => api.admin.dashboard(signal),
    ...privateRead,
  })
}

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: ({ signal }) => api.admin.users(signal),
    ...privateRead,
  })
}

export function useAdminTransactions(page = 0, perPage = 50) {
  return useQuery({
    queryKey: queryKeys.adminTransactions(page, perPage),
    queryFn: ({ signal }) => api.admin.transactions(page, perPage, signal),
    ...privateRead,
  })
}

export function useAdminAjo() {
  return useQuery({
    queryKey: queryKeys.adminAjo,
    queryFn: ({ signal }) => api.admin.ajo(signal),
    ...privateRead,
  })
}

export function useAdminOutbox() {
  return useQuery({
    queryKey: queryKeys.adminOutbox,
    queryFn: ({ signal }) => api.admin.outbox(signal),
    refetchInterval: 30_000,
    ...privateRead,
  })
}

export function useSetUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: Uuid; role: UserRole }) => api.admin.setRole(id, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers })
    },
  })
}

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => api.system.health(signal),
    retry: false,
    refetchInterval: 60_000,
  })
}

/** Recomputes every wallet from its ledger. Run on demand, not on a timer. */
export function useLedgerCheck(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.ledgerCheck,
    queryFn: ({ signal }) => api.system.ledgerCheck(signal),
    enabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  })
}
