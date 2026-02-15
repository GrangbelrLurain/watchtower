use crate::model::domain_group_link::DomainGroupLink;
use crate::storage::versioned::{load_versioned, save_versioned};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DomainGroupLinkService {
    links: Mutex<Vec<DomainGroupLink>>,
    storage_path: PathBuf,
}

impl DomainGroupLinkService {
    pub fn new(storage_path: PathBuf) -> Self {
        let initial_links = load_versioned(&storage_path);
        Self {
            links: Mutex::new(initial_links),
            storage_path,
        }
    }

    fn save(&self, list: &[DomainGroupLink]) {
        save_versioned(&self.storage_path, list);
    }

    pub fn get_domain_ids_for_group(&self, group_id: u32) -> Vec<u32> {
        self.links
            .lock()
            .unwrap()
            .iter()
            .filter(|l| l.group_id == group_id)
            .map(|l| l.domain_id)
            .collect()
    }

    pub fn get_group_ids_for_domain(&self, domain_id: u32) -> Vec<u32> {
        self.links
            .lock()
            .unwrap()
            .iter()
            .filter(|l| l.domain_id == domain_id)
            .map(|l| l.group_id)
            .collect()
    }

    pub fn get_all_links(&self) -> Vec<DomainGroupLink> {
        self.links.lock().unwrap().clone()
    }

    /// Replace all domains for this group with the given `domain_ids`.
    pub fn set_domains_for_group(&self, group_id: u32, domain_ids: Vec<u32>) {
        let mut list = self.links.lock().unwrap();
        list.retain(|l| l.group_id != group_id);
        for domain_id in domain_ids {
            list.push(DomainGroupLink { domain_id, group_id });
        }
        self.save(&list);
    }

    /// Replace all groups for this domain with the given `group_ids`.
    pub fn set_groups_for_domain(&self, domain_id: u32, group_ids: Vec<u32>) {
        let mut list = self.links.lock().unwrap();
        list.retain(|l| l.domain_id != domain_id);
        for group_id in group_ids {
            list.push(DomainGroupLink { domain_id, group_id });
        }
        self.save(&list);
    }

    pub fn remove_links_for_domain(&self, domain_id: u32) {
        let mut list = self.links.lock().unwrap();
        list.retain(|l| l.domain_id != domain_id);
        self.save(&list);
    }

    pub fn remove_links_for_group(&self, group_id: u32) {
        let mut list = self.links.lock().unwrap();
        list.retain(|l| l.group_id != group_id);
        self.save(&list);
    }

    /// Add domain to group (idempotent: no duplicate links).
    pub fn add_domain_to_group(&self, domain_id: u32, group_id: u32) {
        let mut list = self.links.lock().unwrap();
        let exists = list
            .iter()
            .any(|l| l.domain_id == domain_id && l.group_id == group_id);
        if !exists {
            list.push(DomainGroupLink { domain_id, group_id });
            self.save(&list);
        }
    }

    /// Replace all links (for import).
    pub fn replace_all(&self, links: Vec<DomainGroupLink>) {
        let mut list = self.links.lock().unwrap();
        *list = links;
        self.save(&list);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn setup() -> (tempfile::TempDir, DomainGroupLinkService) {
        let dir = tempdir().unwrap();
        let path = dir.path().join("links.json");
        let service = DomainGroupLinkService::new(path);
        (dir, service)
    }

    #[test]
    fn test_set_domains_for_group() {
        let (_dir, service) = setup();
        service.set_domains_for_group(1, vec![10, 20, 30]);

        let domains = service.get_domain_ids_for_group(1);
        assert_eq!(domains, vec![10, 20, 30]);

        // Replace
        service.set_domains_for_group(1, vec![40]);
        assert_eq!(service.get_domain_ids_for_group(1), vec![40]);
    }

    #[test]
    fn test_set_groups_for_domain() {
        let (_dir, service) = setup();
        service.set_groups_for_domain(10, vec![1, 2]);

        let groups = service.get_group_ids_for_domain(10);
        assert_eq!(groups, vec![1, 2]);
    }

    #[test]
    fn test_add_domain_to_group() {
        let (_dir, service) = setup();
        service.add_domain_to_group(10, 1);
        service.add_domain_to_group(10, 1); // Duplicate

        assert_eq!(service.get_domain_ids_for_group(1), vec![10]);
        assert_eq!(service.get_group_ids_for_domain(10), vec![1]);
    }

    #[test]
    fn test_remove_links() {
        let (_dir, service) = setup();
        service.add_domain_to_group(10, 1);
        service.add_domain_to_group(20, 1);
        service.add_domain_to_group(10, 2);

        service.remove_links_for_domain(10);
        assert_eq!(service.get_domain_ids_for_group(1), vec![20]);
        assert_eq!(service.get_group_ids_for_domain(10), Vec::<u32>::new());

        service.remove_links_for_group(1);
        assert!(service.get_all_links().is_empty());
    }

    #[test]
    fn test_persistence() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("links.json");

        {
            let service = DomainGroupLinkService::new(path.clone());
            service.add_domain_to_group(100, 5);
        }

        let service = DomainGroupLinkService::new(path);
        assert_eq!(service.get_group_ids_for_domain(100), vec![5]);
    }
}
