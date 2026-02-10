use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ProxySettings {
    /// Optional DNS server for pass-through resolution (e.g. "8.8.8.8" or "1.1.1.1:53").
    /// When set, hosts not matching any local route are resolved via this server before forwarding.
    pub dns_server: Option<String>,
}
