use crate::model::domain::Domain;
use std::sync::Mutex;
use std::fs;
use std::path::PathBuf;

pub struct DomainService {
    pub domains: Mutex<Vec<Domain>>,
    pub storage_path: PathBuf,
}

impl DomainService {
    pub fn new(storage_path: PathBuf) -> Self {
        let mut initial_domains = Vec::new();
        if storage_path.exists() {
            if let Ok(content) = fs::read_to_string(&storage_path) {
                if let Ok(domains) = serde_json::from_str(&content) {
                    initial_domains = domains;
                }
            }
        }
        
        Self {
            domains: Mutex::new(initial_domains),
            storage_path,
        }
    }

    fn save(&self, list: &Vec<Domain>) {
        if let Ok(content) = serde_json::to_string_pretty(list) {
            let _ = fs::write(&self.storage_path, content);
        }
    }

    pub fn add_domains(&self, urls: Vec<String>, group_id: Option<u32>) -> Vec<Domain> {
        let mut list = self.domains.lock().unwrap();
        let mut next_id = list.iter().map(|d| d.id).max().unwrap_or(0) + 1;

        for url in urls {
            list.push(Domain {
                id: next_id,
                url,
                group_id,
            });
            next_id += 1;
        }
        self.save(&list);
        list.clone()
    }

    pub fn get_all(&self) -> Vec<Domain> {
        self.domains.lock().unwrap().clone()
    }

    pub fn get_domain_by_id(&self, id: u32) -> Option<Domain> {
        self.domains
            .lock()
            .unwrap()
            .iter()
            .find(|domain| domain.id == id)
            .cloned()
    }

    pub fn delete_domain(&self, id: u32) -> Vec<Domain> {
        let mut list = self.domains.lock().unwrap();
        list.retain(|domain| domain.id != id);
        self.save(&list);
        list.clone()
    }

    pub fn update_domain(&self, id: u32, url: String, group_id: Option<u32>) -> Vec<Domain> {
        let mut list = self.domains.lock().unwrap();
        if let Some(domain) = list.iter_mut().find(|domain| domain.id == id) {
            domain.url = url;
            domain.group_id = group_id;
        }
        self.save(&list);
        list.clone()
    }

    pub fn import_from_json(&self, domains: Vec<Domain>) -> Vec<Domain> {
        let mut list = self.domains.lock().unwrap();
        *list = domains;
        self.save(&list);
        list.clone()
    }
}
