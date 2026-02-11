use crate::model::api_response::ApiResponse;
use crate::model::local_route::LocalRoute;
use crate::model::proxy_settings::ProxySettings;
use crate::service::local_proxy;
use crate::service::local_route_service::LocalRouteService;
use crate::service::proxy_settings_service::ProxySettingsService;
use std::io;
use std::sync::atomic::{AtomicU16, Ordering};
use tauri::{AppHandle, Emitter};

/// Turns a bind/listen error into a user-friendly message (e.g. port already in use).
fn map_bind_error(port: u16, e: io::Error) -> String {
    let code = e.raw_os_error();
    if code == Some(10048) {
        // Windows WSAEADDRINUSE
        return format!(
            "Port {} is already in use. Stop the other process using this port or choose a different port in settings.",
            port
        );
    }
    if code == Some(98) || code == Some(48) {
        // Linux EADDRINUSE, macOS EADDRINUSE
        return format!(
            "Port {} is already in use. Stop the other process or choose a different port.",
            port
        );
    }
    format!("Failed to bind port {}: {}", port, e)
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
pub fn set_proxy_port(
    proxy_settings_service: tauri::State<'_, ProxySettingsService>,
    port: u16,
) -> Result<ApiResponse<ProxySettings>, String> {
    let settings = proxy_settings_service.set_proxy_port(port);
    Ok(ApiResponse {
        message: format!("Proxy port set to {}", settings.proxy_port),
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
    let port = port.unwrap_or_else(|| proxy_settings_service.get().proxy_port);
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
                "Reverse HTTP port {} is already used by the main proxy port. Use different ports.",
                rh
            ));
        }
    }
    if let Some(rht) = reverse_https {
        if !used.insert(rht) {
            return Err(format!(
                "Reverse HTTPS port {} is already in use (same as proxy or reverse HTTP). Use a different port.",
                rht
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
    let mut msg = format!("Proxy started on 127.0.0.1:{}", port);
    if let Some(p) = reverse_http {
        msg.push_str(&format!(", reverse HTTP :{p}"));
    }
    if let Some(p) = reverse_https {
        msg.push_str(&format!(", reverse HTTPS :{p}"));
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
        format!("http://127.0.0.1:{}/.watchtower/setup", rh)
    } else if rht != 0 {
        format!("https://127.0.0.1:{}/.watchtower/setup", rht)
    } else {
        return Err("No reverse port configured. Set reverse HTTP or HTTPS port and start the proxy.".to_string());
    };
    Ok(ApiResponse {
        message: "OK".to_string(),
        success: true,
        data: url,
    })
}

#[tauri::command]
pub fn set_proxy_reverse_ports(
    proxy_settings_service: tauri::State<'_, ProxySettingsService>,
    reverse_http_port: Option<u16>,
    reverse_https_port: Option<u16>,
) -> Result<ApiResponse<ProxySettings>, String> {
    let settings = proxy_settings_service.set_reverse_ports(reverse_http_port, reverse_https_port);
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
