use sqlx::PgPool;
use uuid::Uuid;
use chrono::Utc;

pub async fn run_migrations(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    sqlx::migrate!("./migrations").run(pool).await?;
    Ok(())
}

// ── KYC ───────────────────────────────────────────────────────────────────────

/// Persists a BVN verification outcome. `bvn_hash` is only written on a
/// verified outcome — a failed attempt (wrong BVN, provider rejection)
/// leaves it NULL so the unique index only ever constrains BVNs that
/// actually cleared verification.
pub async fn persist_kyc_result(
    pool: &PgPool,
    user_id: Uuid,
    verified: bool,
    bvn_hash: Option<&str>,
    reference: Option<&str>,
    failure_reason: Option<&str>,
) -> Result<(), sqlx::Error> {
    let status = if verified { "verified" } else { "failed" };
    let verified_at = if verified { Some(Utc::now()) } else { None };
    let hash_to_store = if verified { bvn_hash } else { None };

    sqlx::query(
        "UPDATE users SET
            kyc_status = $1,
            kyc_verified_at = $2,
            kyc_provider = 'prembly',
            kyc_reference = $3,
            kyc_failure_reason = $4,
            bvn_hash = $5
         WHERE id = $6"
    )
    .bind(status)
    .bind(verified_at)
    .bind(reference)
    .bind(failure_reason)
    .bind(hash_to_store)
    .bind(user_id)
    .execute(pool)
    .await?;
    Ok(())
}

type KycRow = (String, Option<chrono::DateTime<Utc>>, Option<String>, Option<String>, Option<String>);

pub async fn kyc_detail(pool: &PgPool, user_id: Uuid) -> Result<Option<shared::KycDetail>, sqlx::Error> {
    let row: Option<KycRow> =
        sqlx::query_as(
            "SELECT kyc_status, kyc_verified_at, kyc_provider, kyc_reference, kyc_failure_reason
             FROM users WHERE id = $1"
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

    Ok(row.map(|(status, verified_at, provider, reference, reason)| shared::KycDetail {
        kyc_status: crate::store::parse_kyc_status(&status),
        kyc_verified_at: verified_at,
        kyc_provider: provider,
        kyc_reference: reference,
        kyc_failure_reason: reason,
    }))
}

// ── Media ─────────────────────────────────────────────────────────────────────

pub async fn persist_media(pool: &PgPool, media: &shared::MediaItem, user_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO media (id, user_id, object_key, purpose, content_type, size_bytes, public_url, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)"
    )
    .bind(media.id).bind(user_id).bind(&media.object_key).bind(&media.purpose)
    .bind(&media.content_type).bind(media.size_bytes).bind(&media.public_url).bind(media.created_at)
    .execute(pool).await?;
    Ok(())
}

pub async fn set_avatar(pool: &PgPool, user_id: Uuid, avatar_url: Option<&str>) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE users SET avatar_url = $1 WHERE id = $2")
        .bind(avatar_url).bind(user_id)
        .execute(pool).await?;
    Ok(())
}

/// Returns the object key only when `media_id` both exists and belongs to
/// `user_id` — the route handler never has to trust a caller-supplied
/// ownership claim.
pub async fn media_object_key_owned_by(pool: &PgPool, media_id: Uuid, user_id: Uuid) -> Option<String> {
    sqlx::query_scalar::<_, String>(
        "SELECT object_key FROM media WHERE id = $1 AND user_id = $2"
    )
    .bind(media_id).bind(user_id)
    .fetch_optional(pool).await.ok().flatten()
}

pub async fn delete_media_row(pool: &PgPool, media_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM media WHERE id = $1").bind(media_id).execute(pool).await?;
    Ok(())
}

// ── Wallet ────────────────────────────────────────────────────────────────────

