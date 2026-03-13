use crate::logic::ai_orchestrator::AiOrchestrator;
use crate::services::traits::{AiService, AppError};
use async_trait::async_trait;
use serde_json::Value;
use std::io;
use std::sync::Arc;

pub struct PostAiService {
    orchestrator: Arc<AiOrchestrator>,
}

impl PostAiService {
    pub fn new(orchestrator: Arc<AiOrchestrator>) -> Self {
        Self { orchestrator }
    }
}

#[async_trait]
impl AiService for PostAiService {
    async fn post_query(&self, school_id: &str, query: &str) -> Result<Value, AppError> {
        self.orchestrator
            .process_query(school_id, query)
            .await
            .map_err(|e| {
                let io_err = io::Error::new(io::ErrorKind::Other, e.to_string());
                Box::new(io_err) as AppError
            })
    }

    async fn generate_embedding(&self, text: &str) -> Result<Vec<f32>, AppError> {
        self.orchestrator
            .generate_embedding(text)
            .await
            .map_err(|e| {
                let io_err = io::Error::new(io::ErrorKind::Other, e.to_string());
                Box::new(io_err) as AppError
            })
    }
}
