use crate::model::api_log::ApiLogEntry;
use std::collections::VecDeque;
use std::sync::Mutex;
use std::path::PathBuf;
use crate::storage::versioned::{load_versioned, save_versioned}; // Import for persistence

pub struct ApiLogService {
    storage_path: PathBuf,
    logs: Mutex<VecDeque<ApiLogEntry>>,
    max_logs: usize,
}

impl ApiLogService {
    pub fn new(storage_path: PathBuf, max_logs: usize) -> Self {
        // Load existing logs from disk on startup
        let mut loaded_logs: Vec<ApiLogEntry> = load_versioned(&storage_path);
        // Ensure max_logs limit is respected from loaded logs
        if loaded_logs.len() > max_logs {
            loaded_logs.drain(0..loaded_logs.len() - max_logs);
        }
        let logs = Mutex::new(VecDeque::from(loaded_logs));

        Self {
            storage_path,
            logs,
            max_logs,
        }
    }

    fn save_logs(&self, logs: &VecDeque<ApiLogEntry>) {
        save_versioned(&self.storage_path, &logs.iter().cloned().collect::<Vec<_>>());
    }

    pub fn add_log(&self, entry: ApiLogEntry) {
        let mut logs = self.logs.lock().unwrap();
        if logs.len() >= self.max_logs {
            logs.pop_front();
        }
        logs.push_back(entry);
        self.save_logs(&logs); // Persist changes
    }

    pub fn get_logs(&self) -> Vec<ApiLogEntry> {
        let logs = self.logs.lock().unwrap();
        logs.iter().cloned().collect()
    }

    pub fn get_log_by_id(&self, id: &str) -> Option<ApiLogEntry> {
        let logs = self.logs.lock().unwrap();
        logs.iter().find(|l| l.id == id).cloned()
    }

    pub fn clear_logs(&self) {
        let mut logs = self.logs.lock().unwrap();
        logs.clear();
        self.save_logs(&logs); // Persist changes (empty file)
    }
}
