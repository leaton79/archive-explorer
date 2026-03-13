use crate::db::Database;
use serde::{Deserialize, Serialize};
use tauri::State;

// ── Models ──────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserCollection {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub item_count: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartFilter {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub filter_json: String,
    pub color: Option<String>,
    pub item_count: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartFilterCriteria {
    pub media_types: Vec<String>,
    pub tags: Vec<String>,
    pub tag_mode: String, // "any" or "all"
    pub year_start: Option<i64>,
    pub year_end: Option<i64>,
    pub has_notes: bool,
    pub keyword: Option<String>,
}

// ── User Collections CRUD ───────────────────────────────────

#[tauri::command]
pub async fn create_collection(
    db: State<'_, Database>,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<UserCollection, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO collections (name, description, color) VALUES (?1, ?2, ?3)",
        rusqlite::params![name, description, color],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let col = conn
        .query_row(
            "SELECT id, name, description, color, created_at FROM collections WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(UserCollection {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    color: row.get(3)?,
                    item_count: 0,
                    created_at: row.get(4)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(col)
}

#[tauri::command]
pub async fn update_collection(
    db: State<'_, Database>,
    collection_id: i64,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE collections SET name = ?1, description = ?2, color = ?3, updated_at = datetime('now') WHERE id = ?4",
        rusqlite::params![name, description, color, collection_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_collection(
    db: State<'_, Database>,
    collection_id: i64,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM item_collections WHERE collection_id = ?1",
        rusqlite::params![collection_id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM collections WHERE id = ?1",
        rusqlite::params![collection_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_collections(db: State<'_, Database>) -> Result<Vec<UserCollection>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.name, c.description, c.color, c.created_at,
                    (SELECT COUNT(*) FROM item_collections ic WHERE ic.collection_id = c.id) as item_count
             FROM collections c ORDER BY c.name",
        )
        .map_err(|e| e.to_string())?;

    let cols: Vec<UserCollection> = stmt
        .query_map([], |row| {
            Ok(UserCollection {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                color: row.get(3)?,
                created_at: row.get(4)?,
                item_count: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(cols)
}

// ── Item-Collection Assignment ──────────────────────────────

#[tauri::command]
pub async fn add_item_to_collection(
    db: State<'_, Database>,
    item_id: String,
    collection_id: i64,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO item_collections (item_id, collection_id) VALUES (?1, ?2)",
        rusqlite::params![item_id, collection_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn remove_item_from_collection(
    db: State<'_, Database>,
    item_id: String,
    collection_id: i64,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM item_collections WHERE item_id = ?1 AND collection_id = ?2",
        rusqlite::params![item_id, collection_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_item_collections(
    db: State<'_, Database>,
    item_id: String,
) -> Result<Vec<i64>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT collection_id FROM item_collections WHERE item_id = ?1")
        .map_err(|e| e.to_string())?;

    let ids: Vec<i64> = stmt
        .query_map(rusqlite::params![item_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ids)
}

#[tauri::command]
pub async fn get_items_in_collection(
    db: State<'_, Database>,
    collection_id: i64,
) -> Result<Vec<String>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT item_id FROM item_collections WHERE collection_id = ?1")
        .map_err(|e| e.to_string())?;

    let ids: Vec<String> = stmt
        .query_map(rusqlite::params![collection_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ids)
}

// ── Bulk Operations ─────────────────────────────────────────

#[tauri::command]
pub async fn bulk_add_to_collection(
    db: State<'_, Database>,
    item_ids: Vec<String>,
    collection_id: i64,
) -> Result<i64, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut count = 0i64;
    for item_id in &item_ids {
        let result = conn.execute(
            "INSERT OR IGNORE INTO item_collections (item_id, collection_id) VALUES (?1, ?2)",
            rusqlite::params![item_id, collection_id],
        );
        if let Ok(n) = result {
            count += n as i64;
        }
    }
    Ok(count)
}

#[tauri::command]
pub async fn bulk_add_tags(
    db: State<'_, Database>,
    item_ids: Vec<String>,
    tag_names: Vec<String>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    for tag_name in &tag_names {
        let trimmed = tag_name.trim();
        if trimmed.is_empty() {
            continue;
        }
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

        for item_id in &item_ids {
            conn.execute(
                "INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?1, ?2)",
                rusqlite::params![item_id, tag_id],
            )
            .ok();
        }
    }
    Ok(())
}

// ── Smart Filters ───────────────────────────────────────────

#[tauri::command]
pub async fn create_smart_filter(
    db: State<'_, Database>,
    name: String,
    description: Option<String>,
    filter_json: String,
    color: Option<String>,
) -> Result<SmartFilter, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO smart_filters (name, description, filter_json, color) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![name, description, filter_json, color],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(SmartFilter {
        id,
        name,
        description,
        filter_json,
        color,
        item_count: 0,
        created_at: chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string(),
    })
}

#[tauri::command]
pub async fn delete_smart_filter(
    db: State<'_, Database>,
    filter_id: i64,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM smart_filters WHERE id = ?1",
        rusqlite::params![filter_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_smart_filters(db: State<'_, Database>) -> Result<Vec<SmartFilter>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, description, filter_json, color, created_at FROM smart_filters ORDER BY name")
        .map_err(|e| e.to_string())?;

    let filters: Vec<SmartFilter> = stmt
        .query_map([], |row| {
            Ok(SmartFilter {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                filter_json: row.get(3)?,
                color: row.get(4)?,
                item_count: 0, // computed client-side
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(filters)
}

// ── Add Curated Collection ──────────────────────────────────

#[tauri::command]
pub async fn add_curated_collection(
    db: State<'_, Database>,
    media_type: String,
    collection_id: String,
    display_name: Option<String>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO curated_collections (media_type, collection_id, display_name, is_default, pinned, enabled)
         VALUES (?1, ?2, ?3, 0, 0, 1)",
        rusqlite::params![media_type, collection_id, display_name],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn remove_curated_collection(
    db: State<'_, Database>,
    id: i64,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    // Only allow removing user-added collections
    conn.execute(
        "DELETE FROM curated_collections WHERE id = ?1 AND is_default = 0",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
