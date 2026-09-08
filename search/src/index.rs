use crate::domain::{Document, SearchResult};
use anyhow::Result;
use std::path::Path;
use tantivy::{
    collector::TopDocs,
    doc,
    query::QueryParser,
    schema::{Schema, Value, STORED, TEXT},
    Index, IndexWriter, ReloadPolicy, TantivyDocument,
};
use uuid::Uuid;

pub struct SearchIndex {
    index: Index,
    writer: parking_lot::Mutex<IndexWriter>,
    f_id: tantivy::schema::Field,
    f_url: tantivy::schema::Field,
    f_title: tantivy::schema::Field,
    f_content: tantivy::schema::Field,
    query_parser: QueryParser,
}

impl SearchIndex {
    pub fn open_or_create(path: &Path) -> Result<Self> {
        std::fs::create_dir_all(path)?;

        let mut builder = Schema::builder();
        let f_id      = builder.add_text_field("id",      STORED);
        let f_url     = builder.add_text_field("url",     STORED);
        let f_title   = builder.add_text_field("title",   TEXT | STORED);
        let f_content = builder.add_text_field("content", TEXT | STORED);
        let schema = builder.build();

        let index = Index::open_or_create(
            tantivy::directory::MmapDirectory::open(path)?,
            schema,
        )?;

        let writer = index.writer(50_000_000)?;
        let reader = index
            .reader_builder()
            .reload_policy(ReloadPolicy::OnCommitWithDelay)
            .try_into()?;

        let query_parser = QueryParser::for_index(&index, vec![f_title, f_content]);

        // Store reader in index for searching — we'll re-open per search call
        // (tantivy reader is cheap to clone)
        drop(reader);

        Ok(Self {
            index,
            writer: parking_lot::Mutex::new(writer),
            f_id,
            f_url,
            f_title,
            f_content,
            query_parser,
        })
    }

    pub fn add(&self, doc: &Document) -> Result<()> {
        let mut w = self.writer.lock();
        w.add_document(doc!(
            self.f_id      => doc.id.to_string(),
            self.f_url     => doc.url.clone(),
            self.f_title   => doc.title.clone(),
            self.f_content => doc.content.clone(),
        ))?;
        w.commit()?;
        Ok(())
    }

    pub fn search(&self, query_str: &str, top_k: usize) -> Result<Vec<SearchResult>> {
        let reader = self
            .index
            .reader_builder()
            .reload_policy(ReloadPolicy::Manual)
            .try_into()?;
        reader.reload()?;

        let searcher = reader.searcher();
        let query = self.query_parser.parse_query(query_str)?;
        let hits = searcher.search(&query, &TopDocs::with_limit(top_k))?;

        let mut results = Vec::with_capacity(hits.len());
        for (score, addr) in hits {
            let tdoc: TantivyDocument = searcher.doc(addr)?;
            let get = |f| {
                tdoc.get_first(f)
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string()
            };

            let content = get(self.f_content);
            let snippet = snippet(&content, query_str);

            results.push(SearchResult {
                id: Uuid::parse_str(&get(self.f_id)).unwrap_or_else(|_| Uuid::new_v4()),
                url: get(self.f_url),
                title: get(self.f_title),
                snippet,
                score,
            });
        }
        Ok(results)
    }
}

fn snippet(content: &str, query: &str) -> String {
    let lower = content.to_lowercase();
    let term = query.split_whitespace().next().unwrap_or("").to_lowercase();
    let start = lower.find(&term).unwrap_or(0).saturating_sub(60);
    let end = (start + 160).min(content.len());
    format!("...{}...", &content[start..end])
}
