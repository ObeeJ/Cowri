/**
 * The single place this app talks to the Cowri API.
 *
 * Session handling: the API issues `access_token` and `refresh_token` as
 * httpOnly, Secure, SameSite=Strict cookies (backend/src/routes/mod.rs). The
 * browser will not let JavaScript read them, which is the point. Every request
 * therefore goes out with `credentials: 'include'` and no Authorization header.
 *
 * Because the API only emits `Access-Control-Allow-Credentials` when the request
 * Origin matches its own CORS_ORIGIN, this app's origin must be configured there
 * or the cookies will be dropped silently by the browser.
 */

import type {
  AdminAjoList,
  AdminDashboard,
  AdminOutboxStatus,
  AdminTransactionList,
  AdminUserDetail,
  AdminUserList,
  AjoDetail,
  AjoGroup,
  AjoInvite,
  AjoMember,
  ApiErrorBody,
  Bill,
  BillDetail,
  ConfirmUploadRequest,
  CreateAjoRequest,
  CreateBillRequest,
  ForgotPasswordRequest,
  FundWalletRequest,
  HealthResponse,
  LedgerCheckResponse,
  LoginRequest,
  LoginResponse,
  KycStatusResponse,
  MediaItem,
  MessageResponse,
  NotificationView,
  PaystackInitResponse,
  PresignUploadRequest,
  PresignUploadResponse,
  RegisterRequest,
  RegisterResponse,
  ResendOtpRequest,
  ResetPasswordRequest,
  StatusResponse,
  Transaction,
  TransactionPinRequest,
  UserRole,
  Uuid,
  VerifyBvnRequest,
  VerifyEmailRequest,
  Wallet,
} from './types'

// Same-origin by default: in production the backend serves this app itself
// (see backend/src/main.rs's serve_spa), and in dev the Vite proxy forwards
// /v1 to a locally running API. Override only for a separately hosted client.
const RAW_BASE = import.meta.env.VITE_COWRI_API_URL ?? '/v1'
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, '')

/** A response the API rejected, carrying its status and error envelope text. */
export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }

  /** The session is gone. Callers should send the user back to sign in. */
  get isUnauthorized(): boolean {
    return this.status === 401
  }

  /** Authenticated, but not allowed. Admin gates return this. */
  get isForbidden(): boolean {
    return this.status === 403
  }

  /** The API's dedicated code for "not enough money in the wallet". */
  get isInsufficientFunds(): boolean {
    return this.status === 402
  }

  /** Already joined, already contributed, already paid. */
  get isConflict(): boolean {
    return this.status === 409
  }
}

/** The request never reached the API: offline, DNS, CORS, or a dropped socket. */
export class NetworkError extends Error {
  readonly cause: unknown

  constructor(cause: unknown) {
    super(
      typeof navigator !== 'undefined' && navigator.onLine === false
        ? 'You appear to be offline. Check your connection and try again.'
        : 'Could not reach Cowri. Check your connection and try again.',
    )
    this.name = 'NetworkError'
    this.cause = cause
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined>
  /** Sent as x-idempotency-key. Only /wallet/fund honours it server side. */
  idempotencyKey?: string
  /** Skip the 401 refresh-and-retry. Used by the auth endpoints themselves. */
  noRefresh?: boolean
  signal?: AbortSignal
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(API_BASE_URL + path, window.location.origin)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

/**
 * Only one refresh is ever in flight. The API rotates the refresh token on use,
 * so two concurrent refreshes would race and one would present a token that has
 * already been consumed.
 */
let refreshInFlight: Promise<boolean> | null = null

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

/** Callbacks fired once when the session is definitively gone. */
const sessionExpiredHandlers = new Set<() => void>()

export function onSessionExpired(handler: () => void): () => void {
  sessionExpiredHandlers.add(handler)
  return () => sessionExpiredHandlers.delete(handler)
}

function announceSessionExpired(): void {
  for (const handler of sessionExpiredHandlers) handler()
}

async function readError(response: Response): Promise<ApiError> {
  let body: unknown
  let message = `Request failed with status ${response.status}`
  try {
    body = await response.json()
    const envelope = body as Partial<ApiErrorBody>
    if (envelope && typeof envelope.error === 'string' && envelope.error.length > 0) {
      message = envelope.error
    }
  } catch {
    // A non-JSON error body (a proxy or gateway page). Keep the status message.
  }
  return new ApiError(response.status, message, body)
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  if (options.idempotencyKey) headers['x-idempotency-key'] = options.idempotencyKey

  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new NetworkError(cause)
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options)

  if (response.status === 401 && !options.noRefresh) {
    const refreshed = await refreshSession()
    if (refreshed) {
      response = await send(path, options)
    } else {
      announceSessionExpired()
      throw await readError(response)
    }
  }

  if (!response.ok) throw await readError(response)

  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (text === '') return undefined as T
  return JSON.parse(text) as T
}

/** A fresh idempotency key for a money-moving request. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * PUTs a file straight to the presigned R2 URL from `api.media.presign` —
 * deliberately a plain `fetch`, not `request()`: the URL is on R2's own
 * origin, not this API, so it takes no credentials and no auth headers,
 * and the content-type must match exactly what the presign call declared
 * or R2 rejects the signature.
 */
export async function uploadToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  let response: Response
  try {
    response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': file.type },
      body: file,
    })
  } catch (cause) {
    throw new NetworkError(cause)
  }
  if (!response.ok) {
    throw new ApiError(response.status, 'The upload was rejected by storage.')
  }
}

