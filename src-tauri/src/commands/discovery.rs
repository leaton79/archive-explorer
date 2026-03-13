use crate::archive_api::{value_to_string, ArchiveApi};
use crate::db::Database;
use crate::models::{DiscoveryFilters, Item};
use crate::quality_filter::is_quality_title;
use rand::prelude::*;
use tauri::State;

/// Fetch a random high-quality item from the Archive.
#[tauri::command]
pub async fn discover_random_item(
    db: State<'_, Database>,
    api: State<'_, ArchiveApi>,
    filters: DiscoveryFilters,
) -> Result<Item, String> {
    let max_retries = 5;

    for _attempt in 0..max_retries {
        // Determine which collection to search
        let collection_override = if filters.media_type.as_deref() == Some("all")
            || filters.media_type.is_none()
        {
            // Pick a random curated collection
            pick_random_curated_collection(&db)?
        } else {
            None
        };

        let query =
            ArchiveApi::build_query(&filters, collection_override.as_deref());

        // Fetch candidates
        let docs = api.search(&query, 100).await?;

        // Load seen history for duplicate avoidance
        let seen_ids = get_seen_ids(&db)?;

        // Filter for quality + uniqueness
        for doc in &docs {
            let identifier = match &doc.identifier {
                Some(id) => id.clone(),
                None => continue,
            };

            let title = match doc.title.as_ref().and_then(value_to_string) {
                Some(t) => t,
                None => continue,
            };

            if !is_quality_title(&title) {
                continue;
            }

            if seen_ids.contains(&identifier) {
                continue;
            }

            let media_type = doc
                .mediatype
                .clone()
                .unwrap_or_else(|| "unknown".to_string());

            let date = doc.date.clone();
            let year = doc
                .year
                .as_ref()
                .and_then(|v| match v {
                    serde_json::Value::Number(n) => n.as_i64(),
                    serde_json::Value::String(s) => s.parse::<i64>().ok(),
                    _ => None,
                });
            let creator = doc.creator.as_ref().and_then(value_to_string);
            let collection = doc.collection.as_ref().and_then(value_to_string);
            let language = doc.language.as_ref().and_then(value_to_string);
            let description = doc.description.as_ref().and_then(value_to_string);
            let thumbnail_url =
                Some(format!("https://archive.org/services/img/{}", identifier));

            // Fetch full metadata
            let metadata = api.metadata(&identifier).await.ok();
            let metadata_json =
                metadata.as_ref().and_then(|m| serde_json::to_string(m).ok());

            let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

            let item = Item {
                id: identifier.clone(),
                title,
                description,
                media_type,
                date,
                year,
                creator,
                collection,
                language,
                thumbnail_url,
                archive_url: format!("https://archive.org/details/{}", identifier),
                metadata_json,
                saved: false,
                saved_at: None,
                first_seen_at: now.clone(),
                updated_at: now,
            };

            // Record in DB as seen (not saved)
            record_item_seen(&db, &item)?;

            return Ok(item);
        }

        // Brief pause before retry (courtesy to Archive.org)
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }

    Err("Could not find a suitable item after multiple attempts. Try adjusting your filters.".to_string())
}

/// Fetch metadata for a specific item by identifier.
#[tauri::command]
pub async fn fetch_item_metadata(
    _db: State<'_, Database>,
    api: State<'_, ArchiveApi>,
    identifier: String,
) -> Result<Item, String> {
    let metadata = api.metadata(&identifier).await?;
    let meta_inner = metadata.metadata.as_ref().ok_or("No metadata found")?;

    let title = meta_inner
        .title
        .clone()
        .unwrap_or_else(|| identifier.clone());
    let media_type = meta_inner
        .mediatype
        .clone()
        .unwrap_or_else(|| "unknown".to_string());
    let description = meta_inner
        .description
        .as_ref()
        .and_then(value_to_string);
    let date = meta_inner.date.clone();
    let year = meta_inner
        .year
        .as_ref()
        .and_then(|v| match v {
            serde_json::Value::Number(n) => n.as_i64(),
            serde_json::Value::String(s) => s.parse::<i64>().ok(),
            _ => None,
        });
    let creator = meta_inner.creator.as_ref().and_then(value_to_string);
    let collection = meta_inner.collection.as_ref().and_then(value_to_string);
    let language = meta_inner.language.as_ref().and_then(value_to_string);

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let metadata_json = serde_json::to_string(&metadata).ok();

    let item = Item {
        id: identifier.clone(),
        title,
        description,
        media_type,
        date,
        year,
        creator,
        collection,
        language,
        thumbnail_url: Some(format!(
            "https://archive.org/services/img/{}",
            identifier
        )),
        archive_url: format!("https://archive.org/details/{}", identifier),
        metadata_json,
        saved: false,
        saved_at: None,
        first_seen_at: now.clone(),
        updated_at: now,
    };

    Ok(item)
}

// ── Helpers ─────────────────────────────────────────────────

fn pick_random_curated_collection(db: &State<'_, Database>) -> Result<Option<String>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT collection_id, media_type FROM curated_collections WHERE enabled = 1")
        .map_err(|e| e.to_string())?;

    let collections: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    if collections.is_empty() {
        return Ok(None);
    }

    let mut rng = rand::thread_rng();
    let (col_id, _media_type) = collections.choose(&mut rng).unwrap();
    Ok(Some(col_id.clone()))
}

fn get_seen_ids(db: &State<'_, Database>) -> Result<std::collections::HashSet<String>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT item_id FROM seen_history")
        .map_err(|e| e.to_string())?;

    let ids: std::collections::HashSet<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ids)
}

fn record_item_seen(db: &State<'_, Database>, item: &Item) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Upsert item as seen (not saved)
    conn.execute(
        "INSERT INTO items (id, title, description, media_type, date, year, creator, collection, language, thumbnail_url, metadata_json, saved)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 0)
         ON CONFLICT(id) DO UPDATE SET
           metadata_json = COALESCE(excluded.metadata_json, items.metadata_json),
           updated_at = datetime('now')",
        rusqlite::params![
            item.id,
            item.title,
            item.description,
            item.media_type,
            item.date,
            item.year,
            item.creator,
            item.collection,
            item.language,
            item.thumbnail_url,
            item.metadata_json,
        ],
    )
    .map_err(|e| e.to_string())?;

    // Add to seen history
    conn.execute(
        "INSERT OR REPLACE INTO seen_history (item_id, seen_at) VALUES (?1, datetime('now'))",
        rusqlite::params![item.id],
    )
    .map_err(|e| e.to_string())?;

    // Prune seen history if over 500
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM seen_history", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if count > 500 {
        conn.execute(
            "DELETE FROM seen_history WHERE item_id IN (
                SELECT item_id FROM seen_history ORDER BY seen_at ASC LIMIT ?1
            )",
            rusqlite::params![count - 400],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
