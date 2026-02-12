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
