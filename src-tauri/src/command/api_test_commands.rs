use crate::model::api_response::ApiResponse;
use crate::model::api_test_case::ApiTestCase;
use crate::service::api_test_case_service::ApiTestCaseService;
use chrono::Utc;
use std::collections::HashMap; // Added for ApiRequestResult
use crate::command::api_log_commands::{send_api_request, ApiRequestResult, SendApiRequestPayload}; // Added for run_api_test_case
use crate::service::api_log_service::ApiLogService; // Added for run_api_test_case

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
pub fn update_api_test_case(
    payload: ApiTestCase,
    service: tauri::State<'_, ApiTestCaseService>,
) -> Result<ApiResponse<()>, String> {
    service.update_test_case(payload);
    Ok(ApiResponse {
        message: "테스트 케이스 업데이트 완료".to_string(),
        success: true,
        data: (),
    })
}

#[tauri::command]
pub async fn run_api_test_case(
    id: String,
    test_case_service: tauri::State<'_, ApiTestCaseService>,
    api_log_service: tauri::State<'_, std::sync::Arc<ApiLogService>>, // Required by send_api_request
) -> Result<ApiResponse<ApiRequestResult>, String> {
    let Some(test_case) = test_case_service.get_test_case_by_id(&id) else {
        return Ok(ApiResponse {
            message: "테스트 케이스를 찾을 수 없습니다.".to_string(),
            success: false,
            data: ApiRequestResult {
                status_code: 0,
                headers: HashMap::new(),
                body: String::new(),
                elapsed_ms: 0,
            },
        });
    };

    let send_payload = SendApiRequestPayload {
        method: test_case.method,
        url: test_case.url,
        headers: test_case.headers,
        body: test_case.body,
    };

    // send_api_request already logs the request
    send_api_request(send_payload, api_log_service).await
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
