use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ApiResponse<T> {
    pub message: String,
    pub success: bool,
    pub data: T,
}
