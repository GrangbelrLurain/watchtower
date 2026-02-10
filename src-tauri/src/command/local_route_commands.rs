use crate::model::api_response::ApiResponse;
use crate::model::local_route::LocalRoute;
use crate::model::proxy_settings::ProxySettings;
use crate::service::local_proxy;
use crate::service::local_route_service::LocalRouteService;
use crate::service::proxy_settings_service::ProxySettingsService;
use std::sync::atomic::{AtomicU16, Ordering};
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub fn get_local_routes(
    route_service: tauri::State<'_, std::sync::Arc<LocalRouteService>>,
) -> Result<ApiResponse<Vec<LocalRoute>>, String> {
    let list = route_service.get_all();
    Ok(ApiResponse {
        message: format!("{} routes", list.len()),
        success: true,
        data: list,
    })
}

#[tauri::command]
pub fn add_local_route(
    domain: String,
    target_host: String,
    target_port: u16,
    route_service: tauri::State<'_, std::sync::Arc<LocalRouteService>>,
) -> Result<ApiResponse<LocalRoute>, String> {
    let route = route_service.add(domain, target_host, target_port);
    Ok(ApiResponse {
        message: "Route added".to_string(),
        success: true,
        data: route,
    })
}

#[tauri::command]
pub fn update_local_route(
    id: u32,
    domain: Option<String>,
    target_host: Option<String>,
    target_port: Option<u16>,
    enabled: Option<bool>,
    route_service: tauri::State<'_, std::sync::Arc<LocalRouteService>>,
) -> Result<ApiResponse<Option<LocalRoute>>, String> {
    let route = route_service.update(id, domain, target_host, target_port, enabled);
    Ok(ApiResponse {
        message: if route.is_some() {
            "Route updated"
        } else {
            "Route not found"
        }
        .to_string(),
        success: true,
        data: route,
    })
}

#[tauri::command]
pub fn remove_local_route(
    id: u32,
    route_service: tauri::State<'_, std::sync::Arc<LocalRouteService>>,
) -> Result<ApiResponse<Option<LocalRoute>>, String> {
    let route = route_service.remove(id);
    Ok(ApiResponse {
        message: if route.is_some() {
            "Route removed"
        } else {
            "Route not found"
        }
        .to_string(),
        success: true,
        data: route,
    })
}

#[tauri::command]
pub fn set_local_route_enabled(
    id: u32,
    enabled: bool,
    route_service: tauri::State<'_, std::sync::Arc<LocalRouteService>>,
) -> Result<ApiResponse<Option<LocalRoute>>, String> {
    let route = route_service.set_enabled(id, enabled);
    Ok(ApiResponse {
        message: if route.is_some() {
            "Route updated"
        } else {
            "Route not found"
        }
        .to_string(),
        success: true,
        data: route,
    })
}

/// Current proxy port when running; 0 when stopped.
static PROXY_PORT: AtomicU16 = AtomicU16::new(0);
static PROXY_HANDLE: std::sync::Mutex<Option<tokio::task::JoinHandle<()>>> = std::sync::Mutex::new(None);

#[tauri::command]
pub async fn get_proxy_status() -> Result<ApiResponse<ProxyStatusPayload>, String> {
    let port = PROXY_PORT.load(Ordering::Relaxed);
    Ok(ApiResponse {
        message: if port == 0 {
            "Proxy stopped"
        } else {
            "Proxy running"
        }
        .to_string(),
        success: true,
        data: ProxyStatusPayload {
            running: port != 0,
            port,
        },
    })
}

#[derive(serde::Serialize)]
pub struct ProxyStatusPayload {
    pub running: bool,
    pub port: u16,
}

const DEFAULT_PROXY_PORT: u16 = 8888;

pub const PROXY_STATUS_CHANGED: &str = "proxy-status-changed";

#[tauri::command]
pub fn get_proxy_settings(
    proxy_settings_service: tauri::State<'_, ProxySettingsService>,
) -> Result<ApiResponse<ProxySettings>, String> {
    let settings = proxy_settings_service.get();
    Ok(ApiResponse {
        message: "OK".to_string(),
        success: true,
        data: settings,
    })
}

#[tauri::command]
pub fn set_proxy_dns_server(
    proxy_settings_service: tauri::State<'_, ProxySettingsService>,
    dns_server: Option<String>,
) -> Result<ApiResponse<ProxySettings>, String> {
    let settings = proxy_settings_service.set_dns_server(dns_server);
    Ok(ApiResponse {
        message: "DNS server updated".to_string(),
        success: true,
        data: settings,
    })
}

#[tauri::command]
pub async fn start_local_proxy(
    app: AppHandle,
    port: Option<u16>,
    route_service: tauri::State<'_, std::sync::Arc<LocalRouteService>>,
    proxy_settings_service: tauri::State<'_, ProxySettingsService>,
) -> Result<ApiResponse<ProxyStatusPayload>, String> {
    let port = port.unwrap_or(DEFAULT_PROXY_PORT);
    if PROXY_PORT.load(Ordering::Relaxed) != 0 {
        let payload = ProxyStatusPayload {
            running: true,
            port: PROXY_PORT.load(Ordering::Relaxed),
        };
        let _ = app.emit(PROXY_STATUS_CHANGED, &payload);
        return Ok(ApiResponse {
            message: "Proxy already running".to_string(),
            success: true,
            data: payload,
        });
    }
    let dns_server = proxy_settings_service.get().dns_server;
    let handle = local_proxy::run_proxy(
        port,
        std::sync::Arc::clone(&*route_service),
        dns_server,
    )
    .await
    .map_err(|e| e.to_string())?;
    PROXY_PORT.store(port, Ordering::Relaxed);
    let mut guard = PROXY_HANDLE.lock().map_err(|e| e.to_string())?;
    *guard = Some(handle);
    let payload = ProxyStatusPayload { running: true, port };
    let _ = app.emit(PROXY_STATUS_CHANGED, &payload);
    Ok(ApiResponse {
        message: format!("Proxy started on 127.0.0.1:{}", port),
        success: true,
        data: payload,
    })
}

#[tauri::command]
pub fn stop_local_proxy(app: AppHandle) -> Result<ApiResponse<ProxyStatusPayload>, String> {
    let mut guard = PROXY_HANDLE.lock().map_err(|e| e.to_string())?;
    if let Some(handle) = guard.take() {
        handle.abort();
    }
    let _ = PROXY_PORT.swap(0, Ordering::Relaxed);
    let payload = ProxyStatusPayload {
        running: false,
        port: 0,
    };
    let _ = app.emit(PROXY_STATUS_CHANGED, &payload);
    Ok(ApiResponse {
        message: "Proxy stopped".to_string(),
        success: true,
        data: payload,
    })
}
