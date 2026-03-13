use crate::models::{ArchiveMetadata, ArchiveSearchDoc, ArchiveSearchResponse, DiscoveryFilters};
use rand::prelude::*;
use reqwest::Client;

const SEARCH_URL: &str = "https://archive.org/advancedsearch.php";
const METADATA_URL: &str = "https://archive.org/metadata";

const SORT_ORDERS: &[&str] = &[
    "downloads desc",
    "date desc",
    "date asc",
    "titleSorter asc",
    "titleSorter desc",
    "addeddate desc",
    "avg_rating desc",
    "num_reviews desc",
];

pub struct ArchiveApi {
    client: Client,
}

impl ArchiveApi {
    pub fn new() -> Self {
        let client = Client::builder()
            .user_agent("ArchiveRoulette/0.1 (desktop app; educational)")
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .expect("Failed to build HTTP client");
        ArchiveApi { client }
    }

    /// Build a search query string from filters.
    pub fn build_query(filters: &DiscoveryFilters, collection_override: Option<&str>) -> String {
        let mut parts = Vec::new();

        if let Some(col) = collection_override {
            parts.push(format!("collection:{}", col));
        } else if let Some(col) = &filters.collection {
            if !col.is_empty() {
                parts.push(format!("collection:{}", col));
            }
        }

        if let Some(mt) = &filters.media_type {
            if mt != "all" && !mt.is_empty() {
                if mt.starts_with("collection:") {
                    parts.push(mt.clone());
                } else {
                    parts.push(format!("mediatype:{}", mt));
                }
            }
        }

        if let (Some(start), Some(end)) = (filters.year_start, filters.year_end) {
            parts.push(format!("year:[{} TO {}]", start, end));
        } else if let Some(start) = filters.year_start {
            parts.push(format!("year:[{} TO 2030]", start));
        } else if let Some(end) = filters.year_end {
            parts.push(format!("year:[1800 TO {}]", end));
        }

        if let Some(lang) = &filters.language {
            if !lang.is_empty() {
                parts.push(format!("language:{}", lang));
            }
        }

        if let Some(q) = &filters.query {
            if !q.trim().is_empty() {
                parts.push(format!("({})", q.trim()));
            }
        }

        if parts.is_empty() {
            "title:* AND downloads:[1 TO *]".to_string()
        } else {
            parts.join(" AND ")
        }
    }

    /// Fetch search results with a random offset and sort order.
    pub async fn search(
        &self,
        query: &str,
        rows: u32,
    ) -> Result<Vec<ArchiveSearchDoc>, String> {
        // Compute random values in a block so rng is dropped before the await
        let (sort, offset) = {
            let mut rng = rand::thread_rng();
            let sort = SORT_ORDERS
                .choose(&mut rng)
                .unwrap_or(&"downloads desc")
                .to_string();
            let offset = Self::random_offset(&mut rng);
            (sort, offset)
        };

        let url = format!(
            "{}?q={}&output=json&rows={}&start={}&fl=identifier,title,description,mediatype,date,year,collection,creator,subject,language&sort={}",
            SEARCH_URL,
            urlencoding::encode(query),
            rows,
            offset,
            urlencoding::encode(&sort)
        );

        let resp = self.client.get(&url).send().await.map_err(|e| e.to_string())?;
        let data: ArchiveSearchResponse = resp.json().await.map_err(|e| e.to_string())?;
        Ok(data.response.docs)
    }

    /// Fetch full metadata for a single item.
    pub async fn metadata(&self, identifier: &str) -> Result<ArchiveMetadata, String> {
        let url = format!("{}/{}", METADATA_URL, identifier);
        let resp = self.client.get(&url).send().await.map_err(|e| e.to_string())?;
        resp.json().await.map_err(|e| e.to_string())
    }

    /// Pick a random offset using one of several strategies.
    fn random_offset(rng: &mut ThreadRng) -> u32 {
        let strategy: u8 = rng.gen_range(0..4);
        match strategy {
            0 => rng.gen_range(0..5000),          // Pure random
            1 => rng.gen_range(0..500),            // Front-weighted
            2 => rng.gen_range(2500..7500),        // Middle section
            3 => {                                  // Random chunk
                let chunk_start = rng.gen_range(0..9000);
                chunk_start + rng.gen_range(0..1000)
            }
            _ => 0,
        }
    }
}

/// Extract the first string from a serde_json::Value that could be a string or array.
pub fn value_to_string(val: &serde_json::Value) -> Option<String> {
    match val {
        serde_json::Value::String(s) => Some(s.clone()),
        serde_json::Value::Array(arr) => arr.first().and_then(|v| v.as_str().map(String::from)),
        serde_json::Value::Number(n) => Some(n.to_string()),
        _ => None,
    }
}

/// Extract all strings from a value (for subjects, collections, etc).
pub fn value_to_strings(val: &serde_json::Value) -> Vec<String> {
    match val {
        serde_json::Value::String(s) => vec![s.clone()],
        serde_json::Value::Array(arr) => arr.iter().filter_map(|v| v.as_str().map(String::from)).collect(),
        _ => vec![],
    }
}
