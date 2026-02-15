use crate::model::domain::Domain;
use crate::storage::versioned::{load_versioned, save_versioned};
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DomainService {
    pub domains: Mutex<Vec<Domain>>,
    pub storage_path: PathBuf,
}

impl DomainService {
    pub fn new(storage_path: PathBuf) -> Self {
        let initial_domains = load_versioned(&storage_path);
        Self {
            domains: Mutex::new(initial_domains),
            storage_path,
        }
    }

    fn save(&self, list: &Vec<Domain>) {
        save_versioned(&self.storage_path, list);
    }

    /// 기존에 없는 URL만 등록. 중복 URL(DB·요청 내)은 건너뜀. 실제로 추가된 도메인만 반환.
    pub fn add_domains(&self, urls: Vec<String>) -> Vec<Domain> {
        let mut list = self.domains.lock().unwrap();
        let mut seen: HashSet<String> = list.iter().map(|d| d.url.clone()).collect();
        let mut next_id = list.iter().map(|d| d.id).max().unwrap_or(0) + 1;
        let mut added = Vec::new();

        for url in urls {
            if seen.contains(&url) {
                continue;
            }
            seen.insert(url.clone());
            let domain = Domain {
                id: next_id,
                url: url.clone(),
            };
            list.push(domain.clone());
            added.push(domain);
            next_id += 1;
        }
        if !added.is_empty() {
            self.save(&list);
        }
        added
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

    /// URL 수정. 다른 도메인이 이미 사용 중인 URL이면 변경하지 않음. 성공 시 해당 도메인만 담은 Vec 반환.
    /// `url: None`이면 URL은 변경하지 않음.
    pub fn update_domain(&self, id: u32, url: Option<String>) -> Vec<Domain> {
        let mut list = self.domains.lock().unwrap();
        if let Some(ref new_url) = url {
            let duplicate = list
                .iter()
                .any(|d| d.id != id && d.url == *new_url);
            if duplicate {
                return Vec::new();
            }
            if let Some(domain) = list.iter_mut().find(|d| d.id == id) {
                domain.url.clone_from(new_url);
            }
        }
        self.save(&list);
        list.iter()
            .filter(|d| d.id == id)
            .cloned()
            .collect()
    }

    pub fn import_from_json(&self, domains: Vec<Domain>) -> Vec<Domain> {
        let mut list = self.domains.lock().unwrap();
        *list = domains;
        self.save(&list);
        list.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn setup() -> (tempfile::TempDir, DomainService) {
        let dir = tempdir().unwrap();
        let path = dir.path().join("domains.json");
        let service = DomainService::new(path);
        (dir, service)
    }

    #[test]
    fn test_add_domains() {
        let (_dir, service) = setup();
        let added = service.add_domains(vec!["example.com".to_string(), "test.org".to_string()]);

        assert_eq!(added.len(), 2);
        assert_eq!(added[0].url, "example.com");
        assert_eq!(added[1].url, "test.org");
        assert_eq!(service.get_all().len(), 2);
    }

    #[test]
    fn test_add_duplicate_domains() {
        let (_dir, service) = setup();
        service.add_domains(vec!["example.com".to_string()]);
        let added = service.add_domains(vec!["example.com".to_string(), "new.com".to_string()]);

        assert_eq!(added.len(), 1);
        assert_eq!(added[0].url, "new.com");
        assert_eq!(service.get_all().len(), 2);
    }

    #[test]
    fn test_get_domain_by_id() {
        let (_dir, service) = setup();
        let added = service.add_domains(vec!["example.com".to_string()]);
        let id = added[0].id;

        let found = service.get_domain_by_id(id);
        assert!(found.is_some());
        assert_eq!(found.unwrap().url, "example.com");
    }

    #[test]
    fn test_delete_domain() {
        let (_dir, service) = setup();
        let added = service.add_domains(vec!["example.com".to_string()]);
        let id = added[0].id;

        service.delete_domain(id);
        assert_eq!(service.get_all().len(), 0);
    }

    #[test]
    fn test_update_domain() {
        let (_dir, service) = setup();
        let added = service.add_domains(vec!["example.com".to_string()]);
        let id = added[0].id;

        let updated = service.update_domain(id, Some("new.com".to_string()));
        assert_eq!(updated.len(), 1);
        assert_eq!(updated[0].url, "new.com");
        assert_eq!(service.get_domain_by_id(id).unwrap().url, "new.com");
    }

    #[test]
    fn test_update_domain_duplicate() {
        let (_dir, service) = setup();
        service.add_domains(vec!["one.com".to_string(), "two.com".to_string()]);
        let id_one = service.get_all()[0].id;

        // Try to update one.com to two.com
        let updated = service.update_domain(id_one, Some("two.com".to_string()));
        assert!(updated.is_empty());
        assert_eq!(service.get_domain_by_id(id_one).unwrap().url, "one.com");
    }

    #[test]
    fn test_persistence() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("domains.json");

        {
            let service = DomainService::new(path.clone());
            service.add_domains(vec!["example.com".to_string()]);
        }

        // Re-open service and check if data persists
        let service = DomainService::new(path);
        assert_eq!(service.get_all().len(), 1);
        assert_eq!(service.get_all()[0].url, "example.com");
    }
}