// Not yet called. `services::wallet::debit_wallet` — the path ajo
// contributions and bill payments both go through — only mutates the
// in-memory `Store`; nothing currently writes those debits (or the matching
// credits) to `wallets`/`ledger_entries`/`transactions` in Postgres. Only
// Paystack-webhook credits go through `credit` below. Until this is wired
// into `persist_ajo_contribution` and `persist_bill_payment`, every ajo
// contribution and bill payment is durable only in memory and is lost on
// restart. Kept (not deleted) as the correct atomic building block for that
// fix: single transaction, WHERE-guarded UPDATE against overdraft, ledger
// and transaction rows, outbox event.
#[allow(dead_code)]
pub async fn debit(
    pool:        &PgPool,
    wallet_id:   Uuid,
    amount_kobo: i64,
    reference:   &str,
    description: &str,
) -> Result<i64, sqlx::Error> {
    let mut tx = pool.begin().await?;

    let row: Option<(i64,)> = sqlx::query_as(
        "UPDATE wallets
         SET available_kobo = available_kobo - $1,
             ledger_kobo    = ledger_kobo    - $1,
             version        = version + 1
         WHERE id = $2 AND available_kobo >= $1
         RETURNING available_kobo"
    )
    .bind(amount_kobo).bind(wallet_id)
    .fetch_optional(&mut *tx).await?;

    let (new_balance,) = row.ok_or(sqlx::Error::RowNotFound)?;

    sqlx::query(
        "INSERT INTO ledger_entries
             (wallet_id, kind, amount_kobo, running_balance_kobo, reference, description, status)
         VALUES ($1, 'debit', $2, $3, $4, $5, 'settled')
         ON CONFLICT (wallet_id, reference, kind) DO NOTHING"
    )
    .bind(wallet_id).bind(amount_kobo).bind(new_balance).bind(reference).bind(description)
    .execute(&mut *tx).await?;

    sqlx::query(
        "INSERT INTO transactions (wallet_id, kind, amount_kobo, reference, description, status)
         VALUES ($1, 'debit', $2, $3, $4, 'success')
         ON CONFLICT DO NOTHING"
    )
    .bind(wallet_id).bind(amount_kobo).bind(reference).bind(description)
    .execute(&mut *tx).await?;

    let payload = serde_json::json!({
        "wallet_id": wallet_id, "amount_kobo": amount_kobo,
        "reference": reference, "running_balance_kobo": new_balance
    });
    sqlx::query("INSERT INTO outbox (event_type, payload) VALUES ('wallet.debited', $1)")
        .bind(payload)
        .execute(&mut *tx).await?;

    tx.commit().await?;
    Ok(new_balance)
}

pub async fn credit(
    pool:        &PgPool,
    wallet_id:   Uuid,
    amount_kobo: i64,
    reference:   &str,
    description: &str,
) -> Result<i64, sqlx::Error> {
    let mut tx = pool.begin().await?;

    let (new_balance,): (i64,) = sqlx::query_as(
        "UPDATE wallets
         SET available_kobo = available_kobo + $1,
             ledger_kobo    = ledger_kobo    + $1,
             version        = version + 1
         WHERE id = $2
         RETURNING available_kobo"
    )
    .bind(amount_kobo).bind(wallet_id)
    .fetch_one(&mut *tx).await?;

    sqlx::query(
        "INSERT INTO ledger_entries
             (wallet_id, kind, amount_kobo, running_balance_kobo, reference, description, status)
         VALUES ($1, 'credit', $2, $3, $4, $5, 'settled')
         ON CONFLICT (wallet_id, reference, kind) DO NOTHING"
    )
    .bind(wallet_id).bind(amount_kobo).bind(new_balance).bind(reference).bind(description)
    .execute(&mut *tx).await?;

    sqlx::query(
        "INSERT INTO transactions (wallet_id, kind, amount_kobo, reference, description, status)
         VALUES ($1, 'credit', $2, $3, $4, 'success')
         ON CONFLICT DO NOTHING"
    )
    .bind(wallet_id).bind(amount_kobo).bind(reference).bind(description)
    .execute(&mut *tx).await?;

    let payload = serde_json::json!({
        "wallet_id": wallet_id, "amount_kobo": amount_kobo,
        "reference": reference, "running_balance_kobo": new_balance
    });
    sqlx::query("INSERT INTO outbox (event_type, payload) VALUES ('wallet.credited', $1)")
        .bind(payload)
        .execute(&mut *tx).await?;

    tx.commit().await?;
    Ok(new_balance)
}

// ── Idempotency ───────────────────────────────────────────────────────────────

pub async fn get_idempotency(pool: &PgPool, key: &str) -> Option<(u16, String)> {
    let row: Option<(i16, String)> = sqlx::query_as(
        "SELECT status, body FROM idempotency_keys
         WHERE key = $1 AND created_at > NOW() - INTERVAL '24 hours'"
    )
    .bind(key)
    .fetch_optional(pool).await.ok().flatten();

    row.map(|(s, b)| (s as u16, b))
}

pub async fn set_idempotency(pool: &PgPool, key: &str, status: u16, body: &str) {
    let _ = sqlx::query(
        "INSERT INTO idempotency_keys (key, status, body)
         VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING"
    )
    .bind(key).bind(status as i16).bind(body)
    .execute(pool).await;
}

// ── Webhook dedup ─────────────────────────────────────────────────────────────

pub async fn webhook_already_processed(pool: &PgPool, reference: &str) -> bool {
    let row: Option<(bool,)> = sqlx::query_as(
        "SELECT EXISTS(SELECT 1 FROM ledger_entries WHERE reference = $1 AND kind = 'credit')"
    )
    .bind(reference)
    .fetch_optional(pool).await.ok().flatten();

    row.map(|(b,)| b).unwrap_or(false)
}

