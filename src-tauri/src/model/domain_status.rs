use chrono::{DateTime, Utc};

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DomainStatus {
    pub url: String,
    pub status: String,
    pub level: String,
    pub latency: u32,
    pub ok: bool,
    pub group: String,
    pub timestamp: DateTime<Utc>,
    pub error_message: Option<String>,
}

pub struct DomainStatusLog {
    pub id: u32,
    pub domain_id: u32,
    pub status: String,
    pub level: String,
    pub ok: bool,
    pub group: String,
    pub timestamp: DateTime<Utc>,
}
