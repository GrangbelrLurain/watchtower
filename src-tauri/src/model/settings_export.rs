//! Full app settings export/import payload (JSON).

use crate::model::domain::Domain;
use crate::model::domain_group::DomainGroup;
use crate::model::domain_group_link::DomainGroupLink;
use crate::model::local_route::LocalRoute;
use crate::model::proxy_settings::ProxySettings;
use serde::{Deserialize, Serialize};

pub const SETTINGS_EXPORT_VERSION: u32 = 1;

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
}
