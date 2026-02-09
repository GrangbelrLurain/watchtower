use crate::model::domain_status::DomainStatus;
use crate::service::domain_service::DomainService;
use chrono::{Utc, Local};
use std::sync::Mutex;
use std::path::PathBuf;
use std::fs::{OpenOptions, create_dir_all};
use std::io::Write;

pub struct DomainStatusService {
    pub last_checks: Mutex<Vec<DomainStatus>>,
    pub base_dir: PathBuf,
}

impl DomainStatusService {
    pub fn new(base_dir: PathBuf) -> Self {
        if !base_dir.exists() {
            create_dir_all(&base_dir).expect("failed to create logs directory");
        }
        Self {
            last_checks: Mutex::new(Vec::new()),
            base_dir,
        }
    }

    pub async fn check_domains(&self, domain_service: &DomainService) -> Vec<DomainStatus> {
        let domains = domain_service.get_all();
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .user_agent("Watchtower/0.1.0")
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let tasks: Vec<_> = domains.into_iter().map(|domain| {
            let client = client.clone();
            async move {
                let start = std::time::Instant::now();
                let url = if domain.url.starts_with("http") {
                    domain.url.clone()
                } else {
                    format!("https://{}", domain.url)
                };

                let response = client.head(&url).send().await;
                let latency = start.elapsed().as_millis() as u32;

                match response {
                    Ok(resp) => {
                        let sc = resp.status();
                        let ok = sc.is_success() || sc.is_redirection();
                        DomainStatus {
                            url: domain.url.clone(),
                            status: format!("{}", sc),
                            level: if ok { "info".to_string() } else if sc.is_client_error() { "warning".to_string() } else { "error".to_string() },
                            latency,
                            ok,
                            group: domain.group_id.map(|id| format!("Group {}", id)).unwrap_or_else(|| "Default".to_string()),
                            timestamp: Utc::now(),
                        }
                    }
                    Err(e) => DomainStatus {
                        url: domain.url.clone(),
                        status: e.to_string(),
                        level: "error".to_string(),
                        latency,
                        ok: false,
                        group: domain.group_id.map(|id| format!("Group {}", id)).unwrap_or_else(|| "Default".to_string()),
                        timestamp: Utc::now(),
                    },
                }
            }
        }).collect();

        let results = futures::future::join_all(tasks).await;

        // Save logs to file
        let today = Local::now().format("%Y-%m-%d").to_string();
        let log_file_path = self.base_dir.join(format!("{}.json", today));
        
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_file_path) 
        {
            for result in &results {
                if let Ok(json) = serde_json::to_string(result) {
                    let _ = writeln!(file, "{}", json);
                }
            }
        }

        let mut last_checks = self.last_checks.lock().unwrap();
        *last_checks = results.clone();
        
        results
    }

    pub fn get_last_status(&self) -> Vec<DomainStatus> {
        self.last_checks.lock().unwrap().clone()
    }

    pub fn get_logs_by_date(&self, date: String) -> Vec<DomainStatus> {
        let log_file_path = self.base_dir.join(format!("{}.json", date));
        if !log_file_path.exists() {
            return Vec::new();
        }

        let content = std::fs::read_to_string(log_file_path).unwrap_or_default();
        content.lines()
            .filter_map(|line| serde_json::from_str::<DomainStatus>(line).ok())
            .collect()
    }
}
