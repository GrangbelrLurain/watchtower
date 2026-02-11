use crate::model::api_response::ApiResponse;
use crate::model::local_route::LocalRoute;
use crate::model::proxy_settings::ProxySettings;
use crate::service::local_proxy;
use crate::service::local_route_service::LocalRouteService;
use crate::service::proxy_settings_service::ProxySettingsService;
use std::fmt::Write;
use std::io;
use std::sync::atomic::{AtomicU16, Ordering};
use tauri::{AppHandle, Emitter};

/// Turns a bind/listen error into a user-friendly message (e.g. port already in use).
fn map_bind_error(port: u16, e: io::Error) -> String {
    let code = e.raw_os_error();
    if code == Some(10048) {
        // Windows WSAEADDRINUSE
        return format!(
            "Port {port} is already in use. Stop the other process using this port or choose a different port in settings."
        );
    }
    if code == Some(98) || code == Some(48) {
        // Linux EADDRINUSE, macOS EADDRINUSE
        return format!(
            "Port {port} is already in use. Stop the other process or choose a different port."
        );
    }
    format!("Failed to bind port {port}: {e}")
}

/// Abort all proxy tasks so bound ports are released. Call when start fails partway.
fn abort_proxy_handles(handles: &mut Vec<tokio::task::JoinHandle<()>>) {
    for h in handles.drain(..) {
        h.abort();
    }
}

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

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddLocalRoutePayload {
    pub domain: String,
    pub target_host: String,
    pub target_port: u16,
}

