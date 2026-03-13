use crate::db::Database;
use crate::models::{Item, JournalEntry, SavedItemSummary};
use tauri::State;

/// Save an item (mark as saved).
#[tauri::command]
pub async fn save_item(
    db: State<'_, Database>,
    item_id: String,
    tag_names: Vec<String>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE items SET saved = 1, saved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1",
        rusqlite::params![item_id],
    )
    .map_err(|e| e.to_string())?;

    // Add tags
    for tag_name in &tag_names {
        let trimmed = tag_name.trim();
        if trimmed.is_empty() {
            continue;
        }
        // Upsert tag
        conn.execute(
            "INSERT OR IGNORE INTO tags (name) VALUES (?1)",
            rusqlite::params![trimmed],
        )
        .map_err(|e| e.to_string())?;

        let tag_id: i64 = conn
            .query_row(
                "SELECT id FROM tags WHERE name = ?1 COLLATE NOCASE",
                rusqlite::params![trimmed],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?1, ?2)",
            rusqlite::params![item_id, tag_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Unsave an item (keep in DB but mark as not saved).
#[tauri::command]
pub async fn unsave_item(db: State<'_, Database>, item_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE items SET saved = 0, saved_at = NULL, updated_at = datetime('now') WHERE id = ?1",
        rusqlite::params![item_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Check if a specific item is saved.
#[tauri::command]
pub async fn is_item_saved(db: State<'_, Database>, item_id: String) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let saved: bool = conn
        .query_row(
            "SELECT saved FROM items WHERE id = ?1",
            rusqlite::params![item_id],
            |row| row.get(0),
        )
        .unwrap_or(false);
    Ok(saved)
}

/// Get all saved items with summary info.
#[tauri::command]
pub async fn get_saved_items(
    db: State<'_, Database>,
    search_query: Option<String>,
    media_type_filter: Option<String>,
    tag_filter: Option<String>,
) -> Result<Vec<SavedItemSummary>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut sql = String::from(
        "SELECT i.id, i.title, i.media_type, i.date, i.thumbnail_url, i.archive_url, i.saved_at,
                (SELECT COUNT(*) FROM journal_entries je WHERE je.item_id = i.id) as note_count
         FROM items i
         WHERE i.saved = 1"
    );
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    // Search — use LIKE for reliability (FTS can miss items not in index)
    if let Some(q) = &search_query {
        if !q.trim().is_empty() {
            let like_pattern = format!("%{}%", q.trim());
            sql.push_str(
                " AND (i.title LIKE ?1 COLLATE NOCASE
                   OR i.description LIKE ?1 COLLATE NOCASE
                   OR i.creator LIKE ?1 COLLATE NOCASE
                   OR i.id IN (SELECT je.item_id FROM journal_entries je WHERE je.content LIKE ?1 COLLATE NOCASE)
                   OR i.id IN (SELECT it.item_id FROM item_tags it JOIN tags t ON t.id = it.tag_id WHERE t.name LIKE ?1 COLLATE NOCASE))"
            );
            params.push(Box::new(like_pattern));
        }
    }

    if let Some(mt) = &media_type_filter {
        if !mt.is_empty() && mt != "all" {
            let idx = params.len() + 1;
            sql.push_str(&format!(" AND i.media_type = ?{}", idx));
            params.push(Box::new(mt.clone()));
        }
    }

    if let Some(tag) = &tag_filter {
        if !tag.is_empty() {
            let idx = params.len() + 1;
            sql.push_str(&format!(
                " AND i.id IN (SELECT it.item_id FROM item_tags it JOIN tags t ON t.id = it.tag_id WHERE t.name = ?{} COLLATE NOCASE)",
                idx
            ));
            params.push(Box::new(tag.clone()));
        }
    }

    sql.push_str(" ORDER BY i.saved_at DESC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let rows = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(SavedItemSummary {
                id: row.get(0)?,
                title: row.get(1)?,
                media_type: row.get(2)?,
                date: row.get(3)?,
                thumbnail_url: row.get(4)?,
                archive_url: row.get(5)?,
                saved_at: row.get(6)?,
                tag_names: Vec::new(), // filled below
                note_count: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items: Vec<SavedItemSummary> = rows.filter_map(|r| r.ok()).collect();

    // Fill in tag names for each item
    for item in &mut items {
        let mut tag_stmt = conn
            .prepare(
                "SELECT t.name FROM tags t JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?1 ORDER BY t.name",
            )
            .map_err(|e| e.to_string())?;
        item.tag_names = tag_stmt
            .query_map(rusqlite::params![item.id], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
    }

    Ok(items)
}

/// Get a single item with full detail.
#[tauri::command]
pub async fn get_item(db: State<'_, Database>, item_id: String) -> Result<Option<Item>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT id, title, description, media_type, date, year, creator, collection, language,
                thumbnail_url, archive_url, metadata_json, saved, saved_at, first_seen_at, updated_at
         FROM items WHERE id = ?1",
        rusqlite::params![item_id],
        |row| {
            Ok(Item {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                media_type: row.get(3)?,
                date: row.get(4)?,
                year: row.get(5)?,
                creator: row.get(6)?,
                collection: row.get(7)?,
                language: row.get(8)?,
                thumbnail_url: row.get(9)?,
                archive_url: row.get(10)?,
                metadata_json: row.get(11)?,
                saved: row.get(12)?,
                saved_at: row.get(13)?,
                first_seen_at: row.get(14)?,
                updated_at: row.get(15)?,
            })
        },
    );

    match result {
        Ok(item) => Ok(Some(item)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

// ── Journal Entries ─────────────────────────────────────────

#[tauri::command]
pub async fn add_journal_entry(
    db: State<'_, Database>,
    item_id: String,
    content: String,
) -> Result<JournalEntry, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO journal_entries (item_id, content) VALUES (?1, ?2)",
        rusqlite::params![item_id, content],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    let entry = conn
        .query_row(
            "SELECT id, item_id, content, created_at, updated_at FROM journal_entries WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(JournalEntry {
                    id: row.get(0)?,
                    item_id: row.get(1)?,
                    content: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(entry)
}

#[tauri::command]
pub async fn update_journal_entry(
    db: State<'_, Database>,
    entry_id: i64,
    content: String,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE journal_entries SET content = ?1, updated_at = datetime('now') WHERE id = ?2",
        rusqlite::params![content, entry_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_journal_entry(db: State<'_, Database>, entry_id: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM journal_entries WHERE id = ?1",
        rusqlite::params![entry_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_journal_entries(
    db: State<'_, Database>,
    item_id: String,
) -> Result<Vec<JournalEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, item_id, content, created_at, updated_at
             FROM journal_entries WHERE item_id = ?1 ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let entries: Vec<JournalEntry> = stmt
        .query_map(rusqlite::params![item_id], |row| {
            Ok(JournalEntry {
                id: row.get(0)?,
                item_id: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(entries)
}
