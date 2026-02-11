use crate::model::api_response::ApiResponse;
use crate::model::domain_status::{DomainStatusLog, DomainStatusWithUrl};
use crate::service::domain_group_link_service::DomainGroupLinkService;
use crate::service::domain_group_service::DomainGroupService;
use crate::service::domain_service::DomainService;
use crate::service::domain_status_service::DomainStatusService;
use crate::service::proxy_settings_service::ProxySettingsService;

#[tauri::command]
pub fn get_latest_status(
    status_service: tauri::State<'_, DomainStatusService>,
) -> Result<ApiResponse<Vec<DomainStatusLog>>, String> {
    let list = status_service.get_last_status();
    Ok(ApiResponse {
        message: format!("{}개의 최신 상태 조회 완료", list.len()),
        success: true,
        data: list,
    })
}

#[tauri::command]
pub async fn check_domain_status(
    domain_service: tauri::State<'_, DomainService>,
    group_service: tauri::State<'_, DomainGroupService>,
    link_service: tauri::State<'_, DomainGroupLinkService>,
    status_service: tauri::State<'_, DomainStatusService>,
    proxy_settings_service: tauri::State<'_, ProxySettingsService>,
) -> Result<ApiResponse<Vec<DomainStatusLog>>, String> {
    let results = status_service
        .check_domains(
            &domain_service,
            &group_service,
            &link_service,
            &proxy_settings_service,
        )
        .await;
   Ok(ApiResponse {
        message: format!("{}개의 도메인 상태 체크 완료", results.len()),
        success: true,
        data: results,
    })
}

#[tauri::command]
pub fn get_domain_status_list(
    domain_service: tauri::State<'_, DomainService>,
    status_service: tauri::State<'_, DomainStatusService>,
) -> Result<ApiResponse<Vec<DomainStatusWithUrl>>, String> {
    let list = status_service.get_domain_status_list(&domain_service);
    Ok(ApiResponse {
        message: format!("{}개 도메인 status 설정 조회", list.len()),
        success: true,
        data: list,
    })
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetDomainStatusCheckEnabledPayload {
    pub domain_ids: Vec<u32>,
    pub enabled: bool,
}

#[tauri::command]
pub fn set_domain_status_check_enabled(
    payload: SetDomainStatusCheckEnabledPayload,
    status_service: tauri::State<'_, DomainStatusService>,
) -> Result<ApiResponse<bool>, String> {
    status_service.set_domain_status_check_enabled(&payload.domain_ids, payload.enabled);
    Ok(ApiResponse {
        message: format!(
            "{}개 도메인 체크 {}",
            payload.domain_ids.len(),
            if payload.enabled { "활성화" } else { "비활성화" }
        ),
        success: true,
        data: true,
    })
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetDomainStatusLogsPayload {
    pub date: String,
}

#[tauri::command]
pub fn get_domain_status_logs(
    payload: GetDomainStatusLogsPayload,
    status_service: tauri::State<'_, DomainStatusService>,
) -> Result<ApiResponse<Vec<DomainStatusLog>>, String> {
    let logs = status_service.get_logs_by_date(payload.date);
    Ok(ApiResponse {
        message: format!("{} 건의 로그가 조회되었습니다.", logs.len()),
        success: true,
        data: logs,
    })
}
