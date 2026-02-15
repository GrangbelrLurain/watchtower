use crate::model::api_response::ApiResponse;
use crate::model::api_schema::ApiSchema;
use crate::service::api_schema_service::ApiSchemaService;
use chrono::Utc;

#[tauri::command]
pub fn get_api_schemas(
    domain_id: u32,
    api_schema_service: tauri::State<'_, ApiSchemaService>,
) -> Result<ApiResponse<Vec<ApiSchema>>, String> {
    let schemas = api_schema_service.get_schemas_for_domain(domain_id);
    Ok(ApiResponse {
        message: format!("{}개 스키마 조회 완료", schemas.len()),
        success: true,
        data: schemas,
    })
}

#[tauri::command]
pub fn get_api_schema_by_id(
    id: String,
    api_schema_service: tauri::State<'_, ApiSchemaService>,
) -> Result<ApiResponse<Option<ApiSchema>>, String> {
    let schema = api_schema_service.get_schema_by_id(&id);
    Ok(ApiResponse {
        message: if schema.is_some() { "스키마 조회 완료" } else { "스키마를 찾을 수 없습니다." }.to_string(),
        success: true,
        data: schema,
    })
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportApiSchemaPayload {
    pub domain_id: u32,
    pub version: String,
    pub spec: String,
    pub source: String,
}

#[tauri::command]
pub fn import_api_schema(
    payload: ImportApiSchemaPayload,
    api_schema_service: tauri::State<'_, ApiSchemaService>,
) -> Result<ApiResponse<ApiSchema>, String> {
    let schema = ApiSchema {
        id: format!("{}-{}", payload.domain_id, Utc::now().timestamp_millis()),
        domain_id: payload.domain_id,
        version: payload.version,
        spec: payload.spec,
        source: payload.source,
        fetched_at: Utc::now().timestamp_millis(),
    };
    api_schema_service.add_schema(schema.clone());
    Ok(ApiResponse {
        message: "스키마 임포트 완료".to_string(),
        success: true,
        data: schema,
    })
}

#[tauri::command]
pub fn remove_api_schema(
    id: String,
    api_schema_service: tauri::State<'_, ApiSchemaService>,
) -> Result<ApiResponse<()>, String> {
    api_schema_service.remove_schema(&id);
    Ok(ApiResponse {
        message: "스키마 제거 완료".to_string(),
        success: true,
        data: (),
    })
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiSchemaDiffResult {
    pub old_spec: String,
    pub new_spec: String,
}

#[tauri::command]
pub fn diff_api_schemas(
    old_id: String,
    new_id: String,
    api_schema_service: tauri::State<'_, ApiSchemaService>,
) -> Result<ApiResponse<ApiSchemaDiffResult>, String> {
    let old_schema = api_schema_service.get_schema_by_id(&old_id);
    let new_schema = api_schema_service.get_schema_by_id(&new_id);

    match (old_schema, new_schema) {
        (Some(old), Some(new)) => Ok(ApiResponse {
            message: "스키마 비교 데이터 조회 완료".to_string(),
            success: true,
            data: ApiSchemaDiffResult {
                old_spec: old.spec,
                new_spec: new.spec,
            },
        }),
        _ => Err("스키마를 찾을 수 없습니다.".to_string()),
    }
}
