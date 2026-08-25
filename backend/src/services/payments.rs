//! Paystack checkout + webhook settlement for obligations.
//! Cowri never moves custodian cash — the PSP does.

use chrono::Utc;
use shared::*;
use sqlx::PgPool;
use uuid::Uuid;

use crate::db;
use crate::services::auth::verify_transaction_pin;
use crate::store::Store;

#[derive(Debug, Clone)]
pub struct CheckoutSession {
    pub obligation_id:     Uuid,
    pub attempt_id:        Uuid,
    pub authorization_url: String,
    pub reference:         String,
    pub amount_kobo:       i64,
}

/// Initialise a hosted Paystack checkout for an existing obligation amount.
pub async fn init_checkout(
    pool: &PgPool,
    email: &str,
    phone: Option<&str>,
    obligation_id: Uuid,
    amount_kobo: i64,
    idempotency_key: &str,
    callback_path: &str,
) -> Result<CheckoutSession, ApiError> {
    if amount_kobo <= 0 {
        return Err(ApiError { error: "Amount must be a positive integer in kobo".into() });
    }

    let reference = format!("obl-{}-{}", obligation_id, Uuid::new_v4());

    let attempt_id = db::insert_payment_attempt(
        pool,
        obligation_id,
        amount_kobo,
        &reference,
        "checkout",
        idempotency_key,
        None,
    )
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(db_err) if db_err.constraint() == Some("payment_attempts_idempotency_key_key") => {
            ApiError { error: "Duplicate payment attempt".into() }
        }
        _ => ApiError { error: "Could not create payment attempt".into() },
    })?;

    // Test/mock mode: no network call; return a synthetic URL. Webhook/settle
    // tests and local smoke can settle by reference without Paystack.
    if std::env::var("COWRI_PAYMENTS_MODE").as_deref() == Ok("mock") {
        let url = format!("mock://paystack/checkout?reference={reference}");
        let _ = db::set_payment_attempt_url(pool, attempt_id, &url).await;
        return Ok(CheckoutSession {
            obligation_id,
            attempt_id,
            authorization_url: url,
            reference,
            amount_kobo,
        });
    }

    let secret_key = std::env::var("PAYSTACK_SECRET_KEY")
        .map_err(|_| ApiError { error: "Payment service unavailable".into() })?;
    let app_url = std::env::var("APP_URL").unwrap_or_else(|_| "https://cowri.app".into());

    let mut metadata = serde_json::json!({
        "obligation_id": obligation_id,
        "attempt_id": attempt_id,
    });
    if let Some(p) = phone {
        metadata["phone"] = serde_json::Value::String(p.to_string());
    }

    let client = reqwest::Client::new();
    let res = client
        .post("https://api.paystack.co/transaction/initialize")
        .bearer_auth(&secret_key)
        .json(&serde_json::json!({
            "email": email,
            "amount": amount_kobo,
            "reference": reference,
            "callback_url": format!("{app_url}{callback_path}"),
            "metadata": metadata,
        }))
        .send()
        .await
        .map_err(|_| ApiError { error: "Payment service unavailable".into() })?;

    let body: serde_json::Value = res.json().await
        .map_err(|_| ApiError { error: "Payment service unavailable".into() })?;

    if body["status"] != true {
        let _ = db::fail_payment_attempt(pool, attempt_id).await;
        return Err(ApiError {
            error: body["message"].as_str().unwrap_or("Payment init failed").to_string(),
        });
    }

    let url = body["data"]["authorization_url"].as_str().unwrap_or("").to_string();
    let _ = db::set_payment_attempt_url(pool, attempt_id, &url).await;

    Ok(CheckoutSession {
        obligation_id,
        attempt_id,
        authorization_url: url,
        reference,
        amount_kobo,
    })
}

