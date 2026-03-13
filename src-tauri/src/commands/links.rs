use crate::db::Database;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemLink {
    pub id: i64,
    pub source_item_id: String,
    pub target_item_id: String,
    pub label: Option<String>,
    pub created_at: String,
    // Denormalized fields for display
    pub target_title: Option<String>,
    pub target_media_type: Option<String>,
    pub target_thumbnail_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub title: String,
    pub media_type: String,
    pub thumbnail_url: Option<String>,
    pub link_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

/// Create a bidirectional link between two items.
#[tauri::command]
pub async fn create_item_link(
    db: State<'_, Database>,
    source_item_id: String,
    target_item_id: String,
    label: Option<String>,
) -> Result<(), String> {
    if source_item_id == target_item_id {
        return Err("Cannot link an item to itself".to_string());
    }

    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO item_links (source_item_id, target_item_id, label) VALUES (?1, ?2, ?3)",
        rusqlite::params![source_item_id, target_item_id, label],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Remove a link by ID.
#[tauri::command]
pub async fn delete_item_link(db: State<'_, Database>, link_id: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM item_links WHERE id = ?1",
        rusqlite::params![link_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Get all links for an item (both directions).
#[tauri::command]
pub async fn get_item_links(
    db: State<'_, Database>,
    item_id: String,
) -> Result<Vec<ItemLink>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT l.id, l.source_item_id, l.target_item_id, l.label, l.created_at,
                    i.title, i.media_type, i.thumbnail_url
             FROM item_links l
             LEFT JOIN items i ON i.id = CASE
                WHEN l.source_item_id = ?1 THEN l.target_item_id
                ELSE l.source_item_id
             END
             WHERE l.source_item_id = ?1 OR l.target_item_id = ?1
             ORDER BY l.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let links: Vec<ItemLink> = stmt
        .query_map(rusqlite::params![item_id], |row| {
            Ok(ItemLink {
                id: row.get(0)?,
                source_item_id: row.get(1)?,
                target_item_id: row.get(2)?,
                label: row.get(3)?,
                created_at: row.get(4)?,
                target_title: row.get(5)?,
                target_media_type: row.get(6)?,
                target_thumbnail_url: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(links)
}

/// Get the full connection graph for all saved items that have links.
#[tauri::command]
pub async fn get_connection_graph(db: State<'_, Database>) -> Result<GraphData, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Get all edges
    let mut edge_stmt = conn
        .prepare("SELECT source_item_id, target_item_id, label FROM item_links")
        .map_err(|e| e.to_string())?;

    let edges: Vec<GraphEdge> = edge_stmt
        .query_map([], |row| {
            Ok(GraphEdge {
                source: row.get(0)?,
                target: row.get(1)?,
                label: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Collect unique node IDs
    let mut node_ids = std::collections::HashSet::new();
    for edge in &edges {
        node_ids.insert(edge.source.clone());
        node_ids.insert(edge.target.clone());
    }

    // Fetch node data
    let mut nodes = Vec::new();
    for nid in &node_ids {
        let result = conn.query_row(
            "SELECT id, title, media_type, thumbnail_url FROM items WHERE id = ?1",
            rusqlite::params![nid],
            |row| {
                Ok(GraphNode {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    media_type: row.get(2)?,
                    thumbnail_url: row.get(3)?,
                    link_count: 0,
                })
            },
        );
        if let Ok(mut node) = result {
            // Count links for this node
            node.link_count = edges
                .iter()
                .filter(|e| e.source == node.id || e.target == node.id)
                .count() as i64;
            nodes.push(node);
        }
    }

    Ok(GraphData { nodes, edges })
}
