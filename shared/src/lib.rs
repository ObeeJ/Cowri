use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── User ──────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum UserRole { User, Admin }

/// KYC state machine. `Unverified` (never attempted) and `Failed` (attempted,
/// rejected) are distinct so the UI can tell "hasn't tried" from "tried and
/// was turned down" — a resubmission path only makes sense for the latter.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum KycStatus { Unverified, Pending, Verified, Failed }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id:             Uuid,
    pub name:           String,
    pub phone:          String,
    pub email:          Option<String>,
    pub role:           UserRole,
    pub email_verified: bool,
    pub kyc_status:     KycStatus,
    pub avatar_url:     Option<String>,
    pub created_at:     DateTime<Utc>,
}

// ── Wallet ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Wallet {
    pub id:                  Uuid,
    pub user_id:             Uuid,
    /// Settled balance — what the user can spend right now
    pub available_kobo:      i64,
    /// Ledger balance — includes pending holds not yet settled
    pub ledger_kobo:         i64,
    /// Optimistic lock version — incremented on every mutation
    pub version:             u64,
}

impl Wallet {
    /// The only correct way to read spendable balance
    pub fn spendable(&self) -> i64 { self.available_kobo }
}

// ── Double-Entry Ledger ───────────────────────────────────────────────────────
/// Immutable append-only. Never UPDATE or DELETE a row.
/// Every financial event produces exactly two entries: one Debit, one Credit.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerEntry {
    pub id:                  Uuid,
    pub wallet_id:           Uuid,
    pub counterpart_wallet_id: Option<Uuid>, // None = external (Paystack / system)
    pub kind:                EntryKind,
    pub amount_kobo:         i64,            // always positive
    pub running_balance_kobo: i64,           // snapshot after this entry
    pub reference:           String,         // idempotency anchor
    pub description:         String,
    pub status:              EntryStatus,
    pub created_at:          DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum EntryKind { Debit, Credit }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum EntryStatus { Pending, Settled, Failed }

// Keep Transaction as a public-facing summary (maps to LedgerEntry pairs)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id:           Uuid,
    pub wallet_id:    Uuid,
    pub kind:         TransactionKind,
    pub amount_kobo:  i64,
    pub reference:    String,
    pub description:  String,
    pub status:       TransactionStatus,
    pub created_at:   DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TransactionKind { Credit, Debit }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TransactionStatus { Pending, Success, Failed }

// ── Outbox ────────────────────────────────────────────────────────────────────
/// Persisted atomically with the wallet mutation.
/// Background worker picks up and delivers — never in-flight inside a transaction.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutboxEvent {
    pub id:          Uuid,
    pub event_type:  String,   // e.g. "wallet.credited", "ajo.payout"
    pub payload:     String,   // JSON
    pub status:      OutboxStatus,
    pub attempts:    u32,
    pub created_at:  DateTime<Utc>,
    pub next_retry:  DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum OutboxStatus { Pending, Delivered, Failed }

/// A user-facing notification, derived from an outbox event addressed to them.
/// Not its own table — the outbox is already the durable, ordered record of
/// what happened; this is just that record read back and worded for a person.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationView {
    pub id:         Uuid,
    pub kind:       String,
    pub title:      String,
    pub body:       String,
    pub created_at: DateTime<Utc>,
}

// ── Ajo ───────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AjoGroup {
    pub id:                Uuid,
    pub name:              String,
    pub admin_id:          Uuid,
    pub contribution_kobo: i64,
    pub frequency:         AjoFrequency,
    pub member_count:      u32,
    pub current_cycle:     u32,
    pub status:            AjoStatus,
    pub created_at:        DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AjoFrequency { Daily, Weekly, Monthly }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AjoStatus { Active, Completed, Paused, Cancelled }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AjoMember {
    pub id:              Uuid,
    pub group_id:        Uuid,
    pub user_id:         Uuid,
    pub payout_position: u32,
    pub has_received:    bool,
}

