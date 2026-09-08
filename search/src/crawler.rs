use crate::domain::Document;
use anyhow::Result;
use reqwest::Client;
use scraper::{Html, Selector};
use std::{
    collections::HashSet,
    sync::Arc,
    time::Duration,
};
use tokio::sync::{mpsc, Semaphore};
use tracing::warn;

pub struct Crawler {
    client: Client,
    max_pages: usize,
    delay: Duration,
    semaphore: Arc<Semaphore>,
}

impl Crawler {
    pub fn new(max_pages: usize, concurrency: usize) -> Result<Self> {
        Ok(Self {
            client: Client::builder()
                .user_agent("GlideSearch/1.0")
                .timeout(Duration::from_secs(10))
                .build()?,
            max_pages,
            delay: Duration::from_millis(300),
            semaphore: Arc::new(Semaphore::new(concurrency)),
        })
    }

    pub async fn crawl(&self, seeds: Vec<String>, tx: mpsc::Sender<Document>) -> Result<()> {
        let visited: Arc<parking_lot::Mutex<HashSet<String>>> = Default::default();
        let mut queue = seeds;

        while let Some(url_str) = queue.pop() {
            if visited.lock().len() >= self.max_pages {
                break;
            }
            if !visited.lock().insert(url_str.clone()) {
                continue;
            }

            let permit = self.semaphore.clone().acquire_owned().await?;
            let client = self.client.clone();
            let tx = tx.clone();
            let delay = self.delay;

            tokio::spawn(async move {
                if let Err(e) = fetch_and_send(&client, &url_str, &tx).await {
                    warn!(url = %url_str, "crawl error: {e}");
                }
                drop(permit);
                tokio::time::sleep(delay).await;
            });
        }
        Ok(())
    }
}

async fn fetch_and_send(client: &Client, url_str: &str, tx: &mpsc::Sender<Document>) -> Result<()> {
    let resp = client.get(url_str).send().await?;
    if !resp.status().is_success() {
        return Ok(());
    }
    let ct = resp.headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if !ct.contains("text/html") {
        return Ok(());
    }

    let html = resp.text().await?;
    let doc = parse_html(url_str, &html)?;
    tx.send(doc).await.ok();
    Ok(())
}

fn parse_html(url: &str, html: &str) -> Result<Document> {
    let parsed = Html::parse_document(html);

    let title = parsed
        .select(&Selector::parse("title").unwrap())
        .next()
        .map(|t| t.text().collect::<String>())
        .unwrap_or_default()
        .trim()
        .to_string();

    // Grab visible text from body, skip script/style
    let body_sel = Selector::parse("body").unwrap();
    let content = parsed
        .select(&body_sel)
        .next()
        .map(|b| b.text().collect::<Vec<_>>().join(" "))
        .unwrap_or_default();

    // Collapse whitespace
    let content = content.split_whitespace().collect::<Vec<_>>().join(" ");

    Ok(Document {
        id: uuid::Uuid::new_v4(),
        url: url.to_string(),
        title,
        content,
    })
}
