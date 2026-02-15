use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiSchema {
    pub id: String,
    pub domain_id: u32,
    pub version: String,
    pub spec: String,
    pub source: String, // "import" or "url"
    pub fetched_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DomainApiSchemaLink {
    pub domain_id: u32,
    pub schema_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiSchemaDiff {
    pub id1: String,
    pub id2: String,
    pub added: Vec<EndpointDiff>,
    pub removed: Vec<EndpointDiff>,
    pub modified: Vec<EndpointDiff>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EndpointDiff {
    pub method: String,
    pub path: String,
    pub summary: Option<String>,
}
