use serde::{Deserialize, Serialize};

/// 도메인별 API 로깅 설정 링크.
/// `domain_id`에 해당하는 도메인의 API 트래픽 로깅 여부와 바디 저장 여부를 제어.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DomainApiLoggingLink {
    pub domain_id: u32,
    #[serde(default = "default_true")]
    pub logging_enabled: bool,
    #[serde(default)]
    pub body_enabled: bool,
}

fn default_true() -> bool {
    true
}
