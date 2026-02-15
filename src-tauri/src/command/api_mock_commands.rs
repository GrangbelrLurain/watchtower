use crate::model::api_mock::ApiMock;
use crate::model::api_response::ApiResponse;
use crate::service::api_mock_service::ApiMockService;
use chrono::Utc;

#[tauri::command]
pub fn get_api_mocks(
    api_mock_service: tauri::State<'_, std::sync::Arc<ApiMockService>>,
) -> Result<ApiResponse<Vec<ApiMock>>, String> {
    let mocks = api_mock_service.get_all();
    Ok(ApiResponse {
        message: format!("{}개 mock 조회 완료", mocks.len()),
        success: true,
        data: mocks,
    })
}

#[tauri::command]
pub fn add_api_mock(
    payload: ApiMock,
    api_mock_service: tauri::State<'_, std::sync::Arc<ApiMockService>>,
) -> Result<ApiResponse<()>, String> {
    let mut mock = payload;
    if mock.id.is_empty() {
        mock.id = format!("mock-{}", Utc::now().timestamp_micros());
    }
    api_mock_service.add_mock(mock);
    Ok(ApiResponse {
        message: "Mock 추가 완료".to_string(),
        success: true,
        data: (),
    })
}

#[tauri::command]
pub fn update_api_mock(
    payload: ApiMock,
    api_mock_service: tauri::State<'_, std::sync::Arc<ApiMockService>>,
) -> Result<ApiResponse<()>, String> {
    api_mock_service.update_mock(payload);
    Ok(ApiResponse {
        message: "Mock 업데이트 완료".to_string(),
        success: true,
        data: (),
    })
}

#[tauri::command]
pub fn remove_api_mock(
    id: String,
    api_mock_service: tauri::State<'_, std::sync::Arc<ApiMockService>>,
) -> Result<ApiResponse<()>, String> {
    api_mock_service.remove_mock(&id);
    Ok(ApiResponse {
        message: "Mock 제거 완료".to_string(),
        success: true,
        data: (),
    })
}