// ── Outbox worker ─────────────────────────────────────────────────────────────

pub async fn outbox_worker(pool: PgPool) {
    loop {
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;

        let rows: Vec<(Uuid, String, serde_json::Value, i32)> = sqlx::query_as(
            "SELECT id, event_type, payload, attempts
             FROM outbox
             WHERE status = 'pending' AND next_retry <= NOW()
             ORDER BY created_at LIMIT 50"
        )
        .fetch_all(&pool).await.unwrap_or_default();

        for (id, event_type, payload, attempts) in rows {
            let delivered = deliver_event(&event_type, &payload).await;
            let attempts  = attempts + 1;

            if delivered {
                let _ = sqlx::query(
                    "UPDATE outbox SET status = 'delivered', attempts = $1 WHERE id = $2"
                )
                .bind(attempts).bind(id)
                .execute(&pool).await;
            } else {
                let backoff_secs = (5i64 * 2i64.pow(attempts as u32)).min(300);
                let next_retry   = Utc::now() + chrono::Duration::seconds(backoff_secs);
                let status       = if attempts >= 10 { "failed" } else { "pending" };

                let _ = sqlx::query(
                    "UPDATE outbox SET status = $1, attempts = $2, next_retry = $3 WHERE id = $4"
                )
                .bind(status).bind(attempts).bind(next_retry).bind(id)
                .execute(&pool).await;
            }
        }
    }
}

async fn deliver_event(event_type: &str, payload: &serde_json::Value) -> bool {
    match event_type {
        "wallet.credited" => {
            let email   = payload["email"].as_str().unwrap_or("");
            let name    = payload["name"].as_str().unwrap_or("there");
            let amount  = payload["amount_kobo"].as_i64().unwrap_or(0);
            let balance = payload["running_balance_kobo"].as_i64().unwrap_or(0);
            if !email.is_empty() {
                let (subject, html, plain) = crate::email::wallet_credited_email(name, amount, balance);
                send_email(email, subject, &html, &plain).await;
            }
            true
        }
        "wallet.debited" => {
            let email       = payload["email"].as_str().unwrap_or("");
            let name        = payload["name"].as_str().unwrap_or("there");
            let amount      = payload["amount_kobo"].as_i64().unwrap_or(0);
            let balance     = payload["running_balance_kobo"].as_i64().unwrap_or(0);
            let description = payload["description"].as_str().unwrap_or("A payment");
            if !email.is_empty() {
                let (subject, html, plain) = crate::email::wallet_debited_email(name, amount, balance, description);
                send_email(email, subject, &html, &plain).await;
            }
            true
        }
        "ajo.payout" => {
            let email  = payload["email"].as_str().unwrap_or("");
            let name   = payload["name"].as_str().unwrap_or("there");
            let amount = payload["amount_kobo"].as_i64().unwrap_or(0);
            let group  = payload["group_name"].as_str().unwrap_or("your Ajo group");
            if !email.is_empty() {
                let (subject, html, plain) = crate::email::ajo_payout_email(name, amount, group);
                send_email(email, subject, &html, &plain).await;
            }
            true
        }
        "bill.paid" => {
            let email       = payload["creator_email"].as_str().unwrap_or("");
            let name        = payload["creator_name"].as_str().unwrap_or("there");
            let payer       = payload["payer_name"].as_str().unwrap_or("Someone");
            let amount      = payload["amount_kobo"].as_i64().unwrap_or(0);
            let bill_title  = payload["bill_title"].as_str().unwrap_or("bill");
            if !email.is_empty() {
                let (subject, html, plain) = crate::email::bill_paid_email(name, payer, amount, bill_title);
                send_email(email, subject, &html, &plain).await;
            }
            true
        }
        "ajo.contribution" => {
            let email       = payload["receiver_email"].as_str().unwrap_or("");
            let name        = payload["receiver_name"].as_str().unwrap_or("there");
            let contributor = payload["contributor_name"].as_str().unwrap_or("A member");
            let amount      = payload["amount_kobo"].as_i64().unwrap_or(0);
            let group       = payload["group_name"].as_str().unwrap_or("your group");
            let cycle       = payload["cycle"].as_u64().unwrap_or(0) as u32;
            if !email.is_empty() {
                let (subject, html, plain) = crate::email::ajo_contribution_email(name, contributor, amount, group, cycle);
                send_email(email, &subject, &html, &plain).await;
            }
            true
        }
        _ => {
            tracing::info!(event_type, "outbox event processed");
            true
        }
    }
}

