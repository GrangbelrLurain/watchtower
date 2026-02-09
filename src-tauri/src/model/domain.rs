use std::sync::Mutex;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct Domain {
    pub id: u32,
    pub url: String,
    pub group_id: Option<u32>,
}
