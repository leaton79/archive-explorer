use serde::{Deserialize, Serialize};

// ── Item ────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub media_type: String,
    pub date: Option<String>,
    pub year: Option<i64>,
    pub creator: Option<String>,
    pub collection: Option<String>,
    pub language: Option<String>,
    pub thumbnail_url: Option<String>,
    pub archive_url: String,
    pub metadata_json: Option<String>,
    pub saved: bool,
    pub saved_at: Option<String>,
    pub first_seen_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedItemSummary {
    pub id: String,
    pub title: String,
    pub media_type: String,
    pub date: Option<String>,
    pub thumbnail_url: Option<String>,
    pub archive_url: String,
    pub saved_at: Option<String>,
    pub tag_names: Vec<String>,
    pub note_count: i64,
}

// ── Journal ─────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalEntry {
    pub id: i64,
    pub item_id: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

// ── Tags ────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: i64,
    pub name: String,
}

// ── Session ─────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: i64,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub items_seen: i64,
    pub items_saved: i64,
}

// ── Curated Collection ──────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CuratedCollection {
    pub id: i64,
    pub media_type: String,
    pub collection_id: String,
    pub display_name: Option<String>,
    pub is_default: bool,
    pub pinned: bool,
    pub enabled: bool,
}

// ── Archive.org API Responses ───────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ArchiveSearchResponse {
    pub response: ArchiveSearchResponseInner,
}

#[derive(Debug, Deserialize)]
pub struct ArchiveSearchResponseInner {
    #[serde(rename = "numFound")]
    pub num_found: i64,
    pub start: i64,
    pub docs: Vec<ArchiveSearchDoc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ArchiveSearchDoc {
    pub identifier: Option<String>,
    pub title: Option<serde_json::Value>,
    pub description: Option<serde_json::Value>,
    pub mediatype: Option<String>,
    pub date: Option<String>,
    pub year: Option<serde_json::Value>,
    pub collection: Option<serde_json::Value>,
    pub creator: Option<serde_json::Value>,
    pub subject: Option<serde_json::Value>,
    pub language: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ArchiveMetadata {
    pub metadata: Option<ArchiveMetadataInner>,
    pub files: Option<Vec<ArchiveFile>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ArchiveMetadataInner {
    pub identifier: Option<String>,
    pub title: Option<String>,
    pub description: Option<serde_json::Value>,
    pub mediatype: Option<String>,
    pub date: Option<String>,
    pub year: Option<serde_json::Value>,
    pub collection: Option<serde_json::Value>,
    pub creator: Option<serde_json::Value>,
    pub subject: Option<serde_json::Value>,
    pub language: Option<serde_json::Value>,
    pub runtime: Option<String>,
    pub sound_type: Option<String>,
    pub color: Option<String>,
    pub isbn: Option<serde_json::Value>,
    pub issn: Option<serde_json::Value>,
    pub lccn: Option<String>,
    pub oclc: Option<serde_json::Value>,
    pub publisher: Option<serde_json::Value>,
    pub contributor: Option<serde_json::Value>,
    pub sponsor: Option<serde_json::Value>,
    pub licenseurl: Option<String>,
    pub rights: Option<String>,
    pub source: Option<String>,
    pub notes: Option<serde_json::Value>,
    pub addeddate: Option<String>,
    pub publicdate: Option<String>,
    pub scanner: Option<String>,
    #[serde(rename = "scanningcenter")]
    pub scanning_center: Option<String>,
    pub ppi: Option<serde_json::Value>,
    pub ocr: Option<serde_json::Value>,
    pub downloads: Option<serde_json::Value>,
    pub num_reviews: Option<serde_json::Value>,
    pub avg_rating: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ArchiveFile {
    pub name: Option<String>,
    pub format: Option<String>,
    pub size: Option<String>,
    pub source: Option<String>,
}

// ── Filters ─────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DiscoveryFilters {
    pub media_type: Option<String>,
    pub year_start: Option<i64>,
    pub year_end: Option<i64>,
    pub language: Option<String>,
    pub query: Option<String>,
    pub collection: Option<String>,
}

// ── Export ───────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct ExportItem {
    pub id: String,
    pub title: String,
    pub archive_url: String,
    pub media_type: String,
    pub date: Option<String>,
    pub creator: Option<String>,
    pub tags: Vec<String>,
    pub journal_entries: Vec<ExportJournalEntry>,
}

#[derive(Debug, Serialize)]
pub struct ExportJournalEntry {
    pub content: String,
    pub created_at: String,
}
