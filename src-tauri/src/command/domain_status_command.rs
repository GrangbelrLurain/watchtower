use crate::model::api_response::ApiResponse;
use crate::model::domain_status::DomainStatus;
use crate::service::domain_service::DomainService;
use crate::service::domain_status_service::DomainStatusService;

#[tauri::command]
pub fn get_latest_status(
    status_service: tauri::State<'_, DomainStatusService>,
) -> Result<ApiResponse<Vec<DomainStatus>>, String> {
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
    status_service: tauri::State<'_, DomainStatusService>,
) -> Result<ApiResponse<Vec<DomainStatus>>, String> {
    let results = status_service.check_domains(&domain_service).await;
    Ok(ApiResponse {
        message: format!("{}개의 도메인 상태 체크 완료", results.len()),
        success: true,
        data: results,
    })
}

#[tauri::command]
pub fn get_domain_status_logs(
    date: String,
    status_service: tauri::State<'_, DomainStatusService>,
) -> Result<ApiResponse<Vec<DomainStatus>>, String> {
    let logs = status_service.get_logs_by_date(date);
    Ok(ApiResponse {
        message: format!("{} 건의 로그가 조회되었습니다.", logs.len()),
        success: true,
        data: logs,
    })
}