async fn send_email(to: &str, subject: &str, html: &str, plain: &str) {
    use lettre::{
        AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
        message::{MultiPart, SinglePart, header::ContentType},
        transport::smtp::authentication::Credentials,
    };

    let smtp_host      = std::env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.gmail.com".into());
    let smtp_port: u16 = std::env::var("SMTP_PORT").ok()
        .and_then(|p| p.parse().ok()).unwrap_or(465);
    let username = match std::env::var("SMTP_USERNAME") {
        Ok(u) => u,
        Err(_) => { tracing::debug!("SMTP_USERNAME not set — email skipped"); return; }
    };
    let password = match std::env::var("SMTP_PASSWORD") {
        Ok(p) => p,
        Err(_) => { tracing::debug!("SMTP_PASSWORD not set — email skipped"); return; }
    };
    let from = std::env::var("EMAIL_FROM")
        .unwrap_or_else(|_| format!("Cowri <{username}>"));

    let msg = match Message::builder()
        .from(from.parse().unwrap())
        .to(to.parse().unwrap())
        .subject(subject)
        .multipart(
            MultiPart::alternative()
                .singlepart(SinglePart::builder().header(ContentType::TEXT_PLAIN).body(plain.to_string()))
                .singlepart(SinglePart::builder().header(ContentType::TEXT_HTML).body(html.to_string()))
        )
    {
        Ok(m) => m,
        Err(e) => { tracing::warn!(error = %e, "Failed to build email"); return; }
    };

    let creds = Credentials::new(username, password);
    let transport = if smtp_port == 465 {
        AsyncSmtpTransport::<Tokio1Executor>::relay(&smtp_host)
    } else {
        AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&smtp_host)
    };

    let transport = match transport {
        Ok(t) => t.credentials(creds).build(),
        Err(e) => { tracing::warn!(error = %e, "SMTP transport error"); return; }
    };

    match transport.send(msg).await {
        Ok(_)  => tracing::info!(to, subject, "Email sent"),
        Err(e) => tracing::warn!(to, error = %e, "Email failed"),
    }
}

// ── DB persistence helpers ────────────────────────────────────────────────────

pub async fn persist_user(pool: &sqlx::PgPool, user: &shared::User, password_hash: &str, transaction_pin_hash: &str, wallet: &shared::Wallet) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;

    let role = match user.role { shared::UserRole::Admin => "admin", _ => "user" };

    sqlx::query(
        "INSERT INTO users (id, name, phone, email, role, email_verified, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING"
    )
    .bind(user.id).bind(&user.name).bind(&user.phone)
    .bind(&user.email).bind(role).bind(user.email_verified).bind(user.created_at)
    .execute(&mut *tx).await?;

    sqlx::query(
        "INSERT INTO passwords (user_id, hash) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING"
    )
    .bind(user.id).bind(password_hash)
    .execute(&mut *tx).await?;

    sqlx::query(
        "INSERT INTO transaction_pins (user_id, hash) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING"
    )
    .bind(user.id).bind(transaction_pin_hash)
    .execute(&mut *tx).await?;

    sqlx::query(
        "INSERT INTO wallets (id, user_id, available_kobo, ledger_kobo, version)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO NOTHING"
    )
    .bind(wallet.id).bind(wallet.user_id)
    .bind(wallet.available_kobo).bind(wallet.ledger_kobo).bind(wallet.version as i64)
    .execute(&mut *tx).await?;

    tx.commit().await
}

pub async fn persist_ajo_group(pool: &sqlx::PgPool, g: &shared::AjoGroup, admin_id: uuid::Uuid) -> Result<(), sqlx::Error> {
    let freq = match g.frequency { shared::AjoFrequency::Daily => "daily", shared::AjoFrequency::Weekly => "weekly", _ => "monthly" };
    sqlx::query(
        "INSERT INTO ajo_groups (id, name, admin_id, contribution_kobo, frequency, member_count, current_cycle, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8) ON CONFLICT (id) DO NOTHING"
    )
    .bind(g.id).bind(&g.name).bind(admin_id).bind(g.contribution_kobo)
    .bind(freq).bind(g.member_count as i32).bind(g.current_cycle as i32).bind(g.created_at)
    .execute(pool).await?;

    sqlx::query(
        "INSERT INTO ajo_members (group_id, user_id, payout_position, has_received)
         VALUES ($1,$2,0,false) ON CONFLICT DO NOTHING"
    )
    .bind(g.id).bind(admin_id)
    .execute(pool).await?;

    Ok(())
}

pub async fn persist_ajo_join(pool: &sqlx::PgPool, group_id: uuid::Uuid, user_id: uuid::Uuid, position: i32) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO ajo_members (group_id, user_id, payout_position, has_received)
         VALUES ($1,$2,$3,false) ON CONFLICT DO NOTHING"
    )
    .bind(group_id).bind(user_id).bind(position)
    .execute(pool).await?;
    Ok(())
}

