use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse<T> {
    pub message: String,
    pub success: bool,
    pub data: T,
}
