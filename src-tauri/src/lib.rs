// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

mod model {
    pub mod api_response;
    pub mod domain;
    pub mod domain_group;
    pub mod domain_group_link;
    pub mod domain_status;
    pub mod local_route;
    pub mod proxy_settings;
    pub mod settings_export;
}
mod service {
    pub mod domain_group_link_service;
    pub mod domain_group_service;
    pub mod domain_service;
    pub mod domain_status_service;
    pub mod local_proxy;
    pub mod local_route_service;
    pub mod proxy_settings_service;
}

use crate::service::domain_group_link_service::DomainGroupLinkService;
use crate::service::domain_group_service::DomainGroupService;
use crate::service::domain_service::DomainService;
use crate::service::domain_status_service::DomainStatusService;
use crate::service::local_route_service::LocalRouteService;
use crate::service::proxy_settings_service::ProxySettingsService;
use std::sync::Arc;

mod command {
    pub mod domain_commands;
    pub mod domain_group_commands;
    pub mod domain_status_command;
    pub mod local_route_commands;
    pub mod settings_commands;
}

use command::domain_commands::*;
use command::domain_group_commands::*;
use command::domain_status_command::*;
use command::local_route_commands::*;
use command::settings_commands::*;

#[tauri::command]
fn check_apis() {
    println!("check_apis");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Required by rustls 0.23: set process-wide crypto provider before any TLS (e.g. reverse HTTPS proxy).
    let _ = rustls::crypto::ring::default_provider()
        .install_default()
        .expect("rustls default crypto provider");

    tauri::Builder::default()
        .setup(|app| {
            use std::fs;
            use tauri::Manager;

            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            if !app_data_dir.exists() {
                fs::create_dir_all(&app_data_dir).expect("failed to create app data dir");
            }

            let storage_path = app_data_dir.join("domains.json");
            let groups_storage_path = app_data_dir.join("groups.json");
            let links_storage_path = app_data_dir.join("domain_group_links.json");
            let logs_dir = app_data_dir.join("logs");
            let local_routes_path = app_data_dir.join("domain_local_routes.json");
            let proxy_settings_path = app_data_dir.join("proxy_settings.json");

            let domain_service = DomainService::new(storage_path);
            let group_service = DomainGroupService::new(groups_storage_path);
            let link_service = DomainGroupLinkService::new(links_storage_path);
            let status_service = DomainStatusService::new(logs_dir);
            let local_route_service = Arc::new(LocalRouteService::new(local_routes_path));
            let proxy_settings_service = ProxySettingsService::new(proxy_settings_path);

            app.manage(domain_service);
            app.manage(group_service);
            app.manage(link_service);
            app.manage(status_service);
            app.manage(local_route_service);
            app.manage(proxy_settings_service);

            // Background status check probe
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    {
                        use tauri::Manager;
                        let domain_service = handle.state::<DomainService>();
                        let group_service = handle.state::<DomainGroupService>();
                        let link_service = handle.state::<DomainGroupLinkService>();
                        let status_service = handle.state::<DomainStatusService>();
                        let proxy_settings_service = handle.state::<ProxySettingsService>();

                        // Perform checks (uses global DNS from Settings when set)
                        let _ = status_service
                            .check_domains(
                                &domain_service,
                                &group_service,
                                &link_service,
                                &proxy_settings_service,
                            )
                            .await;
                       println!("Background status check completed at {:?}", chrono::Local::now());
                    }
                    // Wait for 2 minutes before next check
                    tokio::time::sleep(std::time::Duration::from_secs(120)).await;
                }
            });

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            check_apis,
            regist_domains,
            get_domains,
            remove_domains,
            get_domain_by_id,
            update_domain_by_id,
            import_domains,
            clear_all_domains,
            get_latest_status,
            check_domain_status,
            get_domain_status_logs,
            get_domain_group_links,
            set_domain_groups,
            set_group_domains,
            get_domains_by_group,
            get_groups_for_domain,
            create_group,
            get_groups,
            delete_group,
            update_group,
            get_local_routes,
            add_local_route,
            update_local_route,
            remove_local_route,
            set_local_route_enabled,
            get_proxy_status,
            start_local_proxy,
            stop_local_proxy,
            get_proxy_settings,
            set_proxy_dns_server,
            set_proxy_port,
            set_proxy_reverse_ports,
            get_proxy_setup_url,
            export_all_settings,
            import_all_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
