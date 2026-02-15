use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiLogEntry {
    pub id: String,
    pub timestamp: i64,
    pub method: String,
    pub url: String,
    pub host: String,
    pub path: String,
    pub status_code: u16,
    pub request_headers: HashMap<String, String>,
    pub request_body: Option<String>,
    pub response_headers: HashMap<String, String>,
    pub response_body: Option<String>,
    pub source: String, // "test" or "proxy"
    pub elapsed_ms: u64,
}
