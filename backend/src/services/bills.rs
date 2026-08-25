use chrono::{Duration, Utc};
use shared::*;
use sqlx::PgPool;
use uuid::Uuid;

use crate::db;
use crate::services::payments::{self, CheckoutSession};
use crate::store::Store;

/// Validate a payer-chosen installment plan against share + complete_by.
pub fn validate_installment_plan(
    share_kobo: i64,
    complete_by_at: chrono::DateTime<Utc>,
    items: &[InstallmentPlanItem],
) -> Result<(), ApiError> {
    if items.is_empty() {
        return Err(ApiError { error: "Installment plan must have at least one payment".into() });
    }
    let mut sum = 0i64;
    let mut last_due = items[0].due_at;
    for (i, item) in items.iter().enumerate() {
        if item.amount_kobo <= 0 {
            return Err(ApiError {
                error: format!("Installment {} amount must be positive", i + 1),
            });
        }
        if item.due_at > complete_by_at {
            return Err(ApiError {
                error: format!(
                    "Installment {} is due after the complete-by deadline (24h before the bill deadline)",
                    i + 1
                ),
            });
        }
        if i > 0 && item.due_at < last_due {
            return Err(ApiError {
                error: "Installments must be in chronological order".into(),
            });
        }
        last_due = item.due_at;
        sum = sum.saturating_add(item.amount_kobo);
    }
    if sum != share_kobo {
        return Err(ApiError {
            error: format!(
                "Installments sum to ₦{:.2} but your share is ₦{:.2}",
                sum as f64 / 100.0,
                share_kobo as f64 / 100.0
            ),
        });
    }
    Ok(())
}

pub fn create_bill(store: &Store, creator_id: Uuid, req: CreateBillRequest) -> Result<Bill, ApiError> {
    if req.title.trim().is_empty() || req.title.len() > 200 {
        return Err(ApiError { error: "Title must be 1–200 characters".into() });
    }
    if req.total_kobo < 100 {
        return Err(ApiError { error: "Minimum bill amount is ₦1".into() });
    }
    if req.participant_phones.len() > 49 {
        return Err(ApiError { error: "Maximum 49 additional participants".into() });
    }

    let now = Utc::now();
    if req.deadline_at <= now + Duration::hours(24) {
        return Err(ApiError {
            error: "Deadline must be more than 24 hours from now so everyone can finish 24h early".into(),
        });
    }
    let complete_by_at = req.deadline_at - Duration::hours(24);

    let mut participant_ids: Vec<Uuid> = {
        let phones = store.phone_index.lock().unwrap();
        req.participant_phones.iter()
            .filter_map(|p| phones.get(p.trim()).copied())
            .filter(|&id| id != creator_id)
            .collect()
    };
    participant_ids.dedup();

    let total_participants = participant_ids.len() as i64 + 1;
    let share_kobo = req.total_kobo / total_participants;

    let bill = Bill {
        id: Uuid::new_v4(),
        title: req.title.trim().to_string(),
        creator_id,
        total_kobo: req.total_kobo,
        status: BillStatus::Pending,
        deadline_at: req.deadline_at,
        complete_by_at,
        timezone: "Africa/Lagos".into(),
        created_at: now,
    };

    store.bills.lock().unwrap().insert(bill.id, bill.clone());

    let mut participants = store.bill_participants.lock().unwrap();
    let mut index = store.bill_participant_index.lock().unwrap();

    let mut ordered = vec![creator_id];
    participants.insert((bill.id, creator_id), BillParticipant {
        id: Uuid::new_v4(),
        bill_id: bill.id,
        user_id: creator_id,
        share_kobo,
        amount_paid_kobo: 0,
        paid: false,
    });

    for user_id in participant_ids {
        participants.insert((bill.id, user_id), BillParticipant {
            id: Uuid::new_v4(),
            bill_id: bill.id,
            user_id,
            share_kobo,
            amount_paid_kobo: 0,
            paid: false,
        });
        ordered.push(user_id);
    }
    index.insert(bill.id, ordered);

    Ok(bill)
}

