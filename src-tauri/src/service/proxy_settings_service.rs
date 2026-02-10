use crate::model::proxy_settings::ProxySettings;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct ProxySettingsService {
    settings: Mutex<ProxySettings>,
    storage_path: PathBuf,
}

impl ProxySettingsService {
    pub fn new(storage_path: PathBuf) -> Self {
        let settings = if storage_path.exists() {
            if let Ok(content) = fs::read_to_string(&storage_path) {
                serde_json::from_str::<ProxySettings>(&content).unwrap_or_default()
            } else {
                ProxySettings::default()
            }
        } else {
            ProxySettings::default()
        };
        Self {
            settings: Mutex::new(settings),
            storage_path,
        }
    }

    fn save(&self, s: &ProxySettings) {
        if let Ok(content) = serde_json::to_string_pretty(s) {
            let _ = fs::write(&self.storage_path, content);
        }
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

    /// Replace all settings (for import).
    pub fn replace_all(&self, settings: ProxySettings) -> ProxySettings {
        let mut s = self.settings.lock().unwrap();
        *s = settings;
        self.save(&s);
        s.clone()
    }
}
