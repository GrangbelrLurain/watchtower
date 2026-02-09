// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

mod model {
    pub mod api_response;
    pub mod domain;
    pub mod domain_status;
}
mod service {
    pub mod domain_service;
    pub mod domain_status_service;
}

use crate::service::domain_service::DomainService;
use crate::service::domain_status_service::DomainStatusService;

mod command {
    pub mod domain_commands;
    pub mod domain_status_command;
}

use command::domain_commands::*;
use command::domain_status_command::*;

#[tauri::command]
fn check_apis() {
    println!("check_apis");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
            let logs_dir = app_data_dir.join("logs");
            
            let domain_service = DomainService::new(storage_path);
            let status_service = DomainStatusService::new(logs_dir);
            
            app.manage(domain_service);
            app.manage(status_service);

            // Background status check probe
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    {
                        use tauri::Manager;
                        let domain_service = handle.state::<DomainService>();
                        let status_service = handle.state::<DomainStatusService>();
                        
                        // Perform checks
                        let _ = status_service.check_domains(&domain_service).await;
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
