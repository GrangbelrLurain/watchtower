// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! You've been greeted from Rust!")
}

mod storage {
    pub mod migration;
    pub mod versioned;
}
mod model {
    pub mod api_response;
    pub mod domain;
    pub mod domain_api_logging_link;
    pub mod domain_group;
    pub mod domain_group_link;
    pub mod domain_monitor_link;
    pub mod domain_status_log;
    pub mod local_route;
    pub mod proxy_settings;
    pub mod settings_export;
}
mod service {
    pub mod api_logging_settings_service;
    pub mod domain_group_link_service;
    pub mod domain_group_service;
    pub mod domain_monitor_service;
    pub mod domain_service;
    pub mod local_proxy;
    pub mod local_route_service;
    pub mod proxy_settings_service;
}

use crate::service::api_logging_settings_service::ApiLoggingSettingsService;
use crate::service::domain_group_link_service::DomainGroupLinkService;
use crate::service::domain_group_service::DomainGroupService;
use crate::service::domain_monitor_service::DomainMonitorService;
use crate::service::domain_service::DomainService;
use crate::service::local_route_service::LocalRouteService;
use crate::service::proxy_settings_service::ProxySettingsService;
use std::sync::Arc;

mod command {
    pub mod api_log_commands;
    pub mod domain_commands;
    pub mod domain_group_commands;
    pub mod domain_monitor_command;
    pub mod local_route_commands;
    pub mod settings_commands;
}

use command::domain_commands::{
    clear_all_domains, get_domain_by_id, get_domains, import_domains, regist_domains,
    remove_domains, update_domain_by_id,
};
use command::domain_group_commands::{
    create_group, delete_group, get_domain_group_links, get_domains_by_group, get_groups,
    get_groups_for_domain, set_domain_groups, set_group_domains, update_group,
};
use command::domain_monitor_command::{
    check_domain_status, get_domain_monitor_list, get_domain_status_logs, get_latest_status,
    set_domain_monitor_check_enabled,
};
use command::local_route_commands::{
    add_local_route, get_local_routes, get_proxy_auto_start_error, get_proxy_settings,
    get_proxy_setup_url, get_proxy_status, remove_local_route, set_local_route_enabled,
    set_local_routing_enabled, set_proxy_dns_server, set_proxy_port, set_proxy_reverse_ports,
    start_local_proxy, stop_local_proxy, update_local_route,
};
use command::api_log_commands::{
    get_domain_api_logging_links, remove_domain_api_logging, set_domain_api_logging,
};
use command::settings_commands::{export_all_settings, import_all_settings};

#[tauri::command]
fn check_apis() {
    println!("check_apis");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Required by rustls 0.23: set process-wide crypto provider before any TLS (e.g. reverse HTTPS proxy).
    let () = rustls::crypto::ring::default_provider()
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

            // Tauri 메인 로직 시작 전 마이그레이션 (1→2→3 순차)
            crate::storage::migration::run_all(&app_data_dir);

            let storage_path = app_data_dir.join("domains.json");
            let groups_storage_path = app_data_dir.join("groups.json");
            let links_storage_path = app_data_dir.join("domain_group_links.json");
            let logs_dir = app_data_dir.join("logs");
            let monitor_links_path = app_data_dir.join("domain_monitor_links.json");
            let local_routes_path = app_data_dir.join("domain_local_routes.json");
            let proxy_settings_path = app_data_dir.join("proxy_settings.json");
            let api_logging_path = app_data_dir.join("domain_api_logging_links.json");
            let domain_service = DomainService::new(storage_path);
            let group_service = DomainGroupService::new(groups_storage_path);
            let link_service = DomainGroupLinkService::new(links_storage_path);
            let monitor_service = DomainMonitorService::new(logs_dir, monitor_links_path);
            let local_route_service = Arc::new(LocalRouteService::new(local_routes_path));
            let proxy_settings_service = ProxySettingsService::new(proxy_settings_path);
            let api_logging_service = ApiLoggingSettingsService::new(api_logging_path);
            monitor_service.sync_with_domains(&domain_service.get_all());
            api_logging_service.refresh_map(&domain_service.get_all());

            // Clone/read values needed for auto-start before `app.manage()` moves them.
            let route_svc_for_proxy = Arc::clone(&local_route_service);
            let proxy_settings_snapshot = proxy_settings_service.get();

            app.manage(domain_service);
            app.manage(group_service);
            app.manage(link_service);
            app.manage(monitor_service);
            app.manage(local_route_service);
            app.manage(proxy_settings_service);
            app.manage(api_logging_service);

            // ── Auto-start proxy ────────────────────────────────────────────
            {
                let app_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    use tauri::Emitter;
                    match command::local_route_commands::auto_start_proxy(
                        route_svc_for_proxy,
                        &proxy_settings_snapshot,
                    )
                    .await
                    {
                        Ok(()) => {
                            command::local_route_commands::set_auto_start_error(None);
                            let _ = app_handle.emit(
                                command::local_route_commands::PROXY_STATUS_CHANGED,
                                &command::local_route_commands::get_proxy_status_payload(),
                            );
                        }
                        Err(e) => {
                            eprintln!("[auto-start] proxy failed: {e}");
                            command::local_route_commands::set_auto_start_error(Some(e.clone()));
                            let _ = app_handle.emit(
                                command::local_route_commands::PROXY_AUTO_START_ERROR,
                                &e,
                            );
                        }
                    }
                });
            }

            // Background status check probe (runs every 2 min for domains with check_enabled)
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    {
                        use tauri::Manager;
                        let domain_service = handle.state::<DomainService>();
                        let group_service = handle.state::<DomainGroupService>();
                        let link_service = handle.state::<DomainGroupLinkService>();
                        let monitor_service = handle.state::<DomainMonitorService>();
                        let proxy_settings_service = handle.state::<ProxySettingsService>();

                        // Perform checks (uses global DNS from Settings when set)
                        let _ = monitor_service
                            .check_domains(
                                &domain_service,
                                &group_service,
                                &link_service,
                                &proxy_settings_service,
                            )
                            .await;
                        println!(
                            "Background status check completed at {:?}",
                            chrono::Local::now()
                        );
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
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            get_domain_monitor_list,
            set_domain_monitor_check_enabled,
            get_domain_api_logging_links,
            set_domain_api_logging,
            remove_domain_api_logging,
            set_local_routing_enabled,
            get_proxy_auto_start_error,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
