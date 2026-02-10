use crate::model::api_response::ApiResponse;
use crate::model::domain::Domain;
use crate::model::domain_group::DomainGroup;
use crate::model::domain_group_link::DomainGroupLink;
use crate::service::domain_group_link_service::DomainGroupLinkService;
use crate::service::domain_group_service::DomainGroupService;
use crate::service::domain_service::DomainService;
use tauri::State;

#[tauri::command]
pub fn get_domain_group_links(
    link_service: State<'_, DomainGroupLinkService>,
) -> Result<ApiResponse<Vec<DomainGroupLink>>, String> {
    let links = link_service.get_all_links();
    Ok(ApiResponse {
        success: true,
        data: links,
        message: "".to_string(),
    })
}

#[tauri::command]
pub fn set_domain_groups(
    domain_id: u32,
    group_ids: Vec<u32>,
    link_service: State<'_, DomainGroupLinkService>,
) -> Result<ApiResponse<()>, String> {
    link_service.set_groups_for_domain(domain_id, group_ids);
    Ok(ApiResponse {
        success: true,
        data: (),
        message: "Domain groups updated".to_string(),
    })
}

#[tauri::command]
pub fn set_group_domains(
    group_id: u32,
    domain_ids: Vec<u32>,
    link_service: State<'_, DomainGroupLinkService>,
) -> Result<ApiResponse<()>, String> {
    link_service.set_domains_for_group(group_id, domain_ids);
    Ok(ApiResponse {
        success: true,
        data: (),
        message: "Group domains updated".to_string(),
    })
}

#[tauri::command]
pub fn get_domains_by_group(
    group_id: u32,
    domain_service: State<'_, DomainService>,
    link_service: State<'_, DomainGroupLinkService>,
) -> Result<ApiResponse<Vec<Domain>>, String> {
    let domain_ids = link_service.get_domain_ids_for_group(group_id);
    let all_domains = domain_service.get_all();
    let domains: Vec<Domain> = domain_ids
        .into_iter()
        .filter_map(|id| all_domains.iter().find(|d| d.id == id).cloned())
        .collect();
    Ok(ApiResponse {
        success: true,
        data: domains,
        message: "".to_string(),
    })
}

#[tauri::command]
pub fn get_groups_for_domain(
    domain_id: u32,
    group_service: State<'_, DomainGroupService>,
    link_service: State<'_, DomainGroupLinkService>,
) -> Result<ApiResponse<Vec<DomainGroup>>, String> {
    let group_ids = link_service.get_group_ids_for_domain(domain_id);
    let all_groups = group_service.get_all();
    let groups: Vec<DomainGroup> = group_ids
        .into_iter()
        .filter_map(|id| all_groups.iter().find(|g| g.id == id).cloned())
        .collect();
    Ok(ApiResponse {
        success: true,
        data: groups,
        message: "".to_string(),
    })
}

#[tauri::command]
pub async fn create_group(
    name: String,
    service: State<'_, DomainGroupService>,
) -> Result<ApiResponse<Vec<DomainGroup>>, String> {
    let groups = service.add_group(name);
    Ok(ApiResponse {
        success: true,
        data: groups,
        message: "Group created successfully".to_string(),
    })
}

#[tauri::command]
pub async fn get_groups(
    service: State<'_, DomainGroupService>,
) -> Result<ApiResponse<Vec<DomainGroup>>, String> {
    let groups = service.get_all();
    Ok(ApiResponse {
        success: true,
        data: groups,
        message: "".to_string(),
    })
}

#[tauri::command]
pub async fn delete_group(
    id: u32,
    service: State<'_, DomainGroupService>,
    link_service: State<'_, DomainGroupLinkService>,
) -> Result<ApiResponse<Vec<DomainGroup>>, String> {
    link_service.remove_links_for_group(id);
    let groups = service.delete_group(id);
    Ok(ApiResponse {
        success: true,
        data: groups,
        message: "Group deleted successfully".to_string(),
    })
}

#[tauri::command]
pub async fn update_group(
    id: u32,
    name: String,
    service: State<'_, DomainGroupService>,
) -> Result<ApiResponse<Vec<DomainGroup>>, String> {
    let groups = service.update_group(id, name);
    Ok(ApiResponse {
        success: true,
        data: groups,
        message: "Group updated successfully".to_string(),
    })
}
