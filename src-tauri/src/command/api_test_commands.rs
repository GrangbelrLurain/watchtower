use crate::model::api_response::ApiResponse;
use crate::model::api_test_case::ApiTestCase;
use crate::service::api_test_case_service::ApiTestCaseService;
use chrono::Utc;

#[tauri::command]
pub fn get_api_test_cases(
    domain_id: Option<u32>,
    service: tauri::State<'_, ApiTestCaseService>,
) -> Result<ApiResponse<Vec<ApiTestCase>>, String> {
    let list = if let Some(did) = domain_id {
        service.get_for_domain(did)
    } else {
        service.get_all()
    };
    Ok(ApiResponse {
        message: "테스트 케이스 조회 완료".to_string(),
        success: true,
        data: list,
    })
}

#[tauri::command]
pub fn add_api_test_case(
    payload: ApiTestCase,
    service: tauri::State<'_, ApiTestCaseService>,
) -> Result<ApiResponse<()>, String> {
    let mut test_case = payload;
    if test_case.id.is_empty() {
        test_case.id = format!("test-{}", Utc::now().timestamp_micros());
    }
    service.add_test_case(test_case);
    Ok(ApiResponse {
        message: "테스트 케이스 추가 완료".to_string(),
        success: true,
        data: (),
    })
}

#[tauri::command]
pub fn remove_api_test_case(
    id: String,
    service: tauri::State<'_, ApiTestCaseService>,
) -> Result<ApiResponse<()>, String> {
    service.remove_test_case(&id);
    Ok(ApiResponse {
        message: "테스트 케이스 제거 완료".to_string(),
        success: true,
        data: (),
    })
}
