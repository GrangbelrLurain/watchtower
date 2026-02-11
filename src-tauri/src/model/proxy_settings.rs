use serde::{Deserialize, Serialize};

fn default_proxy_port() -> u16 {
    8888
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProxySettings {
    /// Optional DNS server for pass-through resolution (e.g. "8.8.8.8" or "1.1.1.1:53").
    /// When set, hosts not matching any local route are resolved via this server before forwarding.
    pub dns_server: Option<String>,
    /// Port the local reverse proxy listens on (e.g. 8888). User-configurable to avoid conflicts.
    #[serde(default = "default_proxy_port")]
    pub proxy_port: u16,
    /// Optional reverse HTTP port (e.g. 8080). When set, proxy listens here for direct HTTP.
    /// No system proxy or hosts file: open <http://127.0.0.1:8080> and traffic is routed by Host (127.0.0.1 → first local route).
    #[serde(default)]
    pub reverse_http_port: Option<u16>,
    /// Optional reverse HTTPS port (e.g. 8443). When set, proxy does TLS and forwards by Host.
    #[serde(default)]
    pub reverse_https_port: Option<u16>,
}

impl Default for ProxySettings {
    fn default() -> Self {
        Self {
            dns_server: None,
            proxy_port: default_proxy_port(),
            reverse_http_port: None,
            reverse_https_port: None,
        }
    }
}
