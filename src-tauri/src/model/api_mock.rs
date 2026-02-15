use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiMock {
    pub id: String,
    pub host: String,
    pub path: String,
    pub method: String,
    pub status_code: u16,
    pub response_body: String,
    pub content_type: String,
    pub enabled: bool,
}