/// Start a PSP checkout for (part of) the caller's bill share.
/// Does **not** mark the share paid — webhook settlement does.
pub async fn initiate_bill_payment(
    store: &Store,
    pool: &PgPool,
    bill_id: Uuid,
    user_id: Uuid,
    req: &PayBillRequest,
    idempotency_key: &str,
) -> Result<CheckoutSession, ApiError> {
    payments::require_pin(store, user_id, &req.transaction_pin)?;

    let bill = store.bills.lock().unwrap().get(&bill_id).cloned()
        .ok_or(ApiError { error: "Bill not found".into() })?;

    let now = Utc::now();
    if now > bill.complete_by_at {
        return Err(ApiError {
            error: "Complete-by deadline has passed (payments must finish 24h before the bill deadline)".into(),
        });
    }

    let participant = store.bill_participants.lock().unwrap()
        .get(&(bill_id, user_id)).cloned()
        .ok_or(ApiError { error: "Not a participant".into() })?;

    if participant.paid {
        return Err(ApiError { error: "Already paid".into() });
    }

    let remaining = participant.share_kobo - participant.amount_paid_kobo;
    if remaining <= 0 {
        return Err(ApiError { error: "Already paid".into() });
    }

    let amount = req.amount_kobo.unwrap_or(remaining);
    if amount <= 0 || amount > remaining {
        return Err(ApiError {
            error: format!("Amount must be between ₦0.01 and remaining ₦{:.2}", remaining as f64 / 100.0),
        });
    }

    let (email, phone) = {
        let users = store.users.lock().unwrap();
        let u = users.get(&user_id).ok_or(ApiError { error: "User not found".into() })?;
        (
            u.email.clone().unwrap_or_default(),
            Some(u.phone.clone()),
        )
    };
    if email.is_empty() {
        return Err(ApiError { error: "Email required for payment checkout".into() });
    }

    let obligation_id = db::insert_obligation(
        pool,
        "bill",
        user_id,
        Some(bill.creator_id),
        amount,
        Some(bill_id),
        None,
        None,
        None,
        idempotency_key,
    )
    .await
    .map_err(|_| ApiError { error: "Could not create payment obligation".into() })?;

    let attempt_key = format!("{idempotency_key}:attempt");
    payments::init_checkout(
        pool,
        &email,
        phone.as_deref(),
        obligation_id,
        amount,
        &attempt_key,
        "/bills/verify",
    )
    .await
}

pub async fn set_installment_plan(
    store: &Store,
    pool: &PgPool,
    bill_id: Uuid,
    user_id: Uuid,
    items: Vec<InstallmentPlanItem>,
) -> Result<(), ApiError> {
    let bill = store.bills.lock().unwrap().get(&bill_id).cloned()
        .ok_or(ApiError { error: "Bill not found".into() })?;
    let participant = store.bill_participants.lock().unwrap()
        .get(&(bill_id, user_id)).cloned()
        .ok_or(ApiError { error: "Not a participant".into() })?;

    let remaining = participant.share_kobo - participant.amount_paid_kobo;
    validate_installment_plan(remaining, bill.complete_by_at, &items)?;

    let rows: Vec<(i64, chrono::DateTime<Utc>)> = items.iter()
        .map(|i| (i.amount_kobo, i.due_at))
        .collect();

    db::replace_bill_installments(pool, bill_id, user_id, &rows)
        .await
        .map_err(|_| ApiError { error: "Could not save installment plan".into() })?;
    Ok(())
}

