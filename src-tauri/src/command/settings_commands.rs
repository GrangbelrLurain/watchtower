use crate::model::api_response::ApiResponse;
use crate::model::settings_export::{SettingsExport, SETTINGS_EXPORT_VERSION};
use crate::service::domain_group_link_service::DomainGroupLinkService;
use crate::service::domain_group_service::DomainGroupService;
use crate::service::domain_service::DomainService;
use crate::service::local_route_service::LocalRouteService;
use crate::service::proxy_settings_service::ProxySettingsService;
use std::sync::Arc;

#[tauri::command]
pub fn export_all_settings(
    domain_service: tauri::State<'_, DomainService>,
    group_service: tauri::State<'_, DomainGroupService>,
    link_service: tauri::State<'_, DomainGroupLinkService>,
    route_service: tauri::State<'_, Arc<LocalRouteService>>,
    proxy_settings_service: tauri::State<'_, ProxySettingsService>,
) -> Result<ApiResponse<SettingsExport>, String> {
    let exported_at = chrono::Utc::now().to_rfc3339();
    let payload = SettingsExport {
        version: SETTINGS_EXPORT_VERSION,
        exported_at,
        domains: domain_service.get_all(),
        groups: group_service.get_all(),
        domain_group_links: link_service.get_all_links(),
        local_routes: route_service.get_all(),
        proxy_settings: proxy_settings_service.get(),
    };
    Ok(ApiResponse {
        message: "Export ready".to_string(),
        success: true,
        data: payload,
    })
}

#[tauri::command]
pub fn import_all_settings(
    payload: SettingsExport,
    domain_service: tauri::State<'_, DomainService>,
    group_service: tauri::State<'_, DomainGroupService>,
    link_service: tauri::State<'_, DomainGroupLinkService>,
    route_service: tauri::State<'_, Arc<LocalRouteService>>,
    proxy_settings_service: tauri::State<'_, ProxySettingsService>,
) -> Result<ApiResponse<bool>, String> {
    if payload.version != SETTINGS_EXPORT_VERSION {
        return Err(format!(
            "Unsupported export version {} (expected {})",
            payload.version, SETTINGS_EXPORT_VERSION
        ));
    }
    domain_service.import_from_json(payload.domains);
    group_service.replace_all(payload.groups);
    link_service.replace_all(payload.domain_group_links);
    route_service.replace_all(payload.local_routes);
    proxy_settings_service.replace_all(payload.proxy_settings);
    Ok(ApiResponse {
        message: "Import completed".to_string(),
        success: true,
        data: true,
    })
}
