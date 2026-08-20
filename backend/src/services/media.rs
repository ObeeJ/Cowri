use std::time::Duration;
use rusty_s3::{actions::S3Action, Bucket, Credentials, UrlStyle};
use shared::*;
use uuid::Uuid;

const PRESIGN_TTL: Duration = Duration::from_secs(5 * 60);
const MAX_UPLOAD_BYTES: i64 = 10 * 1024 * 1024; // 10MB
const ALLOWED_CONTENT_TYPES: &[(&str, &str)] = &[
    ("image/jpeg", "jpg"),
    ("image/png", "png"),
    ("image/webp", "webp"),
];

/// R2's S3-compatible endpoint and region are fixed by Cloudflare, not
/// configurable — https://developers.cloudflare.com/r2/api/s3/api/.
fn bucket() -> Result<Bucket, ApiError> {
    let account_id = std::env::var("R2_ACCOUNT_ID")
        .map_err(|_| ApiError { error: "Media storage is not configured".into() })?;
    let bucket_name = std::env::var("R2_BUCKET_NAME")
        .map_err(|_| ApiError { error: "Media storage is not configured".into() })?;

    let endpoint = format!("https://{account_id}.r2.cloudflarestorage.com")
        .parse()
        .map_err(|_| ApiError { error: "Media storage is misconfigured".into() })?;

    Bucket::new(endpoint, UrlStyle::Path, bucket_name, "auto")
        .map_err(|_| ApiError { error: "Media storage is misconfigured".into() })
}

fn credentials() -> Result<Credentials, ApiError> {
    let key = std::env::var("R2_ACCESS_KEY_ID")
        .map_err(|_| ApiError { error: "Media storage is not configured".into() })?;
    let secret = std::env::var("R2_SECRET_ACCESS_KEY")
        .map_err(|_| ApiError { error: "Media storage is not configured".into() })?;
    Ok(Credentials::new(key, secret))
}

fn extension_for(content_type: &str) -> Result<&'static str, ApiError> {
    ALLOWED_CONTENT_TYPES.iter()
        .find(|(ct, _)| *ct == content_type)
        .map(|(_, ext)| *ext)
        .ok_or(ApiError { error: "Only JPEG, PNG or WebP images are accepted".into() })
}

/// Public read URL for an object, via the R2 custom domain (infra/r2.tf) —
/// never the bare r2.dev URL, and never signed, since the bucket's public
/// read access is what the custom domain is for.
fn public_url(object_key: &str) -> Result<String, ApiError> {
    let base = std::env::var("R2_PUBLIC_URL")
        .map_err(|_| ApiError { error: "Media storage is not configured".into() })?;
    Ok(format!("{}/{object_key}", base.trim_end_matches('/')))
}

#[derive(Debug)]
pub struct Presigned {
    pub upload_url: String,
    pub object_key: String,
    pub public_url: String,
}

/// Generates a presigned PUT URL the *client* uploads directly to — the
/// file itself never passes through this API. `purpose` namespaces the
/// object key (e.g. "avatars") so different kinds of media can be told
/// apart, moderated, or cleaned up independently later.
pub fn presign_upload(user_id: Uuid, content_type: &str, size_bytes: i64, purpose: &str) -> Result<Presigned, ApiError> {
    if size_bytes <= 0 || size_bytes > MAX_UPLOAD_BYTES {
        return Err(ApiError { error: "File must be between 1 byte and 10MB".into() });
    }
    if !purpose.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') || purpose.is_empty() {
        return Err(ApiError { error: "Invalid upload purpose".into() });
    }
    let ext = extension_for(content_type)?;

    let bucket = bucket()?;
    let creds  = credentials()?;
    let object_key = format!("{purpose}/{user_id}/{}.{ext}", Uuid::new_v4());

    let mut action = rusty_s3::actions::PutObject::new(&bucket, Some(&creds), &object_key);
    action.headers_mut().insert("content-type", content_type);
    let upload_url = action.sign(PRESIGN_TTL).to_string();

    Ok(Presigned { upload_url, object_key: object_key.clone(), public_url: public_url(&object_key)? })
}

/// Deletes an object from R2. Sans-IO by design (rusty-s3 only signs
/// requests) — the actual DELETE is sent here, server-side, since cleanup
/// is server-initiated rather than something a client presigned URL covers.
pub async fn delete_object(object_key: &str) -> Result<(), ApiError> {
    let bucket = bucket()?;
    let creds  = credentials()?;

    let action = rusty_s3::actions::DeleteObject::new(&bucket, Some(&creds), object_key);
    let url = action.sign(PRESIGN_TTL);

    let res = reqwest::Client::new()
        .delete(url)
        .send()
        .await
        .map_err(|_| ApiError { error: "Media storage unreachable".into() })?;

    if !res.status().is_success() && res.status().as_u16() != 404 {
        return Err(ApiError { error: "Failed to delete media".into() });
    }
    Ok(())
}
