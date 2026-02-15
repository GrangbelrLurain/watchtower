#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Domain {
    pub id: u32,
    pub url: String,
}
