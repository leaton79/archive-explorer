use crate::archive_api::{value_to_string, ArchiveApi};
use crate::db::Database;
use crate::models::DiscoveryFilters;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub media_type: String,
    pub date: Option<String>,
    pub creator: Option<String>,
    pub collection: Option<String>,
    pub thumbnail_url: String,
    pub archive_url: String,
    pub is_saved: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    pub total_found: i64,
    pub page: i64,
}

/// Search Archive.org with specific query and pagination.
#[tauri::command]
pub async fn search_archive(
    db: State<'_, Database>,
    api: State<'_, ArchiveApi>,
    query: String,
    media_type: Option<String>,
    year_start: Option<i64>,
    year_end: Option<i64>,
    language: Option<String>,
    sort: Option<String>,
    page: Option<i64>,
) -> Result<SearchResponse, String> {
    let page = page.unwrap_or(0);
    let rows = 50;
    let offset = page * rows;

    let filters = DiscoveryFilters {
        media_type,
        year_start,
        year_end,
        language,
        query: Some(query),
        collection: None,
    };

    let query_str = ArchiveApi::build_query(&filters, None);
    let sort_str = sort.unwrap_or_else(|| "downloads desc".to_string());

    // Build URL directly for the targeted search
    let url = format!(
        "https://archive.org/advancedsearch.php?q={}&output=json&rows={}&start={}&fl=identifier,title,description,mediatype,date,year,collection,creator,language&sort={}",
        urlencoding::encode(&query_str),
        rows,
        offset,
        urlencoding::encode(&sort_str)
    );

    let client = reqwest::Client::builder()
        .user_agent("ArchiveRoulette/0.1 (desktop app; educational)")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let data: crate::models::ArchiveSearchResponse = resp.json().await.map_err(|e| e.to_string())?;

    let total_found = data.response.num_found;

    // Check which items are already saved
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for doc in &data.response.docs {
        let id = match &doc.identifier {
            Some(id) => id.clone(),
            None => continue,
        };

        let title = match doc.title.as_ref().and_then(value_to_string) {
            Some(t) => t,
            None => continue,
        };

        let is_saved: bool = conn
            .query_row(
                "SELECT saved FROM items WHERE id = ?1",
                rusqlite::params![id],
                |row| row.get(0),
            )
            .unwrap_or(false);

        results.push(SearchResult {
            thumbnail_url: format!("https://archive.org/services/img/{}", id),
            archive_url: format!("https://archive.org/details/{}", id),
            id,
            title,
            description: doc.description.as_ref().and_then(value_to_string),
            media_type: doc.mediatype.clone().unwrap_or_else(|| "unknown".to_string()),
            date: doc.date.clone(),
            creator: doc.creator.as_ref().and_then(value_to_string),
            collection: doc.collection.as_ref().and_then(value_to_string),
            is_saved,
        });
    }

    Ok(SearchResponse {
        results,
        total_found,
        page,
    })
}
