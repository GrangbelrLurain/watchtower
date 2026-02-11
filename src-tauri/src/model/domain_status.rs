use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// status 체크 대상 도메인 + 옵션 (체크 결과 아님)
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DomainStatus {
    pub domain_id: u32,
    #[serde(default = "default_check_enabled")]
    pub check_enabled: bool,
    #[serde(default = "default_interval")]
    pub interval_secs: u32,
}

fn default_check_enabled() -> bool {
    true
}

fn default_interval() -> u32 {
    120
}

/// `DomainStatus` + url (FE 표시용)
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DomainStatusWithUrl {
    pub domain_id: u32,
    pub url: String,
    pub check_enabled: bool,
    pub interval_secs: u32,
}

/// 체크 결과 구조. 최신은 `메모리(last_checks)`, 과거는 logs/{date}.json
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DomainStatusLog {
    pub url: String,
    pub status: String,
    pub level: String,
    pub latency: u32,
    pub ok: bool,
    pub group: String,
    pub timestamp: DateTime<Utc>,
    pub error_message: Option<String>,
}
