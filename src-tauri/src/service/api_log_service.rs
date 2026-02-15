use crate::model::api_log::ApiLogEntry;
use std::collections::VecDeque;
use std::sync::Mutex;

pub struct ApiLogService {
    logs: Mutex<VecDeque<ApiLogEntry>>,
    max_logs: usize,
}

impl ApiLogService {
    pub fn new(max_logs: usize) -> Self {
        Self {
            logs: Mutex::new(VecDeque::with_capacity(max_logs)),
            max_logs,
        }
    }

    pub fn add_log(&self, entry: ApiLogEntry) {
        let mut logs = self.logs.lock().unwrap();
        if logs.len() >= self.max_logs {
            logs.pop_front();
        }
        logs.push_back(entry);
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
    }
}
