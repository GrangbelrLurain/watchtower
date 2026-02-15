use crate::model::api_test_case::ApiTestCase;
use crate::storage::versioned::{load_versioned, save_versioned};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct ApiTestCaseService {
    storage_path: PathBuf,
    test_cases: Mutex<Vec<ApiTestCase>>,
}

impl ApiTestCaseService {
    pub fn new(storage_path: PathBuf) -> Self {
        let test_cases = load_versioned(&storage_path);
        Self {
            storage_path,
            test_cases: Mutex::new(test_cases),
        }
    }

    fn save(&self, list: &[ApiTestCase]) {
        save_versioned(&self.storage_path, &list.to_vec());
    }

    pub fn get_all(&self) -> Vec<ApiTestCase> {
        self.test_cases.lock().unwrap().clone()
    }

    pub fn get_for_domain(&self, domain_id: u32) -> Vec<ApiTestCase> {
        self.test_cases.lock().unwrap().iter().filter(|t| t.domain_id == domain_id).cloned().collect()
    }

    pub fn add_test_case(&self, test_case: ApiTestCase) {
        let mut list = self.test_cases.lock().unwrap();
        list.push(test_case);
        self.save(&list);
    }

    pub fn remove_test_case(&self, id: &str) {
        let mut list = self.test_cases.lock().unwrap();
        if let Some(pos) = list.iter().position(|t| t.id == id) {
            list.remove(pos);
            self.save(&list);
        }
    }
}