pub async fn persist_ajo_close(pool: &sqlx::PgPool, group_id: uuid::Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE ajo_groups SET status = 'cancelled' WHERE id = $1")
        .bind(group_id)
        .execute(pool)
        .await?;
    Ok(())
}

/// Mirrors `services::ajo::remove_member`'s in-memory renumbering: delete the
/// member, then shift everyone after them down one position, then shrink
/// member_count — one transaction, so a crash mid-way never leaves the
/// rotation and the group's target size disagreeing.
pub async fn persist_ajo_member_removal(
    pool: &sqlx::PgPool,
    group_id: uuid::Uuid,
    removed_position: i32,
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;

    sqlx::query("DELETE FROM ajo_members WHERE group_id = $1 AND payout_position = $2")
        .bind(group_id).bind(removed_position)
        .execute(&mut *tx).await?;

    sqlx::query(
        "UPDATE ajo_members SET payout_position = payout_position - 1
         WHERE group_id = $1 AND payout_position > $2"
    )
    .bind(group_id).bind(removed_position)
    .execute(&mut *tx).await?;

    sqlx::query("UPDATE ajo_groups SET member_count = member_count - 1 WHERE id = $1")
        .bind(group_id)
        .execute(&mut *tx).await?;

    tx.commit().await
}

pub async fn persist_ajo_contribution(pool: &sqlx::PgPool, group_id: uuid::Uuid, user_id: uuid::Uuid, cycle: u32, next_cycle: u32, completed: bool) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;

    sqlx::query(
        "INSERT INTO ajo_contributions (group_id, user_id, cycle) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING"
    )
    .bind(group_id).bind(user_id).bind(cycle as i32)
    .execute(&mut *tx).await?;

    let status = if completed { "completed" } else { "active" };
    sqlx::query(
        "UPDATE ajo_groups SET current_cycle = $1, status = $2 WHERE id = $3"
    )
    .bind(next_cycle as i32).bind(status).bind(group_id)
    .execute(&mut *tx).await?;

    tx.commit().await
}

pub async fn persist_bill(pool: &sqlx::PgPool, bill: &shared::Bill, participants: &[(uuid::Uuid, i64)]) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;

    sqlx::query(
        "INSERT INTO bills (id, title, creator_id, total_kobo, status, deadline_at, complete_by_at, timezone, created_at)
         VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING"
    )
    .bind(bill.id)
    .bind(&bill.title)
    .bind(bill.creator_id)
    .bind(bill.total_kobo)
    .bind(bill.deadline_at)
    .bind(bill.complete_by_at)
    .bind(&bill.timezone)
    .bind(bill.created_at)
    .execute(&mut *tx).await?;

    for (uid, share) in participants {
        sqlx::query(
            "INSERT INTO bill_participants (bill_id, user_id, share_kobo, amount_paid_kobo, paid)
             VALUES ($1,$2,$3,0,false) ON CONFLICT DO NOTHING"
        )
        .bind(bill.id).bind(uid).bind(share)
        .execute(&mut *tx).await?;
    }

    tx.commit().await
}

pub async fn persist_bill_payment(pool: &sqlx::PgPool, bill_id: uuid::Uuid, user_id: uuid::Uuid, all_paid: bool) -> Result<(), sqlx::Error> {
    // Legacy helper — prefer settle_payment_attempt which applies amount_paid_kobo.
    let mut tx = pool.begin().await?;

    sqlx::query(
        "UPDATE bill_participants
         SET paid = true, amount_paid_kobo = share_kobo
         WHERE bill_id = $1 AND user_id = $2"
    )
        .bind(bill_id).bind(user_id)
        .execute(&mut *tx).await?;

    let status = if all_paid { "settled" } else { "partially_paid" };
    sqlx::query("UPDATE bills SET status = $1 WHERE id = $2")
        .bind(status).bind(bill_id)
        .execute(&mut *tx).await?;

    tx.commit().await
}

// ── Obligations + PSP attempts ────────────────────────────────────────────────

pub async fn insert_obligation(
    pool: &PgPool,
    kind: &str,
    payer_user_id: Uuid,
    payee_user_id: Option<Uuid>,
    amount_kobo: i64,
    bill_id: Option<Uuid>,
    ajo_group_id: Option<Uuid>,
    ajo_cycle: Option<i32>,
    beneficiary_user_id: Option<Uuid>,
    idempotency_key: &str,
) -> Result<Uuid, sqlx::Error> {
    let id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO obligations
            (id, kind, payer_user_id, payee_user_id, amount_kobo, bill_id, ajo_group_id, ajo_cycle,
             beneficiary_user_id, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (idempotency_key) DO NOTHING"
    )
    .bind(id)
    .bind(kind)
    .bind(payer_user_id)
    .bind(payee_user_id)
    .bind(amount_kobo)
    .bind(bill_id)
    .bind(ajo_group_id)
    .bind(ajo_cycle)
    .bind(beneficiary_user_id)
    .bind(idempotency_key)
    .execute(pool)
    .await?;

    // If conflict, return existing id
    let existing: Uuid = sqlx::query_scalar(
        "SELECT id FROM obligations WHERE idempotency_key = $1"
    )
    .bind(idempotency_key)
    .fetch_one(pool)
    .await?;
    Ok(existing)
}

