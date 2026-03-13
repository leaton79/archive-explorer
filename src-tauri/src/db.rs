use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let db_path = Self::db_path()?;

        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(&db_path)?;

        // Enable WAL mode and foreign keys
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA foreign_keys=ON;
             PRAGMA busy_timeout=5000;"
        )?;

        // Run migrations
        Self::run_migrations(&conn)?;

        Ok(Database {
            conn: Mutex::new(conn),
        })
    }

    fn db_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
        let base = dirs::data_dir()
            .ok_or("Could not determine application data directory")?;
        Ok(base.join("com.archive-roulette.app").join("archive_roulette.db"))
    }

    fn run_migrations(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
        // Check current schema version
        let version: i64 = conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap_or(0);

        if version < 1 {
            let migration = include_str!("../migrations/001_initial.sql");
            conn.execute_batch(migration)?;
            conn.execute_batch("PRAGMA user_version = 1;")?;
        }

        Ok(())
    }
}