// ── Bills ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bill {
    pub id:            Uuid,
    pub title:         String,
    pub creator_id:    Uuid,
    pub total_kobo:    i64,
    pub status:        BillStatus,
    /// When the money is needed (event / due moment).
    pub deadline_at:   DateTime<Utc>,
    /// Hard gate: every share must be fully paid by this instant (`deadline_at - 24h`).
    pub complete_by_at: DateTime<Utc>,
    pub timezone:      String,
    pub created_at:    DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum BillStatus { Pending, PartiallyPaid, Settled }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BillParticipant {
    pub id:               Uuid,
    pub bill_id:          Uuid,
    pub user_id:          Uuid,
    pub share_kobo:       i64,
    /// Cumulative PSP-settled amount toward this share.
    #[serde(default)]
    pub amount_paid_kobo: i64,
    /// Derived convenience: `amount_paid_kobo >= share_kobo`.
    pub paid:             bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PaymentMode { Manual, Auto }

// ── API DTOs ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub name:            String,
    pub phone:           String,
    pub email:           String,
    pub password:        String,
    pub transaction_pin: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerifyEmailRequest {
    pub email: String,
    pub otp:   String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResendOtpRequest {
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResetPasswordRequest {
    pub email:        String,
    pub otp:          String,
    pub new_password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub phone:    String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionPinRequest {
    pub transaction_pin: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerifyBvnRequest {
    pub bvn: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PresignUploadRequest {
    pub content_type: String,
    pub size_bytes:   i64,
    /// Namespaces the object key and lets the same upload flow serve more
    /// than one use case — "avatars" today, others later — without a
    /// separate endpoint per kind of media.
    pub purpose:      String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PresignUploadResponse {
    /// The client PUTs the file's bytes directly here — this API never
    /// sees the file itself.
    pub upload_url: String,
    pub object_key: String,
    pub public_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfirmUploadRequest {
    pub object_key:   String,
    pub content_type: String,
    pub size_bytes:   i64,
    pub purpose:      String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaItem {
    pub id:           Uuid,
    pub object_key:   String,
    pub purpose:      String,
    pub content_type: String,
    pub size_bytes:   i64,
    pub public_url:   String,
    pub created_at:   DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KycStatusResponse {
    pub kyc_status: KycStatus,
}

/// Admin-only view — the reference and failure reason are support/audit
/// detail, not something an ordinary user's own profile needs to carry.
#[derive(Debug, Serialize, Deserialize)]
pub struct KycDetail {
    pub kyc_status:         KycStatus,
    pub kyc_verified_at:    Option<DateTime<Utc>>,
    pub kyc_provider:       Option<String>,
    pub kyc_reference:      Option<String>,
    pub kyc_failure_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub token:  String,
    pub user:   User,
    pub wallet: Wallet,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FundWalletRequest {
    pub amount_kobo: i64,
    pub email:       String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaystackInitResponse {
    pub authorization_url: String,
    pub reference:         String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAjoRequest {
    pub name:              String,
    pub contribution_kobo: i64,
    pub frequency:         AjoFrequency,
    pub member_count:      u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBillRequest {
    pub title:              String,
    pub total_kobo:         i64,
    pub participant_phones: Vec<String>,
    /// Event / need-by time. Complete-by is enforced as 24h earlier.
    pub deadline_at:        DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PayBillRequest {
    pub transaction_pin: String,
    /// Optional partial amount in kobo. Defaults to remaining share.
    #[serde(default)]
    pub amount_kobo:     Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallmentPlanItem {
    pub amount_kobo: i64,
    pub due_at:      DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SetInstallmentPlanRequest {
    pub installments: Vec<InstallmentPlanItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GiftBillRequest {
    pub for_user_id:     Uuid,
    pub transaction_pin: String,
    #[serde(default)]
    pub amount_kobo:     Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct P2pPaymentRequest {
    pub to_phone:        String,
    pub amount_kobo:     i64,
    pub transaction_pin: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SetPaymentModeRequest {
    pub mode: PaymentMode,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiError {
    pub error: String,
}