pub async fn initiate_gift_payment(
    store: &Store,
    pool: &PgPool,
    bill_id: Uuid,
    payer_id: Uuid,
    req: &GiftBillRequest,
    idempotency_key: &str,
) -> Result<CheckoutSession, ApiError> {
    payments::require_pin(store, payer_id, &req.transaction_pin)?;

    let bill = store.bills.lock().unwrap().get(&bill_id).cloned()
        .ok_or(ApiError { error: "Bill not found".into() })?;

    // Gifter must be on the bill (social circle check).
    if !store.bill_participants.lock().unwrap().contains_key(&(bill_id, payer_id)) {
        return Err(ApiError { error: "Not a participant".into() });
    }

    let beneficiary = store.bill_participants.lock().unwrap()
        .get(&(bill_id, req.for_user_id)).cloned()
        .ok_or(ApiError { error: "Beneficiary is not on this bill".into() })?;

    if beneficiary.paid {
        return Err(ApiError { error: "That share is already paid".into() });
    }

    let remaining = beneficiary.share_kobo - beneficiary.amount_paid_kobo;
    let amount = req.amount_kobo.unwrap_or(remaining);
    if amount <= 0 || amount > remaining {
        return Err(ApiError { error: "Invalid gift amount".into() });
    }

    if Utc::now() > bill.complete_by_at {
        return Err(ApiError {
            error: "Complete-by deadline has passed".into(),
        });
    }

    let (email, phone) = {
        let users = store.users.lock().unwrap();
        let u = users.get(&payer_id).ok_or(ApiError { error: "User not found".into() })?;
        (u.email.clone().unwrap_or_default(), Some(u.phone.clone()))
    };
    if email.is_empty() {
        return Err(ApiError { error: "Email required for payment checkout".into() });
    }

    let obligation_id = db::insert_obligation(
        pool,
        "gift",
        payer_id,
        Some(bill.creator_id),
        amount,
        Some(bill_id),
        None,
        None,
        Some(req.for_user_id),
        idempotency_key,
    )
    .await
    .map_err(|_| ApiError { error: "Could not create gift obligation".into() })?;

    payments::init_checkout(
        pool,
        &email,
        phone.as_deref(),
        obligation_id,
        amount,
        &format!("{idempotency_key}:attempt"),
        "/bills/verify",
    )
    .await
}

pub fn list_bills(store: &Store, user_id: Uuid, page: usize, per_page: usize) -> Vec<Bill> {
    let participants = store.bill_participants.lock().unwrap();
    let bill_ids: Vec<Uuid> = participants.keys()
        .filter(|(_, u)| *u == user_id)
        .map(|(b, _)| *b)
        .collect();
    drop(participants);

    let bills = store.bills.lock().unwrap();
    let mut result: Vec<Bill> = bill_ids.iter()
        .filter_map(|id| bills.get(id).cloned())
        .collect();
    result.sort_by_key(|b| std::cmp::Reverse(b.created_at));
    result.into_iter().skip(page * per_page).take(per_page).collect()
}

pub fn get_bill(store: &Store, bill_id: Uuid, user_id: Uuid) -> Result<serde_json::Value, ApiError> {
    let bill = store.bills.lock().unwrap().get(&bill_id).cloned()
        .ok_or(ApiError { error: "Bill not found".into() })?;

    if !store.bill_participants.lock().unwrap().contains_key(&(bill_id, user_id)) {
        return Err(ApiError { error: "Not a participant".into() });
    }

    let participant_ids = store.bill_participant_index.lock().unwrap()
        .get(&bill_id).cloned().unwrap_or_default();

    let participants: Vec<_> = {
        let ps = store.bill_participants.lock().unwrap();
        participant_ids.iter().filter_map(|uid| {
            ps.get(&(bill_id, *uid)).map(|p| serde_json::json!({
                "user_id": uid,
                "share_kobo": p.share_kobo,
                "amount_paid_kobo": p.amount_paid_kobo,
                "paid": p.paid,
            }))
        }).collect()
    };

    let my_share = store.bill_participants.lock().unwrap()
        .get(&(bill_id, user_id))
        .map(|p| serde_json::json!({
            "share_kobo": p.share_kobo,
            "amount_paid_kobo": p.amount_paid_kobo,
            "paid": p.paid,
            "remaining_kobo": (p.share_kobo - p.amount_paid_kobo).max(0),
        }));

    Ok(serde_json::json!({
        "bill": bill,
        "participants": participants,
        "my_share": my_share,
    }))
}