pub async fn insert_payment_attempt(
    pool: &PgPool,
    obligation_id: Uuid,
    amount_kobo: i64,
    provider_reference: &str,
    mode: &str,
    idempotency_key: &str,
    authorization_url: Option<&str>,
) -> Result<Uuid, sqlx::Error> {
    let id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO payment_attempts
            (id, obligation_id, amount_kobo, provider_reference, mode, idempotency_key, authorization_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7)"
    )
    .bind(id)
    .bind(obligation_id)
    .bind(amount_kobo)
    .bind(provider_reference)
    .bind(mode)
    .bind(idempotency_key)
    .bind(authorization_url)
    .execute(pool)
    .await?;
    Ok(id)
}

pub async fn set_payment_attempt_url(pool: &PgPool, attempt_id: Uuid, url: &str) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE payment_attempts SET authorization_url = $1 WHERE id = $2")
        .bind(url).bind(attempt_id)
        .execute(pool).await?;
    Ok(())
}

pub async fn fail_payment_attempt(pool: &PgPool, attempt_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE payment_attempts SET status = 'failed' WHERE id = $1")
        .bind(attempt_id)
        .execute(pool).await?;
    Ok(())
}

pub struct MandateRow {
    pub authorization_code: String,
    pub email: String,
}

pub async fn get_active_mandate(pool: &PgPool, mandate_id: Uuid) -> Result<Option<MandateRow>, sqlx::Error> {
    let row: Option<(String, String)> = sqlx::query_as(
        "SELECT authorization_code, email FROM payment_mandates
         WHERE id = $1 AND status = 'active'"
    )
    .bind(mandate_id)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|(authorization_code, email)| MandateRow { authorization_code, email }))
}

