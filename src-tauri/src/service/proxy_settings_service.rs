use crate::model::proxy_settings::ProxySettings;
use crate::storage::versioned::{load_versioned, save_versioned};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct ProxySettingsService {
    settings: Mutex<ProxySettings>,
    storage_path: PathBuf,
}

impl ProxySettingsService {
    pub fn new(storage_path: PathBuf) -> Self {
        let settings = load_versioned(&storage_path);
        Self {
            settings: Mutex::new(settings),
            storage_path,
        }
    }

    fn save(&self, s: &ProxySettings) {
        save_versioned(&self.storage_path, s);
    }

    pub fn get(&self) -> ProxySettings {
        self.settings.lock().unwrap().clone()
    }

    pub fn set_dns_server(&self, dns_server: Option<String>) -> ProxySettings {
        let mut s = self.settings.lock().unwrap();
        s.dns_server = dns_server.map(|s| s.trim().to_string()).and_then(|s| {
            if s.is_empty() {
                None
            } else {
                Some(s)
            }
        });
        let out = s.clone();
        self.save(&out);
        out
    }

    /// Set the port the proxy will listen on (1–65535). Takes effect on next proxy start.
    pub fn set_proxy_port(&self, port: u16) -> ProxySettings {
        let port = port.clamp(1, 65535);
        let mut s = self.settings.lock().unwrap();
        s.proxy_port = port;
        let out = s.clone();
        self.save(&out);
        out
    }

    /// Set reverse proxy ports. None = disabled. Takes effect on next proxy start.
    pub fn set_reverse_ports(
        &self,
        reverse_http_port: Option<u16>,
        reverse_https_port: Option<u16>,
    ) -> ProxySettings {
        let mut s = self.settings.lock().unwrap();
        s.reverse_http_port = reverse_http_port.filter(|&p| p > 0);
        s.reverse_https_port = reverse_https_port.filter(|&p| p > 0);
        let out = s.clone();
        self.save(&out);
        out
    }

    /// Replace all settings (for import).
    pub fn replace_all(&self, settings: ProxySettings) -> ProxySettings {
        let mut s = self.settings.lock().unwrap();
        *s = settings;
        self.save(&s);
        s.clone()
    }
}
