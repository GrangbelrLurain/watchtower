use crate::model::local_route::LocalRoute;
use crate::storage::versioned::{load_versioned, save_versioned};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct LocalRouteService {
    routes: Mutex<Vec<LocalRoute>>,
    storage_path: PathBuf,
}

impl LocalRouteService {
    pub fn new(storage_path: PathBuf) -> Self {
        let routes = load_versioned(&storage_path);
        Self {
            routes: Mutex::new(routes),
            storage_path,
        }
    }

    fn save(&self, list: &[LocalRoute]) {
        save_versioned(&self.storage_path, list);
    }

    pub fn get_all(&self) -> Vec<LocalRoute> {
        self.routes.lock().unwrap().clone()
    }

    /// Returns enabled routes only (for proxy lookup).
    pub fn get_enabled(&self) -> Vec<LocalRoute> {
        self.routes
            .lock()
            .unwrap()
            .iter()
            .filter(|r| r.enabled)
            .cloned()
            .collect()
    }

    pub fn add(&self, domain: String, target_host: String, target_port: u16) -> LocalRoute {
        let mut list = self.routes.lock().unwrap();
        let next_id = list.iter().map(|r| r.id).max().unwrap_or(0) + 1;
        let route = LocalRoute {
            id: next_id,
            domain,
            target_host,
            target_port,
            enabled: true,
        };
        list.push(route.clone());
        self.save(&list);
        route
    }

    pub fn update(
        &self,
        id: u32,
        domain: Option<String>,
        target_host: Option<String>,
        target_port: Option<u16>,
        enabled: Option<bool>,
    ) -> Option<LocalRoute> {
        let mut list = self.routes.lock().unwrap();
        let pos = list.iter().position(|r| r.id == id)?;
        let r = &mut list[pos];
        if let Some(d) = domain {
            r.domain = d;
        }
        if let Some(h) = target_host {
            r.target_host = h;
        }
        if let Some(p) = target_port {
            r.target_port = p;
        }
        if let Some(e) = enabled {
            r.enabled = e;
        }
        let out = r.clone();
        self.save(&list);
        Some(out)
    }

    pub fn remove(&self, id: u32) -> Option<LocalRoute> {
        let mut list = self.routes.lock().unwrap();
        let pos = list.iter().position(|r| r.id == id)?;
        let removed = list.remove(pos);
        self.save(&list);
        Some(removed)
    }

    pub fn set_enabled(&self, id: u32, enabled: bool) -> Option<LocalRoute> {
        self.update(id, None, None, None, Some(enabled))
    }

    /// Replace all routes (for import).
    pub fn replace_all(&self, routes: Vec<LocalRoute>) -> Vec<LocalRoute> {
        let mut list = self.routes.lock().unwrap();
        *list = routes;
        self.save(&list);
        list.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn setup() -> (tempfile::TempDir, LocalRouteService) {
        let dir = tempdir().unwrap();
        let path = dir.path().join("routes.json");
        let service = LocalRouteService::new(path);
        (dir, service)
    }

    #[test]
    fn test_add_route() {
        let (_dir, service) = setup();
        let route = service.add("example.com".to_string(), "localhost".to_string(), 3000);

        assert_eq!(route.domain, "example.com");
        assert_eq!(route.target_host, "localhost");
        assert_eq!(route.target_port, 3000);
        assert!(route.enabled);
        assert_eq!(service.get_all().len(), 1);
    }

    #[test]
    fn test_get_enabled() {
        let (_dir, service) = setup();
        service.add("one.com".to_string(), "localhost".to_string(), 3001);
        let route2 = service.add("two.com".to_string(), "localhost".to_string(), 3002);
        service.set_enabled(route2.id, false);

        let enabled = service.get_enabled();
        assert_eq!(enabled.len(), 1);
        assert_eq!(enabled[0].domain, "one.com");
    }

    #[test]
    fn test_update_route() {
        let (_dir, service) = setup();
        let route = service.add("old.com".to_string(), "localhost".to_string(), 8080);

        let updated = service.update(
            route.id,
            Some("new.com".to_string()),
            None,
            Some(9090),
            None
        ).unwrap();

        assert_eq!(updated.domain, "new.com");
        assert_eq!(updated.target_port, 9090);
        assert_eq!(updated.target_host, "localhost");
    }

    #[test]
    fn test_remove_route() {
        let (_dir, service) = setup();
        let route = service.add("example.com".to_string(), "localhost".to_string(), 3000);

        let removed = service.remove(route.id);
        assert!(removed.is_some());
        assert_eq!(service.get_all().len(), 0);
    }

    #[test]
    fn test_persistence() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("routes.json");

        {
            let service = LocalRouteService::new(path.clone());
            service.add("persist.com".to_string(), "127.0.0.1".to_string(), 5000);
        }

        let service = LocalRouteService::new(path);
        assert_eq!(service.get_all().len(), 1);
        assert_eq!(service.get_all()[0].domain, "persist.com");
    }
}
