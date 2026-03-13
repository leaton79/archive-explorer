use crate::db::Database;
use crate::models::{CuratedCollection, ExportItem, ExportJournalEntry};
use tauri::State;

// ── Settings ────────────────────────────────────────────────

#[tauri::command]
pub async fn get_setting(
    db: State<'_, Database>,
    key: String,
) -> Result<Option<String>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        rusqlite::params![key],
        |row| row.get(0),
    );

    match result {
        Ok(val) => Ok(Some(val)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn set_setting(
    db: State<'_, Database>,
    key: String,
    value: String,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Curated Collections ─────────────────────────────────────

#[tauri::command]
pub async fn get_curated_collections(
    db: State<'_, Database>,
) -> Result<Vec<CuratedCollection>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, media_type, collection_id, display_name, is_default, pinned, enabled
             FROM curated_collections ORDER BY media_type, display_name",
        )
        .map_err(|e| e.to_string())?;

    let collections: Vec<CuratedCollection> = stmt
        .query_map([], |row| {
            Ok(CuratedCollection {
                id: row.get(0)?,
                media_type: row.get(1)?,
                collection_id: row.get(2)?,
                display_name: row.get(3)?,
                is_default: row.get(4)?,
                pinned: row.get(5)?,
                enabled: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(collections)
}

#[tauri::command]
pub async fn get_pinned_collections(
    db: State<'_, Database>,
) -> Result<Vec<CuratedCollection>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, media_type, collection_id, display_name, is_default, pinned, enabled
             FROM curated_collections WHERE pinned = 1 AND enabled = 1",
        )
        .map_err(|e| e.to_string())?;

    let collections: Vec<CuratedCollection> = stmt
        .query_map([], |row| {
            Ok(CuratedCollection {
                id: row.get(0)?,
                media_type: row.get(1)?,
                collection_id: row.get(2)?,
                display_name: row.get(3)?,
                is_default: row.get(4)?,
                pinned: row.get(5)?,
                enabled: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(collections)
}

#[tauri::command]
pub async fn toggle_collection_pinned(
    db: State<'_, Database>,
    collection_id: i64,
    pinned: bool,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE curated_collections SET pinned = ?1 WHERE id = ?2",
        rusqlite::params![pinned, collection_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_collection_enabled(
    db: State<'_, Database>,
    collection_id: i64,
    enabled: bool,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE curated_collections SET enabled = ?1 WHERE id = ?2",
        rusqlite::params![enabled, collection_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Export ───────────────────────────────────────────────────

#[tauri::command]
pub async fn export_saved_items_json(db: State<'_, Database>) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, title, media_type, date, creator FROM items WHERE saved = 1 ORDER BY saved_at DESC")
        .map_err(|e| e.to_string())?;

    let items: Vec<(String, String, String, Option<String>, Option<String>)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut export_items = Vec::new();

    for (id, title, media_type, date, creator) in &items {
        // Get tags
        let mut tag_stmt = conn
            .prepare("SELECT t.name FROM tags t JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?1")
            .map_err(|e| e.to_string())?;
        let tags: Vec<String> = tag_stmt
            .query_map(rusqlite::params![id], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        // Get journal entries
        let mut je_stmt = conn
            .prepare("SELECT content, created_at FROM journal_entries WHERE item_id = ?1 ORDER BY created_at DESC")
            .map_err(|e| e.to_string())?;
        let entries: Vec<ExportJournalEntry> = je_stmt
            .query_map(rusqlite::params![id], |row| {
                Ok(ExportJournalEntry {
                    content: row.get(0)?,
                    created_at: row.get(1)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        export_items.push(ExportItem {
            id: id.clone(),
            title: title.clone(),
            archive_url: format!("https://archive.org/details/{}", id),
            media_type: media_type.clone(),
            date: date.clone(),
            creator: creator.clone(),
            tags,
            journal_entries: entries,
        });
    }

    let export = serde_json::json!({
        "export_version": "2.0",
        "exported_at": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string(),
        "source": "Archive Roulette v2",
        "item_count": export_items.len(),
        "items": export_items,
    });

    serde_json::to_string_pretty(&export).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn export_saved_items_markdown(db: State<'_, Database>) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, media_type, date, creator, collection FROM items WHERE saved = 1 ORDER BY saved_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let items: Vec<(String, String, String, Option<String>, Option<String>, Option<String>)> = stmt
        .query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut md = String::from("# Archive Roulette — Saved Items\n\n");
    md.push_str(&format!(
        "*Exported on {}*\n\n---\n\n",
        chrono::Utc::now().format("%B %d, %Y")
    ));

    for (id, title, media_type, date, creator, collection) in &items {
        md.push_str(&format!("## {}\n\n", title));
        md.push_str(&format!(
            "**Archive URL**: https://archive.org/details/{}\n",
            id
        ));
        md.push_str(&format!("**Media Type**: {}\n", media_type));
        if let Some(d) = date {
            md.push_str(&format!("**Date**: {}\n", d));
        }
        if let Some(c) = creator {
            md.push_str(&format!("**Creator**: {}\n", c));
        }
        if let Some(col) = collection {
            md.push_str(&format!("**Collection**: {}\n", col));
        }

        // Tags
        let mut tag_stmt = conn
            .prepare("SELECT t.name FROM tags t JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?1")
            .map_err(|e| e.to_string())?;
        let tags: Vec<String> = tag_stmt
            .query_map(rusqlite::params![id], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        if !tags.is_empty() {
            md.push_str(&format!("**Tags**: {}\n", tags.join(", ")));
        }

        // Journal entries
        let mut je_stmt = conn
            .prepare("SELECT content, created_at FROM journal_entries WHERE item_id = ?1 ORDER BY created_at ASC")
            .map_err(|e| e.to_string())?;
        let entries: Vec<(String, String)> = je_stmt
            .query_map(rusqlite::params![id], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        if !entries.is_empty() {
            md.push_str("\n### Journal Entries\n\n");
            for (content, created_at) in &entries {
                md.push_str(&format!("**{}**\n\n{}\n\n", created_at, content));
            }
        }

        md.push_str("\n---\n\n");
    }

    Ok(md)
}
