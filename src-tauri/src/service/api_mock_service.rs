use crate::model::api_mock::ApiMock;
use crate::storage::versioned::{load_versioned, save_versioned};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct ApiMockService {
    storage_path: PathBuf,
    mocks: Mutex<Vec<ApiMock>>,
}

impl ApiMockService {
    pub fn new(storage_path: PathBuf) -> Self {
        let mocks = load_versioned(&storage_path);
        Self {
            storage_path,
            mocks: Mutex::new(mocks),
        }
    }

    fn save(&self, list: &[ApiMock]) {
        save_versioned(&self.storage_path, &list.to_vec());
    }

    pub fn get_all(&self) -> Vec<ApiMock> {
        self.mocks.lock().unwrap().clone()
    }

    pub fn add_mock(&self, mock: ApiMock) {
        let mut mocks = self.mocks.lock().unwrap();
        mocks.push(mock);
        self.save(&mocks);
    }

    pub fn update_mock(&self, mock: ApiMock) {
        let mut mocks = self.mocks.lock().unwrap();
        if let Some(pos) = mocks.iter().position(|m| m.id == mock.id) {
            mocks[pos] = mock;
            self.save(&mocks);
        }
    }

    pub fn remove_mock(&self, id: &str) {
        let mut mocks = self.mocks.lock().unwrap();
        if let Some(pos) = mocks.iter().position(|m| m.id == id) {
            mocks.remove(pos);
            self.save(&mocks);
        }
    }

    pub fn match_mock(&self, host: &str, path: &str, method: &str) -> Option<ApiMock> {
        let mocks = self.mocks.lock().unwrap();
        mocks.iter().find(|m| {
            m.enabled &&
            m.host.eq_ignore_ascii_case(host) &&
            m.path == path &&
            m.method.eq_ignore_ascii_case(method)
        }).cloned()
    }
}