/// Settle a payment attempt by provider reference. Updates obligation + bill share.
/// Idempotent: replaying a settled reference is a no-op success.
pub async fn settle_payment_attempt(
    pool: &PgPool,
    reference: &str,
    amount_kobo: i64,
) -> Result<SettleResult, sqlx::Error> {
    let mut tx = pool.begin().await?;

    let attempt: Option<(Uuid, Uuid, i64, String)> = sqlx::query_as(
        "SELECT id, obligation_id, amount_kobo, status FROM payment_attempts
         WHERE provider_reference = $1 FOR UPDATE"
    )
    .bind(reference)
    .fetch_optional(&mut *tx)
    .await?;

    let Some((attempt_id, obligation_id, attempt_amount, status)) = attempt else {
        return Ok(SettleResult::NotFound);
    };

    if status == "settled" {
        return Ok(SettleResult::AlreadySettled { obligation_id });
    }

    if amount_kobo > 0 && amount_kobo != attempt_amount {
        // Prefer the amount we initialized; log mismatch via orphan later if needed.
    }

    sqlx::query(
        "UPDATE payment_attempts
         SET status = 'settled', settled_at = NOW()
         WHERE id = $1"
    )
    .bind(attempt_id)
    .execute(&mut *tx)
    .await?;

    let obl: (i64, i64, String, Option<Uuid>, Uuid, Option<Uuid>, Option<Uuid>, Option<i32>) = sqlx::query_as(
        "SELECT amount_kobo, amount_paid_kobo, kind, bill_id, payer_user_id, beneficiary_user_id,
                ajo_group_id, ajo_cycle
         FROM obligations WHERE id = $1 FOR UPDATE"
    )
    .bind(obligation_id)
    .fetch_one(&mut *tx)
    .await?;

    let (obl_amount, paid_so_far, kind, bill_id, payer_user_id, beneficiary_user_id, ajo_group_id, ajo_cycle) = obl;
    let new_paid = (paid_so_far + attempt_amount).min(obl_amount);
    let obl_status = if new_paid >= obl_amount {
        "settled"
    } else if new_paid > 0 {
        "partially_paid"
    } else {
        "pending"
    };

    sqlx::query(
        "UPDATE obligations
         SET amount_paid_kobo = $1, status = $2, updated_at = NOW()
         WHERE id = $3"
    )
    .bind(new_paid)
    .bind(obl_status)
    .bind(obligation_id)
    .execute(&mut *tx)
    .await?;

    let mut bill_sync = None;

    if kind == "bill" || kind == "gift" {
        if let Some(bid) = bill_id {
            let share_user = if kind == "gift" {
                beneficiary_user_id.unwrap_or(payer_user_id)
            } else {
                payer_user_id
            };

            let share: (i64, i64) = sqlx::query_as(
                "SELECT share_kobo, amount_paid_kobo FROM bill_participants
                 WHERE bill_id = $1 AND user_id = $2 FOR UPDATE"
            )
            .bind(bid)
            .bind(share_user)
            .fetch_one(&mut *tx)
            .await?;

            let (share_kobo, part_paid) = share;
            let part_new = (part_paid + attempt_amount).min(share_kobo);
            let part_paid_flag = part_new >= share_kobo;

            sqlx::query(
                "UPDATE bill_participants
                 SET amount_paid_kobo = $1, paid = $2
                 WHERE bill_id = $3 AND user_id = $4"
            )
            .bind(part_new)
            .bind(part_paid_flag)
            .bind(bid)
            .bind(share_user)
            .execute(&mut *tx)
            .await?;

            let unpaid: (i64,) = sqlx::query_as(
                "SELECT COUNT(*)::bigint FROM bill_participants
                 WHERE bill_id = $1 AND paid = false"
            )
            .bind(bid)
            .fetch_one(&mut *tx)
            .await?;

            let bill_status = if unpaid.0 == 0 {
                "settled"
            } else if part_new > 0 || part_paid > 0 {
                "partially_paid"
            } else {
                "pending"
            };

            sqlx::query("UPDATE bills SET status = $1 WHERE id = $2")
                .bind(bill_status)
                .bind(bid)
                .execute(&mut *tx)
                .await?;

            bill_sync = Some(BillSettleSync {
                bill_id: bid,
                user_id: share_user,
                amount_paid_kobo: part_new,
                share_kobo,
                bill_status: bill_status.to_string(),
            });
        }
    }

    if kind == "ajo" {
        if let (Some(gid), Some(cycle)) = (ajo_group_id, ajo_cycle) {
            sqlx::query(
                "INSERT INTO ajo_contributions (group_id, user_id, cycle)
                 VALUES ($1,$2,$3) ON CONFLICT DO NOTHING"
            )
            .bind(gid)
            .bind(payer_user_id)
            .bind(cycle)
            .execute(&mut *tx)
            .await?;

            // Advance cycle when everyone in the group has contributed this cycle.
            let member_count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*)::bigint FROM ajo_members WHERE group_id = $1"
            )
            .bind(gid)
            .fetch_one(&mut *tx)
            .await?;
            let contrib_count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*)::bigint FROM ajo_contributions
                 WHERE group_id = $1 AND cycle = $2"
            )
            .bind(gid)
            .bind(cycle)
            .fetch_one(&mut *tx)
            .await?;

            if contrib_count.0 >= member_count.0 && member_count.0 > 0 {
                let group: (i32, i32) = sqlx::query_as(
                    "SELECT current_cycle, member_count FROM ajo_groups WHERE id = $1 FOR UPDATE"
                )
                .bind(gid)
                .fetch_one(&mut *tx)
                .await?;
                let (current_cycle, member_target) = group;
                if current_cycle == cycle {
                    let next = current_cycle + 1;
                    if next >= member_target {
                        sqlx::query(
                            "UPDATE ajo_groups SET status = 'completed' WHERE id = $1"
                        )
                        .bind(gid)
                        .execute(&mut *tx)
                        .await?;
                    } else {
                        sqlx::query(
                            "UPDATE ajo_groups SET current_cycle = $1 WHERE id = $2"
                        )
                        .bind(next)
                        .bind(gid)
                        .execute(&mut *tx)
                        .await?;
                    }
                    sqlx::query(
                        "UPDATE ajo_members SET has_received = true
                         WHERE group_id = $1 AND payout_position = $2"
                    )
                    .bind(gid)
                    .bind(cycle)
                    .execute(&mut *tx)
                    .await?;
                }
            }
        }
    }

    let mut ajo_sync = None;
    if kind == "ajo" {
        if let (Some(gid), Some(cycle)) = (ajo_group_id, ajo_cycle) {
            let group: (i32, String) = sqlx::query_as(
                "SELECT current_cycle, status FROM ajo_groups WHERE id = $1"
            )
            .bind(gid)
            .fetch_one(&mut *tx)
            .await?;
            ajo_sync = Some(AjoSettleSync {
                group_id: gid,
                contributor_id: payer_user_id,
                cycle,
                current_cycle: group.0,
                status: group.1,
            });
        }
    }

    tx.commit().await?;
    Ok(SettleResult::Settled {
        obligation_id,
        bill: bill_sync,
        ajo: ajo_sync,
    })
}

