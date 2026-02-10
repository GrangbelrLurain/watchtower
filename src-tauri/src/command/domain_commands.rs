use crate::model::api_response::ApiResponse;
use crate::model::domain::Domain;
use crate::service::domain_group_link_service::DomainGroupLinkService;
use crate::service::domain_service::DomainService;

#[tauri::command]
pub fn regist_domains(
    urls: Vec<String>,
    domain_service: tauri::State<'_, DomainService>,
    link_service: tauri::State<'_, DomainGroupLinkService>,
    group_id: Option<u32>,
) -> Result<ApiResponse<Vec<Domain>>, String> {
    let requested = urls.len();
    let list = domain_service.add_domains(urls);
    if let Some(gid) = group_id {
        for d in &list {
            link_service.add_domain_to_group(d.id, gid);
        }
    }
    let skipped = requested.saturating_sub(list.len());
    let message = if skipped > 0 {
        format!("{}개 등록 완료, {}개 중복 제외!", list.len(), skipped)
    } else {
        format!("{}개 등록 완료!", list.len())
    };
    Ok(ApiResponse {
        message,
        success: true,
        data: list,
    })
}

#[tauri::command]
pub fn get_domains(
    domain_service: tauri::State<'_, DomainService>,
) -> Result<ApiResponse<Vec<Domain>>, String> {
    let list = domain_service.get_all();
    Ok(ApiResponse {
        message: format!("{}개 조회 완료!", list.len()),
        success: true,
        data: list,
    })
}

#[tauri::command]
pub fn get_domain_by_id(
    id: u32,
    domain_service: tauri::State<'_, DomainService>,
) -> Result<ApiResponse<Option<Domain>>, String> {
    let domain = domain_service.get_domain_by_id(id);
    if let Some(domain) = domain {
        Ok(ApiResponse {
            message: format!("{} 조회 완료!", domain.url),
            success: true,
            data: Some(domain.clone()),
        })
    } else {
        Ok(ApiResponse {
            message: format!("{} 조회 실패!", id),
            success: false,
            data: Option::<Domain>::None,
        })
    }
}

/// Optional fields for updating a domain. Only provided fields are applied.
#[derive(serde::Deserialize, Default)]
pub struct UpdateDomainPayload {
    pub url: Option<String>,
}

#[tauri::command]
pub fn update_domain_by_id(
    id: u32,
    payload: Option<UpdateDomainPayload>,
    domain_service: tauri::State<'_, DomainService>,
) -> Result<ApiResponse<Option<Domain>>, String> {
    let url = payload.and_then(|p| p.url).filter(|s| !s.is_empty());
    let domain = domain_service.update_domain(id, url);
    if !domain.is_empty() {
        Ok(ApiResponse {
            message: format!("{} 업데이트 완료!", id),
            success: true,
            data: Some(domain[0].clone()),
        })
    } else {
        Ok(ApiResponse {
            message: format!("{} 업데이트 실패!", id),
            success: false,
            data: Option::<Domain>::None,
        })
    }
}

#[tauri::command]
pub fn remove_domains(
    id: u32,
    domain_service: tauri::State<'_, DomainService>,
    link_service: tauri::State<'_, DomainGroupLinkService>,
) -> Result<ApiResponse<Option<Domain>>, String> {
    link_service.remove_links_for_domain(id);
    let domain = domain_service.delete_domain(id);
    if !domain.is_empty() {
        Ok(ApiResponse {
            message: format!("{} 삭제 완료!", id),
            success: true,
            data: Some(domain[0].clone()),
        })
    } else {
        Ok(ApiResponse {
            message: format!("{} 삭제 실패!", id),
            success: false,
            data: Option::<Domain>::None,
        })
    }
}

#[tauri::command]
pub fn import_domains(
    domains: Vec<Domain>,
    domain_service: tauri::State<'_, DomainService>,
) -> Result<ApiResponse<Vec<Domain>>, String> {
    let list = domain_service.import_from_json(domains);
    Ok(ApiResponse {
        message: format!("{}개 도메인 임포트 완료!", list.len()),
        success: true,
        data: list,
    })
}

#[tauri::command]
pub fn clear_all_domains(
    domain_service: tauri::State<'_, DomainService>,
) -> Result<ApiResponse<Vec<Domain>>, String> {
    let list = domain_service.import_from_json(vec![]);
    Ok(ApiResponse {
        message: "모든 도메인이 삭제되었습니다.".to_string(),
        success: true,
        data: list,
    })
}
