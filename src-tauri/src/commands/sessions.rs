use crate::db::Database;
use crate::models::Session;
use tauri::State;

/// Start a new passive session (called on app launch).
#[tauri::command]
pub async fn start_session(db: State<'_, Database>) -> Result<i64, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO sessions (started_at) VALUES (datetime('now'))",
        [],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    Ok(id)
}

/// End a session (called on app close / window hide).
#[tauri::command]
pub async fn end_session(db: State<'_, Database>, session_id: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Count items seen and saved during this session
    let items_seen: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM session_items WHERE session_id = ?1 AND action = 'seen'",
            rusqlite::params![session_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let items_saved: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM session_items WHERE session_id = ?1 AND action = 'saved'",
            rusqlite::params![session_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    conn.execute(
        "UPDATE sessions SET ended_at = datetime('now'), items_seen = ?1, items_saved = ?2 WHERE id = ?3",
        rusqlite::params![items_seen, items_saved, session_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Record that an item was seen during a session.
#[tauri::command]
pub async fn record_session_item(
    db: State<'_, Database>,
    session_id: i64,
    item_id: String,
    action: String,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO session_items (session_id, item_id, action) VALUES (?1, ?2, ?3)",
        rusqlite::params![session_id, item_id, action],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Get recent sessions.
#[tauri::command]
pub async fn get_sessions(
    db: State<'_, Database>,
    limit: Option<i64>,
) -> Result<Vec<Session>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(20);
    let mut stmt = conn
        .prepare(
            "SELECT id, started_at, ended_at, items_seen, items_saved
             FROM sessions ORDER BY started_at DESC LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let sessions: Vec<Session> = stmt
        .query_map(rusqlite::params![limit], |row| {
            Ok(Session {
                id: row.get(0)?,
                started_at: row.get(1)?,
                ended_at: row.get(2)?,
                items_seen: row.get(3)?,
                items_saved: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(sessions)
}
