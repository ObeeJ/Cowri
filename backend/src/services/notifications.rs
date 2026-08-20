use shared::*;
use uuid::Uuid;

use crate::store::Store;

const MAX_NOTIFICATIONS: usize = 30;

fn naira(amount_kobo: i64) -> String {
    format!("₦{:.2}", amount_kobo as f64 / 100.0)
}

/// Renders one outbox event into a person-facing notification, only for the
/// event types a user should actually be told about. Reads straight from the
/// outbox — already the durable, ordered record of what happened to a wallet
/// — instead of keeping a second copy of the same facts in a new table.
fn render(event: &OutboxEvent, payload: &serde_json::Value) -> Option<(String, String)> {
    match event.event_type.as_str() {
        "wallet.credited" => {
            let amount = payload["amount_kobo"].as_i64().unwrap_or(0);
            Some(("Money received".into(), format!("Your wallet was credited {}.", naira(amount))))
        }
        "wallet.debited" => {
            let amount      = payload["amount_kobo"].as_i64().unwrap_or(0);
            let description = payload["description"].as_str().unwrap_or("A payment");
            Some(("Money sent".into(), format!("{description} — {} left your wallet.", naira(amount))))
        }
        "ajo.contribution" => {
            let contributor = payload["contributor_name"].as_str().unwrap_or("A member");
            let amount      = payload["amount_kobo"].as_i64().unwrap_or(0);
            let group       = payload["group_name"].as_str().unwrap_or("your circle");
            Some((
                "Ajo contribution received".into(),
                format!("{contributor} contributed {} to {group}.", naira(amount)),
            ))
        }
        "bill.paid" => {
            let payer  = payload["payer_name"].as_str().unwrap_or("Someone");
            let amount = payload["amount_kobo"].as_i64().unwrap_or(0);
            let title  = payload["bill_title"].as_str().unwrap_or("your bill");
            Some(("Bill share paid".into(), format!("{payer} paid {} towards {title}.", naira(amount))))
        }
        _ => None,
    }
}

pub fn list_for_user(store: &Store, user_id: Uuid) -> Vec<NotificationView> {
    let outbox = store.outbox.lock().unwrap();

    let mut items: Vec<NotificationView> = outbox
        .iter()
        .filter_map(|event| {
            let payload: serde_json::Value = serde_json::from_str(&event.payload).ok()?;
            let event_user_id = payload["user_id"].as_str().and_then(|s| Uuid::parse_str(s).ok())?;
            if event_user_id != user_id {
                return None;
            }
            let (title, body) = render(event, &payload)?;
            Some(NotificationView {
                id: event.id,
                kind: event.event_type.clone(),
                title,
                body,
                created_at: event.created_at,
            })
        })
        .collect();

    items.sort_by_key(|n| std::cmp::Reverse(n.created_at));
    items.truncate(MAX_NOTIFICATIONS);
    items
}
