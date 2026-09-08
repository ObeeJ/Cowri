mod crawler;
mod domain;
mod index;

// ferox_macros (published v0.1.0) expands to `ferox::ROUTES` / `ferox::StaticRoute`,
// but this workspace uses the crate under the name `glideapi`. Re-export it so the
// macro expansion resolves correctly.
extern crate glideapi as ferox;

use crawler::Crawler;
use domain::Document;
use glideapi::{get, post, App, FromRequest, IntoResponse, Request, Response, State};
use glideapi::response::Json;
use index::SearchIndex;
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::error;

// ── Shared state ──────────────────────────────────────────────────────────────

#[derive(Clone)]
struct AppState {
    index: Arc<SearchIndex>,
    doc_tx: mpsc::Sender<Document>,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// GET /search?q=...&top_k=10
#[get("/search")]
async fn search(req: Request) -> Response {
    let state = match State::<AppState>::from_request(&req) {
        Ok(s) => s.0,
        Err(e) => return e.into_response(),
    };

    // Parse query params manually (glideapi doesn't have a Query extractor)
    let raw_query = req.path.split('?').nth(1).unwrap_or("");
    let params: std::collections::HashMap<_, _> = url::form_urlencoded::parse(raw_query.as_bytes()).collect();

    let q = match params.get("q") {
        Some(q) => q.to_string(),
        None => return Response { status: 400, body: r#"{"error":"missing q"}"#.into(), headers: vec![] },
    };
    let top_k: usize = params.get("top_k").and_then(|v| v.parse().ok()).unwrap_or(10);

    match state.index.search(&q, top_k) {
        Ok(results) => Json(results).into_response(),
        Err(e) => {
            error!("search error: {e}");
            Response { status: 500, body: format!(r#"{{"error":"{e}"}}"#), headers: vec![] }
        }
    }
}

/// POST /crawl  body: {"urls":["https://..."],"max_pages":50}
#[post("/crawl")]
async fn crawl(req: Request) -> Response {
    #[derive(serde::Deserialize)]
    struct Body { urls: Vec<String>, #[serde(default = "default_pages")] max_pages: usize }
    fn default_pages() -> usize { 50 }

    let state = match State::<AppState>::from_request(&req) {
        Ok(s) => s.0,
        Err(e) => return e.into_response(),
    };
    let body: Body = match serde_json::from_slice(&req.body) {
        Ok(b) => b,
        Err(e) => return Response { status: 400, body: format!(r#"{{"error":"{e}"}}"#), headers: vec![] },
    };

    let tx = state.doc_tx.clone();
    tokio::spawn(async move {
        match Crawler::new(body.max_pages, 4) {
            Ok(c) => { c.crawl(body.urls, tx).await.ok(); }
            Err(e) => error!("crawler init: {e}"),
        }
    });

    Response::ok(r#"{"status":"crawl_started"}"#)
}

/// POST /index  body: Document JSON (manual ingestion)
#[post("/index")]
async fn index_doc(req: Request) -> Response {
    let state = match State::<AppState>::from_request(&req) {
        Ok(s) => s.0,
        Err(e) => return e.into_response(),
    };
    let doc: Document = match serde_json::from_slice(&req.body) {
        Ok(d) => d,
        Err(e) => return Response { status: 400, body: format!(r#"{{"error":"{e}"}}"#), headers: vec![] },
    };
    state.doc_tx.send(doc).await.ok();
    Response::ok(r#"{"status":"queued"}"#)
}

// ── Main ──────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    App::init_tracing();

    let index = Arc::new(SearchIndex::open_or_create("./data/index".as_ref())?);

    // Background indexing task — drains the channel and writes to the index
    let (doc_tx, mut doc_rx) = mpsc::channel::<Document>(512);
    let idx = index.clone();
    tokio::spawn(async move {
        while let Some(doc) = doc_rx.recv().await {
            let idx = idx.clone();
            tokio::task::spawn_blocking(move || {
                if let Err(e) = idx.add(&doc) {
                    error!(url = %doc.url, "index error: {e}");
                }
            })
            .await
            .ok();
        }
    });

    let state = AppState { index, doc_tx };

    App::new()
        .state(state)
        .mount_routes()
        .listen("0.0.0.0:8080")
        .await;

    Ok(())
}