/// Charge a saved Paystack authorization (auto-debit).
pub async fn charge_mandate(
    pool: &PgPool,
    mandate_id: Uuid,
    obligation_id: Uuid,
    amount_kobo: i64,
    idempotency_key: &str,
) -> Result<String, ApiError> {
    let mandate = db::get_active_mandate(pool, mandate_id)
        .await
        .map_err(|_| ApiError { error: "Mandate not found".into() })?
        .ok_or(ApiError { error: "Mandate not active".into() })?;

    let reference = format!("mdl-{}-{}", obligation_id, Uuid::new_v4());
    let attempt_id = db::insert_payment_attempt(
        pool,
        obligation_id,
        amount_kobo,
        &reference,
        "mandate",
        idempotency_key,
        None,
    )
    .await
    .map_err(|_| ApiError { error: "Could not create payment attempt".into() })?;

    if std::env::var("COWRI_PAYMENTS_MODE").as_deref() == Ok("mock") {
        // In mock mode, settle immediately so schedule tests can run offline.
        db::settle_payment_attempt(pool, &reference, amount_kobo)
            .await
            .map_err(|_| ApiError { error: "Mock settle failed".into() })?;
        return Ok(reference);
    }

    let secret_key = std::env::var("PAYSTACK_SECRET_KEY")
        .map_err(|_| ApiError { error: "Payment service unavailable".into() })?;

    let client = reqwest::Client::new();
    let res = client
        .post("https://api.paystack.co/transaction/charge_authorization")
        .bearer_auth(&secret_key)
        .json(&serde_json::json!({
            "authorization_code": mandate.authorization_code,
            "email": mandate.email,
            "amount": amount_kobo,
            "reference": reference,
            "metadata": {
                "obligation_id": obligation_id,
                "attempt_id": attempt_id,
                "mandate_id": mandate_id,
            }
        }))
        .send()
        .await
        .map_err(|_| ApiError { error: "Payment service unavailable".into() })?;

    let body: serde_json::Value = res.json().await
        .map_err(|_| ApiError { error: "Payment service unavailable".into() })?;

    if body["status"] != true {
        let _ = db::fail_payment_attempt(pool, attempt_id).await;
        return Err(ApiError {
            error: body["message"].as_str().unwrap_or("Mandate charge failed").to_string(),
        });
    }

    Ok(reference)
}

pub fn require_pin(store: &Store, user_id: Uuid, pin: &str) -> Result<(), ApiError> {
    verify_transaction_pin(store, user_id, pin)
}

/// Apply a successful charge to in-memory bill/ajo mirrors after DB settle.
pub fn sync_ajo_from_settle(
    store: &Store,
    group_id: Uuid,
    contributor_id: Uuid,
    cycle: u32,
    current_cycle: u32,
    status: &str,
) {
    store.ajo_contributions.lock().unwrap().insert((group_id, contributor_id, cycle));
    if let Some(g) = store.ajo_groups.lock().unwrap().get_mut(&group_id) {
        g.current_cycle = current_cycle;
        g.status = match status {
            "completed" => AjoStatus::Completed,
            "cancelled" => AjoStatus::Cancelled,
            "paused" => AjoStatus::Paused,
            _ => AjoStatus::Active,
        };
    }
    if let Some(m) = store.ajo_members.lock().unwrap().get_mut(&(group_id, contributor_id)) {
        if cycle as u32 == m.payout_position {
            // receiver flag is on the cycle recipient, not the contributor
        }
    }
    if let Some(m) = store
        .ajo_members
        .lock()
        .unwrap()
        .values_mut()
        .find(|m| m.group_id == group_id && m.payout_position == cycle)
    {
        m.has_received = true;
    }
}

pub fn sync_bill_share_from_db_row(
    store: &Store,
    bill_id: Uuid,
    user_id: Uuid,
    amount_paid_kobo: i64,
    share_kobo: i64,
    bill_status: &str,
) {
    let paid = amount_paid_kobo >= share_kobo;
    if let Some(p) = store.bill_participants.lock().unwrap().get_mut(&(bill_id, user_id)) {
        p.amount_paid_kobo = amount_paid_kobo;
        p.paid = paid;
    }
    if let Some(b) = store.bills.lock().unwrap().get_mut(&bill_id) {
        b.status = match bill_status {
            "settled" => BillStatus::Settled,
            "partially_paid" => BillStatus::PartiallyPaid,
            _ => BillStatus::Pending,
        };
    }
}

pub fn now() -> chrono::DateTime<Utc> {
    Utc::now()
}
