//! Full app settings export/import payload (JSON).
//! Status logs (DomainStatusLog) are excluded - they are runtime data, not settings.

use crate::model::domain::Domain;
use crate::model::domain_group::DomainGroup;
use crate::model::domain_group_link::DomainGroupLink;
use crate::model::local_route::LocalRoute;
use crate::model::proxy_settings::ProxySettings;
use serde::{Deserialize, Serialize};

pub const SETTINGS_EXPORT_VERSION: u32 = 2;

/// Domain status check settings (check_enabled, interval). Keyed by URL for import matching.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DomainStatusExport {
    pub url: String,
    pub check_enabled: bool,
    pub interval_secs: u32,
}

fn default_domain_status() -> Vec<DomainStatusExport> {
    Vec::new()
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsExport {
    pub version: u32,
    pub exported_at: String,
    pub domains: Vec<Domain>,
    pub groups: Vec<DomainGroup>,
    pub domain_group_links: Vec<DomainGroupLink>,
    pub local_routes: Vec<LocalRoute>,
    pub proxy_settings: ProxySettings,
    /// Status check settings per domain (check_enabled, interval). Status logs are excluded.
    #[serde(default = "default_domain_status")]
    pub domain_status: Vec<DomainStatusExport>,
}