#[derive(Debug)]
pub struct BillSettleSync {
    pub bill_id: Uuid,
    pub user_id: Uuid,
    pub amount_paid_kobo: i64,
    pub share_kobo: i64,
    pub bill_status: String,
}

#[derive(Debug)]
pub struct AjoSettleSync {
    pub group_id: Uuid,
    pub contributor_id: Uuid,
    pub cycle: i32,
    pub current_cycle: i32,
    pub status: String,
}

#[derive(Debug)]
pub enum SettleResult {
    NotFound,
    AlreadySettled { obligation_id: Uuid },
    Settled {
        obligation_id: Uuid,
        bill: Option<BillSettleSync>,
        ajo: Option<AjoSettleSync>,
    },
}

pub async fn payer_for_reference(pool: &PgPool, reference: &str) -> Option<Uuid> {
    sqlx::query_scalar::<_, Uuid>(
        "SELECT o.payer_user_id
         FROM payment_attempts a
         JOIN obligations o ON o.id = a.obligation_id
         WHERE a.provider_reference = $1"
    )
    .bind(reference)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
}

pub async fn upsert_mandate(
    pool: &PgPool,
    user_id: Uuid,
    authorization_code: &str,
    email: &str,
    card_last4: Option<&str>,
    bank: Option<&str>,
    card_type: Option<&str>,
) -> Result<Uuid, sqlx::Error> {
    let existing: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM payment_mandates
         WHERE user_id = $1 AND authorization_code = $2"
    )
    .bind(user_id)
    .bind(authorization_code)
    .fetch_optional(pool)
    .await?;
    if let Some((id,)) = existing {
        sqlx::query(
            "UPDATE payment_mandates SET status = 'active', email = $1, card_last4 = $2, bank = $3, card_type = $4
             WHERE id = $5"
        )
        .bind(email)
        .bind(card_last4)
        .bind(bank)
        .bind(card_type)
        .bind(id)
        .execute(pool)
        .await?;
        return Ok(id);
    }
    let id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO payment_mandates
            (id, user_id, authorization_code, email, card_last4, bank, card_type, reusable, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,'active')"
    )
    .bind(id)
    .bind(user_id)
    .bind(authorization_code)
    .bind(email)
    .bind(card_last4)
    .bind(bank)
    .bind(card_type)
    .execute(pool)
    .await?;
    Ok(id)
}

pub async fn list_mandates(pool: &PgPool, user_id: Uuid) -> Result<Vec<serde_json::Value>, sqlx::Error> {
    let rows: Vec<(Uuid, String, Option<String>, Option<String>, Option<String>, String, chrono::DateTime<Utc>)> =
        sqlx::query_as(
            "SELECT id, email, card_last4, bank, card_type, status, consented_at
             FROM payment_mandates WHERE user_id = $1 ORDER BY created_at DESC"
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;
    Ok(rows.into_iter().map(|(id, email, last4, bank, card_type, status, consented_at)| {
        serde_json::json!({
            "id": id,
            "email": email,
            "card_last4": last4,
            "bank": bank,
            "card_type": card_type,
            "status": status,
            "consented_at": consented_at,
        })
    }).collect())
}

pub async fn record_webhook_orphan(
    pool: &PgPool,
    reference: &str,
    payload: &serde_json::Value,
    reason: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO webhook_orphans (reference, payload, reason) VALUES ($1,$2,$3)"
    )
    .bind(reference)
    .bind(payload)
    .bind(reason)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn replace_bill_installments(
    pool: &PgPool,
    bill_id: Uuid,
    user_id: Uuid,
    items: &[(i64, chrono::DateTime<Utc>)],
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query("DELETE FROM bill_installments WHERE bill_id = $1 AND user_id = $2")
        .bind(bill_id).bind(user_id)
        .execute(&mut *tx).await?;

    for (seq, (amount, due)) in items.iter().enumerate() {
        sqlx::query(
            "INSERT INTO bill_installments (bill_id, user_id, sequence, amount_kobo, due_at)
             VALUES ($1,$2,$3,$4,$5)"
        )
        .bind(bill_id)
        .bind(user_id)
        .bind((seq + 1) as i32)
        .bind(amount)
        .bind(due)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await
}

// ── Direct email send (for OTP — not via outbox) ──────────────────────────────

pub async fn send_otp_email(to: &str, otp: &str, name: &str) {
    let (subject, html, plain) = crate::email::otp_email(name, otp);
    send_email(to, subject, &html, &plain).await;
}

pub async fn send_email_direct(to: &str, subject: &str, html: &str, plain: &str) {
    send_email(to, subject, html, plain).await;
}
