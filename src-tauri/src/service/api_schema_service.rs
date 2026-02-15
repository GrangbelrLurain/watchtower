use crate::model::api_schema::{ApiSchema, DomainApiSchemaLink};
use crate::storage::versioned::{load_versioned, save_versioned};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct ApiSchemaService {
    schemas_path: PathBuf,
    links_path: PathBuf,
    schemas: Mutex<Vec<ApiSchema>>,
    links: Mutex<Vec<DomainApiSchemaLink>>,
}

impl ApiSchemaService {
    pub fn new(schemas_path: PathBuf, links_path: PathBuf) -> Self {
        let schemas = load_versioned(&schemas_path);
        let links = load_versioned(&links_path);
        Self {
            schemas_path,
            links_path,
            schemas: Mutex::new(schemas),
            links: Mutex::new(links),
        }
    }

    fn save_schemas(&self, list: &[ApiSchema]) {
        save_versioned(&self.schemas_path, &list.to_vec());
    }

    fn save_links(&self, list: &[DomainApiSchemaLink]) {
        save_versioned(&self.links_path, &list.to_vec());
    }

    pub fn add_schema(&self, schema: ApiSchema) {
        let mut schemas = self.schemas.lock().unwrap();
        schemas.push(schema.clone());
        self.save_schemas(&schemas);

        // Update link to latest
        let mut links = self.links.lock().unwrap();
        if let Some(link) = links.iter_mut().find(|l| l.domain_id == schema.domain_id) {
            link.schema_id = schema.id;
        } else {
            links.push(DomainApiSchemaLink {
                domain_id: schema.domain_id,
                schema_id: schema.id,
            });
        }
        self.save_links(&links);
    }

    pub fn get_schemas_for_domain(&self, domain_id: u32) -> Vec<ApiSchema> {
        let schemas = self.schemas.lock().unwrap();
        schemas.iter().filter(|s| s.domain_id == domain_id).cloned().collect()
    }

    pub fn get_schema_by_id(&self, id: &str) -> Option<ApiSchema> {
        let schemas = self.schemas.lock().unwrap();
        schemas.iter().find(|s| s.id == id).cloned()
    }

    pub fn get_latest_schema_for_domain(&self, domain_id: u32) -> Option<ApiSchema> {
        let links = self.links.lock().unwrap();
        let link = links.iter().find(|l| l.domain_id == domain_id)?;
        self.get_schema_by_id(&link.schema_id)
    }

    pub fn remove_schema(&self, id: &str) {
        let mut schemas = self.schemas.lock().unwrap();
        if let Some(pos) = schemas.iter().position(|s| s.id == id) {
            let schema = schemas.remove(pos);
            self.save_schemas(&schemas);

            // If it was the linked one, update link to another or remove
            let mut links = self.links.lock().unwrap();
            if let Some(link_pos) = links.iter().position(|l| l.domain_id == schema.domain_id && l.schema_id == id) {
                links.remove(link_pos);
                // Try to find another one for this domain
                if let Some(another) = schemas.iter().filter(|s| s.domain_id == schema.domain_id).last() {
                    links.push(DomainApiSchemaLink {
                        domain_id: schema.domain_id,
                        schema_id: another.id.clone(),
                    });
                }
                self.save_links(&links);
            }
        }
    }
}
