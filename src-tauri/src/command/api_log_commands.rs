use crate::model::api_response::ApiResponse;
use crate::model::domain_api_logging_link::DomainApiLoggingLink;
use crate::service::api_logging_settings_service::ApiLoggingSettingsService;
use crate::service::domain_service::DomainService;

/// 모든 도메인 API 로깅 링크 조회.
#[tauri::command]
pub fn get_domain_api_logging_links(
    api_logging_service: tauri::State<'_, ApiLoggingSettingsService>,
) -> Result<ApiResponse<Vec<DomainApiLoggingLink>>, String> {
    let links = api_logging_service.get_links();
    Ok(ApiResponse {
        message: format!("{}개 로깅 링크 조회", links.len()),
        success: true,
        data: links,
    })
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetDomainApiLoggingPayload {
    pub domain_id: u32,
    pub logging_enabled: bool,
    pub body_enabled: bool,
}

/// 도메인 API 로깅 설정 추가/변경.
#[tauri::command]
pub fn set_domain_api_logging(
    payload: SetDomainApiLoggingPayload,
    api_logging_service: tauri::State<'_, ApiLoggingSettingsService>,
    domain_service: tauri::State<'_, DomainService>,
) -> Result<ApiResponse<Vec<DomainApiLoggingLink>>, String> {
    // 도메인 존재 확인
    let domain = domain_service.get_domain_by_id(payload.domain_id);
    if domain.is_none() {
        return Ok(ApiResponse {
            message: format!("도메인 ID {} 를 찾을 수 없습니다.", payload.domain_id),
            success: false,
            data: api_logging_service.get_links(),
        });
    }
    let all_domains = domain_service.get_all();
    let links = api_logging_service.set_link(
        payload.domain_id,
        payload.logging_enabled,
        payload.body_enabled,
        &all_domains,
    );
    Ok(ApiResponse {
        message: "로깅 설정 업데이트 완료".to_string(),
        success: true,
        data: links,
    })
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveDomainApiLoggingPayload {
    pub domain_id: u32,
}

/// 도메인 API 로깅 설정 제거.
#[tauri::command]
pub fn remove_domain_api_logging(
    payload: RemoveDomainApiLoggingPayload,
    api_logging_service: tauri::State<'_, ApiLoggingSettingsService>,
    domain_service: tauri::State<'_, DomainService>,
) -> Result<ApiResponse<Vec<DomainApiLoggingLink>>, String> {
    let all_domains = domain_service.get_all();
    api_logging_service.remove_link(payload.domain_id, &all_domains);
    let links = api_logging_service.get_links();
    Ok(ApiResponse {
        message: "로깅 설정 제거 완료".to_string(),
        success: true,
        data: links,
    })
}
