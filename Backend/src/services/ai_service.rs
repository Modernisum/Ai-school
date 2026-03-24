use crate::logic::ai_orchestrator::AiOrchestrator;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::Value;
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
    async fn post_query(&self, school_id: &str, query: Value) -> AppResult<Value> {
        let q = query["query"].as_str().unwrap_or("");
        self.orchestrator
            .process_query(school_id, q)
            .await
            .map_err(|e| AppError::Internal(format!("AI Orchestrator error: {}", e)))
    }

    async fn query_ai(&self, school_id: &str, user_query: &str) -> AppResult<Value> {
        self.orchestrator
            .process_query(school_id, user_query)
            .await
            .map_err(|e| AppError::Internal(format!("AI Orchestrator error: {}", e)))
    }

    async fn generate_embedding(&self, text: &str) -> AppResult<Vec<f32>> {
        self.orchestrator
            .generate_embedding(text)
            .await
            .map_err(|e| AppError::Internal(format!("Embedding generation error: {}", e)))
    }
}
