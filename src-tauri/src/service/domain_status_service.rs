use crate::model::domain_status::DomainStatus;
use crate::service::domain_group_link_service::DomainGroupLinkService;
use crate::service::domain_group_service::DomainGroupService;
use crate::service::domain_service::DomainService;
use crate::service::proxy_settings_service::ProxySettingsService;
use chrono::{Local, Utc};
use hickory_resolver::config::{NameServerConfigGroup, ResolverConfig};
use hickory_resolver::name_server::TokioConnectionProvider;
use hickory_resolver::Resolver;
use std::collections::{HashMap, HashSet};
use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::net::{IpAddr, SocketAddr};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DomainStatusService {
    pub last_checks: Mutex<Vec<DomainStatus>>,
    pub base_dir: PathBuf,
}

fn parse_dns_server(s: &str) -> Option<(IpAddr, u16)> {
    let s = s.trim();
    if s.is_empty() {
        return None;
    }
    if let Some((ip_str, port_str)) = s.split_once(':') {
        let ip: IpAddr = ip_str.trim().parse().ok()?;
        let port: u16 = port_str.trim().parse().ok()?;
        Some((ip, port))
    } else {
        let ip: IpAddr = s.parse().ok()?;
        Some((ip, 53))
    }
}

/// Extract hostname from URL (no port). e.g. "https://example.com:8080/path" -> "example.com".
fn host_from_url(url: &str) -> Option<String> {
    let url = url.trim();
    let authority = if let Some(rest) = url.strip_prefix("https://") {
        rest.split('/').next().unwrap_or(rest)
    } else if let Some(rest) = url.strip_prefix("http://") {
        rest.split('/').next().unwrap_or(rest)
    } else if !url.is_empty() && !url.starts_with('/') {
        url.split('/').next().unwrap_or(url)
    } else {
        return None;
    };
    let host = if let Some((h, p)) = authority.split_once(':') {
        if p.chars().all(|c| c.is_ascii_digit()) {
            h
        } else {
            authority
        }
    } else {
        authority
    };
    Some(host.to_string())
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

    pub async fn check_domains(
        &self,
        domain_service: &DomainService,
        group_service: &DomainGroupService,
        link_service: &DomainGroupLinkService,
        proxy_settings_service: &ProxySettingsService,
    ) -> Vec<DomainStatus> {
        let domains = domain_service.get_all();
        let groups = group_service.get_all();
        let dns_server = proxy_settings_service.get().dns_server;

        let mut client_builder = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .user_agent("Watchtower/0.1.0");

        if let Some(ref dns) = dns_server {
            if let Some((ip, port)) = parse_dns_server(dns) {
                let config = ResolverConfig::from_parts(
                    None,
                    vec![],
                    NameServerConfigGroup::from_ips_clear(&[ip], port, true),
                );
                let resolver = Resolver::builder_with_config(
                    config,
                    TokioConnectionProvider::default(),
                )
                .build();
                {
                    let full_urls: Vec<String> = domains
                        .iter()
                        .map(|d| {
                            if d.url.starts_with("http") {
                                d.url.clone()
                            } else {
                                format!("https://{}", d.url)
                            }
                        })
                        .collect();
                    let unique_hosts: HashSet<String> = full_urls
                        .iter()
                        .filter_map(|u| host_from_url(u))
                        .collect();
                    let mut host_to_ip: HashMap<String, IpAddr> = HashMap::new();
                    for host in &unique_hosts {
                        if let Ok(lookup) = resolver.lookup_ip(host.as_str()).await {
                            if let Some(addr) = lookup.iter().next().map(IpAddr::from) {
                                host_to_ip.insert(host.clone(), addr);
                            }
                        }
                    }
                    for (host, addr) in &host_to_ip {
                        client_builder = client_builder.resolve(
                            host.as_str(),
                            SocketAddr::new(*addr, 443),
                        );
                    }
                }
            }
        }

        let client = client_builder
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let tasks: Vec<_> = domains
            .into_iter()
            .map(|domain| {
                let client = client.clone();
                let group_ids = link_service.get_group_ids_for_domain(domain.id);
                let group_name = if group_ids.is_empty() {
                    "Default".to_string()
                } else {
                    group_ids
                        .iter()
                        .filter_map(|gid| groups.iter().find(|g| g.id == *gid))
                        .map(|g| g.name.as_str())
                        .collect::<Vec<_>>()
                        .join(", ")
                };

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
                                level: if ok {
                                    "info".to_string()
                                } else if sc.is_client_error() {
                                    "warning".to_string()
                                } else {
                                    "error".to_string()
                                },
                                latency,
                                ok,
                                group: group_name.clone(),
                                timestamp: Utc::now(),
                                error_message: if ok {
                                    Some("Operation successful".to_string())
                                } else {
                                    Some(format!("HTTP Error: {}", sc))
                                },
                            }
                        }
                        Err(e) => DomainStatus {
                            url: domain.url.clone(),
                            status: "Request Error".to_string(),
                            level: "error".to_string(),
                            latency,
                            ok: false,
                            group: group_name,
                            timestamp: Utc::now(),
                            error_message: Some(e.to_string()),
                        },
                    }
                }
            })
            .collect();

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
        content
            .lines()
            .filter_map(|line| serde_json::from_str::<DomainStatus>(line).ok())
            .collect()
    }
}
