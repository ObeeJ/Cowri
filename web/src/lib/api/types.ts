/**
 * TypeScript mirrors of the Rust DTOs in shared/src/lib.rs and the ad-hoc JSON
 * bodies returned by backend/src/routes. Enums are serialised by serde as
 * snake_case strings. Every amount is an integer count of kobo.
 */

export type Uuid = string
/** RFC 3339, as produced by chrono's DateTime<Utc> serializer. */
export type IsoDateTime = string

export type UserRole = 'user' | 'admin'

export type User = {
  id: Uuid
  name: string
  phone: string
  email: string | null
  role: UserRole
  email_verified: boolean
  created_at: IsoDateTime
}

export type Wallet = {
  id: Uuid
  user_id: Uuid
  /** Settled balance. This is the only spendable figure. */
  available_kobo: number
  /** Ledger balance, including holds that have not settled. */
  ledger_kobo: number
  /** Optimistic lock version, incremented on every mutation. */
  version: number
}

export type TransactionKind = 'credit' | 'debit'
export type TransactionStatus = 'pending' | 'success' | 'failed'

export type Transaction = {
  id: Uuid
  wallet_id: Uuid
  kind: TransactionKind
  amount_kobo: number
  reference: string
  description: string
  status: TransactionStatus
  created_at: IsoDateTime
}

export type AjoFrequency = 'daily' | 'weekly' | 'monthly'
export type AjoStatus = 'active' | 'completed' | 'paused'

export type AjoGroup = {
  id: Uuid
  name: string
  admin_id: Uuid
  contribution_kobo: number
  frequency: AjoFrequency
  /** Target size of the circle, set at creation. Not the current headcount. */
  member_count: number
  current_cycle: number
  status: AjoStatus
  created_at: IsoDateTime
}

export type AjoMember = {
  id: Uuid
  group_id: Uuid
  user_id: Uuid
  payout_position: number
  has_received: boolean
}

/** GET /ajo/:id projects members down to these three fields. */
export type AjoMemberSummary = {
  user_id: Uuid
  payout_position: number
  has_received: boolean
}

export type AjoDetail = {
  group: AjoGroup
  members: AjoMemberSummary[]
  contributions_this_cycle: number
  members_total: number
}

export type AjoInvite = {
  invite_url: string
  group_id: Uuid
}

export type BillStatus = 'pending' | 'partially_paid' | 'settled'

export type Bill = {
  id: Uuid
  title: string
  creator_id: Uuid
  total_kobo: number
  status: BillStatus
  created_at: IsoDateTime
}

export type BillParticipantSummary = {
  user_id: Uuid
  share_kobo: number
  paid: boolean
}

export type BillDetail = {
  bill: Bill
  participants: BillParticipantSummary[]
  /** Null when the caller has no share on the bill. */
  my_share: { share_kobo: number; paid: boolean } | null
}

// ── Requests ────────────────────────────────────────────────────────────────

export type RegisterRequest = {
  name: string
  phone: string
  email: string
  password: string
  transaction_pin: string
}

export type VerifyEmailRequest = { email: string; otp: string }
export type ResendOtpRequest = { email: string }
export type ForgotPasswordRequest = { email: string }
export type ResetPasswordRequest = { email: string; otp: string; new_password: string }
export type LoginRequest = { phone: string; password: string }
export type FundWalletRequest = { amount_kobo: number; email: string }
/** Body for any money-out action — ajo contribution, bill payment — re-checks
 * the transaction PIN server-side even though the caller already has a
 * session, so a stolen cookie alone can't move money. */
export type TransactionPinRequest = { transaction_pin: string }

export type CreateAjoRequest = {
  name: string
  contribution_kobo: number
  frequency: AjoFrequency
  member_count: number
}

export type CreateBillRequest = {
  title: string
  total_kobo: number
  participant_phones: string[]
}

// ── Responses ───────────────────────────────────────────────────────────────

/** POST /auth/login. The tokens themselves arrive as httpOnly cookies. */
export type LoginResponse = { user: User; wallet: Wallet }

export type RegisterResponse = { message: string; user_id: Uuid }
export type MessageResponse = { message: string }
export type StatusResponse = { status: string }

export type PaystackInitResponse = {
  authorization_url: string
  reference: string
}

export type HealthResponse = {
  status: 'ok' | 'degraded'
  db: string
  version: string
}

export type LedgerCheckResponse = {
  status: 'ok' | 'violations_found'
  checked: number
  violations: Array<{ wallet_id: Uuid; user_id: Uuid; error: string }>
}

// ── Admin ───────────────────────────────────────────────────────────────────

export type AdminDashboard = {
  users: number
  wallets: number
  total_balance_kobo: number
  transactions: number
  volume_kobo: number
  ajo_groups: number
  active_groups: number
  bills: number
  contributions: number
  fee_revenue_kobo: number
}

export type AdminUserRow = {
  id: Uuid
  name: string
  phone: string
  role: UserRole
  balance_kobo: number
  created_at: IsoDateTime
}

export type AdminUserList = { users: AdminUserRow[]; total: number }

export type AdminUserDetail = {
  user: User
  wallet: Wallet | null
  transactions: Transaction[]
}

export type AdminTransactionList = {
  transactions: Transaction[]
  total: number
  page: number
  per_page: number
}

export type AdminAjoRow = {
  group: AjoGroup
  member_count: number
  total_contributions: number
  fee_collected_kobo: number
}

export type AdminAjoList = { groups: AdminAjoRow[]; total: number }

export type AdminOutboxStatus = {
  pending: number
  delivered: number
  failed: number
  total: number
}

/** The error envelope every failing route returns: `{ "error": "..." }`. */
export type ApiErrorBody = { error: string }