// ── Endpoints ───────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (body: RegisterRequest) =>
      request<RegisterResponse>('/auth/register', { method: 'POST', body, noRefresh: true }),

    verifyEmail: (body: VerifyEmailRequest) =>
      request<MessageResponse>('/auth/verify-email', { method: 'POST', body, noRefresh: true }),

    resendOtp: (body: ResendOtpRequest) =>
      request<MessageResponse>('/auth/resend-otp', { method: 'POST', body, noRefresh: true }),

    forgotPassword: (body: ForgotPasswordRequest) =>
      request<MessageResponse>('/auth/forgot-password', { method: 'POST', body, noRefresh: true }),

    resetPassword: (body: ResetPasswordRequest) =>
      request<MessageResponse>('/auth/reset-password', { method: 'POST', body, noRefresh: true }),

    login: (body: LoginRequest) =>
      request<LoginResponse>('/auth/login', { method: 'POST', body, noRefresh: true }),

    /** Rotates both cookies. Returns false rather than throwing when expired. */
    refresh: () => refreshSession(),

    logout: () =>
      request<StatusResponse>('/auth/logout', { method: 'POST', noRefresh: true }),
  },

  notifications: {
    /** Polled by useNotificationToasts to surface events as they arrive. */
    list: (signal?: AbortSignal) =>
      request<NotificationView[]>('/notifications', { signal }),
  },

  kyc: {
    /** The BVN is sent once, over this call, straight to the backend — never
     * to Prembly directly from the browser, and never stored by this app. */
    verifyBvn: (body: VerifyBvnRequest) =>
      request<KycStatusResponse>('/kyc/verify-bvn', { method: 'POST', body }),
  },

  media: {
    /** The file itself never comes through the API — presign returns a URL
     * the browser PUTs the bytes to directly (see uploadToPresignedUrl). */
    presign: (body: PresignUploadRequest) =>
      request<PresignUploadResponse>('/media/presign', { method: 'POST', body }),

    confirm: (body: ConfirmUploadRequest) =>
      request<MediaItem>('/media/confirm', { method: 'POST', body }),

    delete: (id: Uuid) => request<StatusResponse>(`/media/${id}`, { method: 'DELETE' }),
  },

  wallet: {
    get: (signal?: AbortSignal) => request<Wallet>('/wallet', { signal }),

    transactions: (page = 0, perPage = 20, signal?: AbortSignal) =>
      request<Transaction[]>('/wallet/transactions', {
        query: { page, per_page: perPage },
        signal,
      }),

    /**
     * Starts a Paystack checkout. The wallet is credited by the Paystack webhook
     * on the server, not by this call, so the balance only moves once the
     * webhook lands. Re-sending the same idempotency key replays the stored
     * response instead of opening a second checkout.
     */
    fund: (body: FundWalletRequest, idempotencyKey: string) =>
      request<PaystackInitResponse>('/wallet/fund', {
        method: 'POST',
        body,
        idempotencyKey,
      }),
  },

  ajo: {
    list: (signal?: AbortSignal) => request<AjoGroup[]>('/ajo', { signal }),

    create: (body: CreateAjoRequest) =>
      request<AjoGroup>('/ajo', { method: 'POST', body }),

    get: (id: Uuid, signal?: AbortSignal) => request<AjoDetail>(`/ajo/${id}`, { signal }),

    /** Group admin only. The API returns 403 for everyone else. */
    invite: (id: Uuid, signal?: AbortSignal) =>
      request<AjoInvite>(`/ajo/${id}/invite`, { signal }),

    join: (id: Uuid) => request<AjoMember>(`/ajo/${id}/join`, { method: 'POST' }),

    /** Re-checks the transaction PIN server-side before moving any money. */
    contribute: (id: Uuid, body: TransactionPinRequest, idempotencyKey?: string) =>
      request<import('./types').CheckoutRequiredResponse>(`/ajo/${id}/contribute`, {
        method: 'POST',
        body,
        idempotencyKey,
      }),

    /** Group admin only. Stops all future contributions and joins — does not
     * undo anything already paid out in past cycles. */
    close: (id: Uuid) => request<StatusResponse>(`/ajo/${id}/close`, { method: 'POST' }),

    /** Group admin only. The API rejects removing anyone whose payout is
     * already due or in progress. */
    removeMember: (groupId: Uuid, memberId: Uuid) =>
      request<StatusResponse>(`/ajo/${groupId}/members/${memberId}/remove`, { method: 'POST' }),

    setPaymentMode: (id: Uuid, mode: import('./types').PaymentMode) =>
      request<StatusResponse>(`/ajo/${id}/payment-mode`, {
        method: 'POST',
        body: { mode },
      }),
  },

  bills: {
    list: (page = 0, perPage = 20, signal?: AbortSignal) =>
      request<Bill[]>('/bills', { query: { page, per_page: perPage }, signal }),

    create: (body: CreateBillRequest) =>
      request<Bill>('/bills', { method: 'POST', body }),

    get: (id: Uuid, signal?: AbortSignal) => request<BillDetail>(`/bills/${id}`, { signal }),

    /** Opens PSP checkout; share settles only after webhook. */
    pay: (id: Uuid, body: import('./types').PayBillRequest, idempotencyKey?: string) =>
      request<import('./types').CheckoutRequiredResponse>(`/bills/${id}/pay`, {
        method: 'POST',
        body,
        idempotencyKey,
      }),

    gift: (id: Uuid, body: import('./types').GiftBillRequest, idempotencyKey?: string) =>
      request<import('./types').CheckoutRequiredResponse>(`/bills/${id}/gift`, {
        method: 'POST',
        body,
        idempotencyKey,
      }),

    setInstallmentPlan: (id: Uuid, body: import('./types').SetInstallmentPlanRequest) =>
      request<StatusResponse>(`/bills/${id}/installment-plan`, { method: 'POST', body }),
  },

  payments: {
    p2p: (body: import('./types').P2pPaymentRequest, idempotencyKey?: string) =>
      request<import('./types').CheckoutRequiredResponse>('/payments/p2p', {
        method: 'POST',
        body,
        idempotencyKey,
      }),

    saveMandate: (body: import('./types').SaveMandateRequest) =>
      request<import('./types').SaveMandateResponse>('/payments/mandates', {
        method: 'POST',
        body,
      }),
  },

  admin: {
    dashboard: (signal?: AbortSignal) =>
      request<AdminDashboard>('/admin/dashboard', { signal }),

    users: (signal?: AbortSignal) => request<AdminUserList>('/admin/users', { signal }),

    user: (id: Uuid, signal?: AbortSignal) =>
      request<AdminUserDetail>(`/admin/users/${id}`, { signal }),

    setRole: (id: Uuid, role: UserRole) =>
      request<StatusResponse>(`/admin/users/${id}/role`, { method: 'POST', body: { role } }),

    transactions: (page = 0, perPage = 50, signal?: AbortSignal) =>
      request<AdminTransactionList>('/admin/transactions', {
        query: { page, per_page: perPage },
        signal,
      }),

    ajo: (signal?: AbortSignal) => request<AdminAjoList>('/admin/ajo', { signal }),

    outbox: (signal?: AbortSignal) =>
      request<AdminOutboxStatus>('/admin/outbox', { signal }),
  },

  system: {
    health: (signal?: AbortSignal) => request<HealthResponse>('/health', { signal }),

    /** Recomputes every wallet balance from its ledger entries. */
    ledgerCheck: (signal?: AbortSignal) =>
      request<LedgerCheckResponse>('/ledger/check', { signal }),
  },
}

/** Turns anything thrown by the client into a sentence fit for a user. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof NetworkError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong. Please try again.'
}
