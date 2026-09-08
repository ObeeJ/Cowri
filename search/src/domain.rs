use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: Uuid,
    pub url: String,
    pub title: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub id: Uuid,
    pub url: String,
    pub title: String,
    pub snippet: String,
    pub score: f32,
}
