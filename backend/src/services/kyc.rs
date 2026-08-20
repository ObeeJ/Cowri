use sha2::{Digest, Sha256};
use shared::*;
use uuid::Uuid;

/// Prembly BVN Basic — validates a BVN and returns the account's verification
/// outcome. https://docs.prembly.com/docs/bvn-basic-copy
const PREMBLY_BVN_URL: &str = "https://api.prembly.com/verification/bvn_validation";

fn validate_bvn_format(bvn: &str) -> Result<(), ApiError> {
    if bvn.len() != 11 || !bvn.chars().all(|c| c.is_ascii_digit()) {
        return Err(ApiError { error: "BVN must be exactly 11 digits".into() });
    }
    Ok(())
}

/// One-way hash used only to detect a BVN already claimed by another
/// account. Never reversible, never sent anywhere — the raw BVN is sent to
/// Prembly over the request and kept nowhere in Cowri once that call returns.
fn hash_bvn(bvn: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bvn.as_bytes());
    format!("{:x}", hasher.finalize())
}

#[derive(Debug)]
pub struct BvnOutcome {
    pub bvn_hash:        String,
    pub verified:        bool,
    pub reference:       Option<String>,
    pub failure_reason:  Option<String>,
}

/// Calls Prembly BVN Basic. Fails closed: anything short of an explicit
/// success signal in the response is treated as a failed verification, never
/// silently upgraded to verified.
pub async fn verify_bvn(bvn: &str) -> Result<BvnOutcome, ApiError> {
    validate_bvn_format(bvn)?;
    let bvn_hash = hash_bvn(bvn);

    let api_key = std::env::var("PREMBLY_API_KEY")
        .map_err(|_| ApiError { error: "KYC verification is not configured".into() })?;

    let client = reqwest::Client::new();
    let res = client
        .post(PREMBLY_BVN_URL)
        .header("x-api-key", &api_key)
        .header("content-type", "application/json")
        .json(&serde_json::json!({ "number": bvn }))
        .send()
        .await
        .map_err(|_| ApiError { error: "KYC provider unreachable".into() })?;

    let status = res.status();
    let body: serde_json::Value = res.json().await
        .map_err(|_| ApiError { error: "KYC provider returned an unreadable response".into() })?;

    if !status.is_success() {
        let reason = body["message"].as_str()
            .or_else(|| body["detail"].as_str())
            .unwrap_or("Verification request rejected")
            .to_string();
        return Ok(BvnOutcome { bvn_hash, verified: false, reference: None, failure_reason: Some(reason) });
    }

    // Fail closed: only an explicit truthy `status` is treated as verified.
    let verified = body["status"].as_bool().unwrap_or(false);
    let reference = body["reference"].as_str()
        .or_else(|| body["data"]["reference"].as_str())
        .map(|s| s.to_string());

    let failure_reason = if verified {
        None
    } else {
        Some(
            body["message"].as_str()
                .or_else(|| body["detail"].as_str())
                .unwrap_or("BVN could not be verified")
                .to_string(),
        )
    };

    Ok(BvnOutcome { bvn_hash, verified, reference, failure_reason })
}

pub fn require_not_already_verified(current_status: &KycStatus) -> Result<(), ApiError> {
    if *current_status == KycStatus::Verified {
        return Err(ApiError { error: "This account is already KYC verified".into() });
    }
    Ok(())
}

/// Postgres-side duplicate check — is this BVN already linked to a
/// *different* account? The DB's unique index on bvn_hash is the real
/// guarantee (race-safe); this just turns a raw constraint violation into a
/// clear error message.
pub async fn bvn_already_claimed(pool: &sqlx::PgPool, bvn_hash: &str, user_id: Uuid) -> bool {
    sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE bvn_hash = $1 AND id != $2"
    )
    .bind(bvn_hash)
    .bind(user_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0) > 0
}
