use crate::model::domain_group::DomainGroup;
use std::sync::Mutex;
use std::fs;
use std::path::PathBuf;

pub struct DomainGroupService {
    pub groups: Mutex<Vec<DomainGroup>>,
    pub storage_path: PathBuf,
}

impl DomainGroupService {
    pub fn new(storage_path: PathBuf) -> Self {
        let mut initial_groups = Vec::new();
        if storage_path.exists() {
            if let Ok(content) = fs::read_to_string(&storage_path) {
                if let Ok(groups) = serde_json::from_str(&content) {
                    initial_groups = groups;
                }
            }
        }
        
        Self {
            groups: Mutex::new(initial_groups),
            storage_path,
        }
    }

    fn save(&self, list: &Vec<DomainGroup>) {
        if let Ok(content) = serde_json::to_string_pretty(list) {
            let _ = fs::write(&self.storage_path, content);
        }
    }

    pub fn add_group(&self, name: String) -> Vec<DomainGroup> {
        let mut list = self.groups.lock().unwrap();
        let next_id = list.iter().map(|g| g.id).max().unwrap_or(0) + 1;

        list.push(DomainGroup {
            id: next_id,
            name,
        });
        
        self.save(&list);
        list.clone()
    }

    pub fn get_all(&self) -> Vec<DomainGroup> {
        self.groups.lock().unwrap().clone()
    }

    pub fn delete_group(&self, id: u32) -> Vec<DomainGroup> {
        let mut list = self.groups.lock().unwrap();
        list.retain(|group| group.id != id);
        self.save(&list);
        list.clone()
    }

    pub fn update_group(&self, id: u32, name: String) -> Vec<DomainGroup> {
        let mut list = self.groups.lock().unwrap();
        if let Some(group) = list.iter_mut().find(|group| group.id == id) {
            group.name = name;
        }
        self.save(&list);
        list.clone()
    }

    /// Replace all groups with the given list (for import).
    pub fn replace_all(&self, groups: Vec<DomainGroup>) -> Vec<DomainGroup> {
        let mut list = self.groups.lock().unwrap();
        *list = groups;
        self.save(&list);
        list.clone()
    }
}