#[tauri::command]
pub fn add_local_route(
    payload: AddLocalRoutePayload,
    route_service: tauri::State<'_, std::sync::Arc<LocalRouteService>>,
) -> Result<ApiResponse<LocalRoute>, String> {
    let route = route_service.add(payload.domain, payload.target_host, payload.target_port);
    Ok(ApiResponse {
        message: "Route added".to_string(),
        success: true,
        data: route,
    })
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLocalRoutePayload {
    pub id: u32,
    pub domain: Option<String>,
    pub target_host: Option<String>,
    pub target_port: Option<u16>,
    pub enabled: Option<bool>,
}

#[tauri::command]
pub fn update_local_route(
    payload: UpdateLocalRoutePayload,
    route_service: tauri::State<'_, std::sync::Arc<LocalRouteService>>,
) -> Result<ApiResponse<Option<LocalRoute>>, String> {
    let route = route_service.update(
        payload.id,
        payload.domain,
        payload.target_host,
        payload.target_port,
        payload.enabled,
    );
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

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveLocalRoutePayload {
    pub id: u32,
}

#[tauri::command]
pub fn remove_local_route(
    payload: RemoveLocalRoutePayload,
    route_service: tauri::State<'_, std::sync::Arc<LocalRouteService>>,
) -> Result<ApiResponse<Option<LocalRoute>>, String> {
    let route = route_service.remove(payload.id);
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

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetLocalRouteEnabledPayload {
    pub id: u32,
    pub enabled: bool,
}

#[tauri::command]
pub fn set_local_route_enabled(
    payload: SetLocalRouteEnabledPayload,
    route_service: tauri::State<'_, std::sync::Arc<LocalRouteService>>,
) -> Result<ApiResponse<Option<LocalRoute>>, String> {
    let route = route_service.set_enabled(payload.id, payload.enabled);
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
/// Reverse HTTP port when running; 0 when not used.
static PROXY_REVERSE_HTTP: AtomicU16 = AtomicU16::new(0);
/// Reverse HTTPS port when running; 0 when not used.
static PROXY_REVERSE_HTTPS: AtomicU16 = AtomicU16::new(0);
static PROXY_HANDLES: std::sync::Mutex<Vec<tokio::task::JoinHandle<()>>> =
    std::sync::Mutex::new(Vec::new());

#[tauri::command]
pub async fn get_proxy_status() -> Result<ApiResponse<ProxyStatusPayload>, String> {
    let port = PROXY_PORT.load(Ordering::Relaxed);
    let rh = PROXY_REVERSE_HTTP.load(Ordering::Relaxed);
    let rht = PROXY_REVERSE_HTTPS.load(Ordering::Relaxed);
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
            reverse_http_port: if rh != 0 { Some(rh) } else { None },
            reverse_https_port: if rht != 0 { Some(rht) } else { None },
        },
    })
}

#[derive(serde::Serialize)]
pub struct ProxyStatusPayload {
    pub running: bool,
    pub port: u16,
    /// Reverse HTTP listener port (no system proxy; use hosts + this port).
    pub reverse_http_port: Option<u16>,
    /// Reverse HTTPS listener port (TLS by Host).
    pub reverse_https_port: Option<u16>,
}

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

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetProxyDnsServerPayload {
    pub dns_server: Option<String>,
}

#[tauri::command]
pub fn set_proxy_dns_server(
    payload: SetProxyDnsServerPayload,
    proxy_settings_service: tauri::State<'_, ProxySettingsService>,
) -> Result<ApiResponse<ProxySettings>, String> {
    let settings = proxy_settings_service.set_dns_server(payload.dns_server);
    Ok(ApiResponse {
        message: "DNS server updated".to_string(),
        success: true,
        data: settings,
    })
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetProxyPortPayload {
    pub port: u16,
}

#[tauri::command]
pub fn set_proxy_port(
    payload: SetProxyPortPayload,
    proxy_settings_service: tauri::State<'_, ProxySettingsService>,
) -> Result<ApiResponse<ProxySettings>, String> {
    let settings = proxy_settings_service.set_proxy_port(payload.port);
    Ok(ApiResponse {
        message: format!("Proxy port set to {}", settings.proxy_port),
        success: true,
        data: settings,
    })
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartLocalProxyPayload {
    pub port: Option<u16>,
}

#[tauri::command]
pub async fn start_local_proxy(
    app: AppHandle,
    payload: Option<StartLocalProxyPayload>,
    route_service: tauri::State<'_, std::sync::Arc<LocalRouteService>>,
    proxy_settings_service: tauri::State<'_, ProxySettingsService>,
) -> Result<ApiResponse<ProxyStatusPayload>, String> {
    let port = payload
        .and_then(|p| p.port)
        .unwrap_or_else(|| proxy_settings_service.get().proxy_port);
    if PROXY_PORT.load(Ordering::Relaxed) != 0 {
        let payload = ProxyStatusPayload {
            running: true,
            port: PROXY_PORT.load(Ordering::Relaxed),
            reverse_http_port: (PROXY_REVERSE_HTTP.load(Ordering::Relaxed) != 0)
                .then_some(PROXY_REVERSE_HTTP.load(Ordering::Relaxed)),
            reverse_https_port: (PROXY_REVERSE_HTTPS.load(Ordering::Relaxed) != 0)
                .then_some(PROXY_REVERSE_HTTPS.load(Ordering::Relaxed)),
        };
        let _ = app.emit(PROXY_STATUS_CHANGED, &payload);
        return Ok(ApiResponse {
            message: "Proxy already running".to_string(),
            success: true,
            data: payload,
        });
    }
    let settings = proxy_settings_service.get();
    let dns_server = settings.dns_server;
    let reverse_http = settings.reverse_http_port.filter(|&p| p > 0);
    let reverse_https = settings.reverse_https_port.filter(|&p| p > 0);

    // Ports must be distinct (each socket address can only be used once).
    let mut used = std::collections::HashSet::from([port]);
    if let Some(rh) = reverse_http {
        if !used.insert(rh) {
            return Err(format!(
                "Reverse HTTP port {rh} is already used by the main proxy port. Use different ports."
            ));
        }
    }
    if let Some(rht) = reverse_https {
        if !used.insert(rht) {
            return Err(format!(
                "Reverse HTTPS port {rht} is already in use (same as proxy or reverse HTTP). Use a different port."
            ));
        }
    }

    let mut handles = Vec::new();

    match local_proxy::run_proxy(
        port,
        std::sync::Arc::clone(&*route_service),
        dns_server.clone(),
    )
    .await
    {
        Ok(h0) => handles.push(h0),
        Err(e) => return Err(map_bind_error(port, e)),
    }

    if let Some(rh) = reverse_http {
        match local_proxy::run_reverse_proxy_http(
            rh,
            std::sync::Arc::clone(&*route_service),
            dns_server.clone(),
            Some(port),
        )
        .await
        {
            Ok(h) => {
                handles.push(h);
                PROXY_REVERSE_HTTP.store(rh, Ordering::Relaxed);
            }
            Err(e) => {
                abort_proxy_handles(&mut handles);
                return Err(map_bind_error(rh, e));
            }
        }
    }
    if let Some(rht) = reverse_https {
        match local_proxy::run_reverse_proxy_https(
            rht,
            std::sync::Arc::clone(&*route_service),
            dns_server,
            Some(port),
        )
        .await
        {
            Ok(h) => {
                handles.push(h);
                PROXY_REVERSE_HTTPS.store(rht, Ordering::Relaxed);
            }
            Err(e) => {
                abort_proxy_handles(&mut handles);
                return Err(map_bind_error(rht, e));
            }
        }
    }

    PROXY_PORT.store(port, Ordering::Relaxed);
    let mut guard = PROXY_HANDLES.lock().map_err(|e| e.to_string())?;
    *guard = handles;

    let payload = ProxyStatusPayload {
        running: true,
        port,
        reverse_http_port: reverse_http,
        reverse_https_port: reverse_https,
    };
    let _ = app.emit(PROXY_STATUS_CHANGED, &payload);
    let mut msg = format!("Proxy started on 127.0.0.1:{port}");
    if let Some(p) = reverse_http {
        let _ = write!(&mut msg, ", reverse HTTP :{p}");
    }
    if let Some(p) = reverse_https {
        let _ = write!(&mut msg, ", reverse HTTPS :{p}");
    }
    Ok(ApiResponse {
        message: msg,
        success: true,
        data: payload,
    })
}

/// Returns the setup page URL when proxy is running and a reverse port is configured.
/// Frontend can open this URL in the browser (e.g. via opener plugin).
#[tauri::command]
pub fn get_proxy_setup_url() -> Result<ApiResponse<String>, String> {
    let port = PROXY_PORT.load(Ordering::Relaxed);
    if port == 0 {
        return Err("Proxy is not running".to_string());
    }
    let rh = PROXY_REVERSE_HTTP.load(Ordering::Relaxed);
    let rht = PROXY_REVERSE_HTTPS.load(Ordering::Relaxed);
    let url = if rh != 0 {
        format!("http://127.0.0.1:{rh}/.watchtower/setup")
    } else if rht != 0 {
        format!("https://127.0.0.1:{rht}/.watchtower/setup")
    } else {
        return Err("No reverse port configured. Set reverse HTTP or HTTPS port and start the proxy.".to_string());
    };
    Ok(ApiResponse {
        message: "OK".to_string(),
        success: true,
        data: url,
    })
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetProxyReversePortsPayload {
    pub reverse_http_port: Option<u16>,
    pub reverse_https_port: Option<u16>,
}

#[tauri::command]
pub fn set_proxy_reverse_ports(
    payload: SetProxyReversePortsPayload,
    proxy_settings_service: tauri::State<'_, ProxySettingsService>,
) -> Result<ApiResponse<ProxySettings>, String> {
    let settings = proxy_settings_service.set_reverse_ports(
        payload.reverse_http_port,
        payload.reverse_https_port,
    );
    Ok(ApiResponse {
        message: "Reverse ports updated (apply on next proxy start)".to_string(),
        success: true,
        data: settings,
    })
}

#[tauri::command]
pub fn stop_local_proxy(app: AppHandle) -> Result<ApiResponse<ProxyStatusPayload>, String> {
    let mut guard = PROXY_HANDLES.lock().map_err(|e| e.to_string())?;
    for h in guard.drain(..) {
        h.abort();
    }
    let _ = PROXY_PORT.swap(0, Ordering::Relaxed);
    let _ = PROXY_REVERSE_HTTP.swap(0, Ordering::Relaxed);
    let _ = PROXY_REVERSE_HTTPS.swap(0, Ordering::Relaxed);
    let payload = ProxyStatusPayload {
        running: false,
        port: 0,
        reverse_http_port: None,
        reverse_https_port: None,
    };
    let _ = app.emit(PROXY_STATUS_CHANGED, &payload);
    Ok(ApiResponse {
        message: "Proxy stopped".to_string(),
        success: true,
        data: payload,
    })
}
