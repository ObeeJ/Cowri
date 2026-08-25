//! Due-schedule worker for Ajo auto-debit (Paystack mandate charge).
//! Uses SKIP LOCKED-style leasing via lease_owner / lease_until columns.

use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::db;
use crate::services::payments;
use crate::store::Store;

pub async fn schedule_worker(pool: PgPool, store: Store) {
    let owner = format!("cowri-{}", Uuid::new_v4());
    loop {
        tokio::time::sleep(std::time::Duration::from_secs(15)).await;
        if let Err(e) = tick_due_schedules(&pool, &store, &owner).await {
            tracing::warn!(error = %e, "schedule tick failed");
        }
    }
}

async fn tick_due_schedules(pool: &PgPool, store: &Store, owner: &str) -> Result<(), sqlx::Error> {
    let lease_until = Utc::now() + Duration::seconds(60);
    // Claim up to 20 due rows.
    let rows: Vec<(Uuid, Uuid, Option<Uuid>, Option<Uuid>, Option<Uuid>)> = sqlx::query_as(
        "UPDATE payment_schedules
         SET lease_owner = $1, lease_until = $2
         WHERE id IN (
             SELECT id FROM payment_schedules
             WHERE enabled = TRUE
               AND next_run_at <= NOW()
               AND (lease_until IS NULL OR lease_until < NOW())
             ORDER BY next_run_at
             FOR UPDATE SKIP LOCKED
             LIMIT 20
         )
         RETURNING id, user_id, ajo_group_id, bill_id, mandate_id"
    )
    .bind(owner)
    .bind(lease_until)
    .fetch_all(pool)
    .await?;

    for (schedule_id, user_id, ajo_group_id, _bill_id, mandate_id) in rows {
        if let (Some(group_id), Some(mandate)) = (ajo_group_id, mandate_id) {
            if let Err(e) = run_ajo_auto(pool, store, schedule_id, user_id, group_id, mandate).await {
                tracing::warn!(error = %e, %schedule_id, "ajo auto-debit failed");
            }
        }
        // Clear lease; bump next_run based on group frequency when ajo.
        let _ = advance_schedule(pool, store, schedule_id, ajo_group_id).await;
    }
    Ok(())
}

async fn run_ajo_auto(
    pool: &PgPool,
    store: &Store,
    schedule_id: Uuid,
    user_id: Uuid,
    group_id: Uuid,
    mandate_id: Uuid,
) -> Result<(), String> {
    let group = store
        .ajo_groups
        .lock()
        .unwrap()
        .get(&group_id)
        .cloned()
        .ok_or_else(|| "group missing".to_string())?;

    if group.status != shared::AjoStatus::Active {
        return Ok(());
    }
    if store
        .ajo_contributions
        .lock()
        .unwrap()
        .contains(&(group_id, user_id, group.current_cycle))
    {
        return Ok(());
    }

    let receiver_id = store
        .ajo_members
        .lock()
        .unwrap()
        .iter()
        .find(|((g, _), m)| *g == group_id && m.payout_position == group.current_cycle)
        .map(|((_, u), _)| *u)
        .ok_or_else(|| "no receiver".to_string())?;

    let idem = format!(
        "ajo-auto-{}-{}-{}-{}",
        group_id, user_id, group.current_cycle, schedule_id
    );
    let obligation_id = db::insert_obligation(
        pool,
        "ajo",
        user_id,
        Some(receiver_id),
        group.contribution_kobo,
        None,
        Some(group_id),
        Some(group.current_cycle as i32),
        None,
        &idem,
    )
    .await
    .map_err(|e| e.to_string())?;

    payments::charge_mandate(
        pool,
        mandate_id,
        obligation_id,
        group.contribution_kobo,
        &format!("{idem}:attempt"),
    )
    .await
    .map_err(|e| e.error)?;

    Ok(())
}

async fn advance_schedule(
    pool: &PgPool,
    store: &Store,
    schedule_id: Uuid,
    ajo_group_id: Option<Uuid>,
) -> Result<(), sqlx::Error> {
    let mut next = Utc::now() + Duration::days(1);
    if let Some(gid) = ajo_group_id {
        if let Some(g) = store.ajo_groups.lock().unwrap().get(&gid) {
            next = match g.frequency {
                shared::AjoFrequency::Daily => Utc::now() + Duration::days(1),
                shared::AjoFrequency::Weekly => Utc::now() + Duration::days(7),
                shared::AjoFrequency::Monthly => Utc::now() + Duration::days(30),
            };
        }
    }
    sqlx::query(
        "UPDATE payment_schedules
         SET last_run_at = NOW(), next_run_at = $1, lease_owner = NULL, lease_until = NULL
         WHERE id = $2"
    )
    .bind(next)
    .bind(schedule_id)
    .execute(pool)
    .await?;
    Ok(())
}
