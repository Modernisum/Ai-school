use crate::repository::Repositories;
use crate::services::traits::*;
use std::sync::Arc;

pub struct PostgresAuxiliaryService {
    pub repos: Arc<Repositories>,
    pub ai: Arc<dyn AiService>,
}
