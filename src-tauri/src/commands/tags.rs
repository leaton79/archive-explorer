use crate::db::Database;
use crate::models::Tag;
use tauri::State;

/// Get all tags with usage counts.
#[tauri::command]
pub async fn get_all_tags(db: State<'_, Database>) -> Result<Vec<Tag>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name FROM tags ORDER BY name COLLATE NOCASE")
        .map_err(|e| e.to_string())?;

    let tags: Vec<Tag> = stmt
        .query_map([], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(tags)
}

/// Get tags for a specific item.
#[tauri::command]
pub async fn get_item_tags(db: State<'_, Database>, item_id: String) -> Result<Vec<Tag>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name FROM tags t
             JOIN item_tags it ON t.id = it.tag_id
             WHERE it.item_id = ?1
             ORDER BY t.name COLLATE NOCASE",
        )
        .map_err(|e| e.to_string())?;

    let tags: Vec<Tag> = stmt
        .query_map(rusqlite::params![item_id], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(tags)
}

/// Add a tag to an item (creates tag if it doesn't exist).
#[tauri::command]
pub async fn add_tag_to_item(
    db: State<'_, Database>,
    item_id: String,
    tag_name: String,
) -> Result<Tag, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let trimmed = tag_name.trim();
    if trimmed.is_empty() {
        return Err("Tag name cannot be empty".to_string());
    }

    conn.execute(
        "INSERT OR IGNORE INTO tags (name) VALUES (?1)",
        rusqlite::params![trimmed],
    )
    .map_err(|e| e.to_string())?;

    let tag: Tag = conn
        .query_row(
            "SELECT id, name FROM tags WHERE name = ?1 COLLATE NOCASE",
            rusqlite::params![trimmed],
            |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?1, ?2)",
        rusqlite::params![item_id, tag.id],
    )
    .map_err(|e| e.to_string())?;

    Ok(tag)
}

/// Remove a tag from an item.
#[tauri::command]
pub async fn remove_tag_from_item(
    db: State<'_, Database>,
    item_id: String,
    tag_id: i64,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM item_tags WHERE item_id = ?1 AND tag_id = ?2",
        rusqlite::params![item_id, tag_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Autocomplete: search tags by prefix.
#[tauri::command]
pub async fn search_tags(db: State<'_, Database>, prefix: String) -> Result<Vec<Tag>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name FROM tags WHERE name LIKE ?1 ORDER BY name COLLATE NOCASE LIMIT 10",
        )
        .map_err(|e| e.to_string())?;

    let tags: Vec<Tag> = stmt
        .query_map(rusqlite::params![format!("{}%", prefix)], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(tags)
}
