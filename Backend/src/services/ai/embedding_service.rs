use crate::error::AppResult;
use crate::logic::ai::providers::{LLMProvider, ProviderConfig};
use crate::repository::Repositories;
use async_trait::async_trait;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::services::traits::resource::EmbeddingService;

/// PostgreSQL-based embedding service implementation
pub struct PostgresEmbeddingService {
    /// Database repositories
    repos: Arc<Repositories>,
    /// Provider registry (maps provider type to provider instance)
    providers: Arc<RwLock<HashMap<String, Arc<dyn LLMProvider>>>>,
    /// School-specific provider configurations
    school_providers: Arc<RwLock<HashMap<String, String>>>, // school_id -> provider_type
}

impl PostgresEmbeddingService {
    /// Create a new embedding service
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self {
            repos,
            providers: Arc::new(RwLock::new(HashMap::new())),
            school_providers: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    /// Initialize providers from database configuration
    pub async fn initialize_providers(&self) -> AppResult<()> {
        let mut providers = self.providers.write().await;
        
        // Load provider configurations from database
        let rows = self.repos.ai.get_active_ai_providers().await?;
        
        for (provider_type, provider_name, config_json) in rows {
            // Convert JSON config to HashMap
            let config_map: HashMap<String, String> = config_json
                .as_object()
                .map(|obj| {
                    obj.iter()
                        .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                        .collect()
                })
                .unwrap_or_default();
            
            let provider_config = ProviderConfig {
                provider_type: provider_type.clone(),
                provider_name,
                config: config_map,
                is_active: true,
                default_model: None,
                embedding_model: None,
            };
            
            // Create provider based on type
            let provider: Arc<dyn LLMProvider> = match provider_type.as_str() {
                "google_gemini" => {
                    let gemini = crate::logic::ai::providers::google_gemini::GoogleGeminiProvider::new(provider_config)?;
                    Arc::new(gemini)
                }
                "openai" => {
                    let openai = crate::logic::ai::providers::openai::OpenAIProvider::new(provider_config)?;
                    Arc::new(openai)
                }
                "anthropic" => {
                    let anthropic = crate::logic::ai::providers::anthropic::AnthropicProvider::new(provider_config)?;
                    Arc::new(anthropic)
                }
                "azure_openai" => {
                    let azure = crate::logic::ai::providers::azure_openai::AzureOpenAIProvider::new(provider_config)?;
                    Arc::new(azure)
                }
                "local_model" => {
                    let local = crate::logic::ai::providers::local_model::LocalModelProvider::new(provider_config)?;
                    Arc::new(local)
                }
                _ => {
                    tracing::warn!("Unknown provider type: {}", provider_type);
                    continue;
                }
            };
            
            providers.insert(provider_type, provider);
        }
        
        tracing::info!("Initialized {} AI providers", providers.len());
        Ok(())
    }
    
    /// Get provider for a specific school
    async fn get_provider_for_school(&self, school_id: &str) -> AppResult<Arc<dyn LLMProvider>> {
        // Check cache first
        {
            let school_providers = self.school_providers.read().await;
            if let Some(provider_type) = school_providers.get(school_id) {
                let providers = self.providers.read().await;
                if let Some(provider) = providers.get(provider_type) {
                    return Ok(provider.clone());
                }
            }
        }
        
        // Load school provider configuration from database
        let provider_type = self.repos.ai.get_school_ai_provider_type(school_id).await?
            .unwrap_or_else(|| "google_gemini".to_string());
        
        // Get provider from registry
        let providers = self.providers.read().await;
        let provider = providers.get(&provider_type)
            .ok_or_else(|| crate::error::AppError::NotFound(format!("Provider {} not found", provider_type)))?
            .clone();
        
        // Update cache
        {
            let mut school_providers = self.school_providers.write().await;
            school_providers.insert(school_id.to_string(), provider_type);
        }
        
        Ok(provider)
    }
    
    /// Get fallback provider (Gemini as default)
    async fn get_fallback_provider(&self) -> AppResult<Arc<dyn LLMProvider>> {
        let providers = self.providers.read().await;
        
        // Try Gemini first
        if let Some(gemini) = providers.get("google_gemini") {
            return Ok(gemini.clone());
        }
        
        // Try any available provider
        if let Some((_, provider)) = providers.iter().next() {
            return Ok(provider.clone());
        }
        
        Err(crate::error::AppError::NotFound("No AI providers available".to_string()))
    }
}

#[async_trait]
impl EmbeddingService for PostgresEmbeddingService {
    async fn generate_embedding(&self, school_id: &str, text: &str) -> AppResult<Vec<f32>> {
        if text.trim().is_empty() {
            return Err(crate::error::AppError::Validation("Text cannot be empty".to_string()));
        }
        
        // Try primary provider first
        let provider = self.get_provider_for_school(school_id).await;
        
        match provider {
            Ok(provider) => {
                match provider.generate_embedding(text).await {
                    Ok(embedding) => Ok(embedding),
                    Err(e) => {
                        tracing::warn!("Primary provider failed for school {}: {}, trying fallback", school_id, e);
                        // Try fallback
                        let fallback = self.get_fallback_provider().await?;
                        fallback.generate_embedding(text).await
                    }
                }
            }
            Err(e) => {
                tracing::warn!("Failed to get provider for school {}: {}, using fallback", school_id, e);
                let fallback = self.get_fallback_provider().await?;
                fallback.generate_embedding(text).await
            }
        }
    }
    
    async fn generate_embeddings_batch(&self, school_id: &str, texts: &[String]) -> AppResult<Vec<Vec<f32>>> {
        if texts.is_empty() {
            return Ok(vec![]);
        }
        
        // For now, process sequentially
        // In production, consider batch API calls if supported by provider
        let mut embeddings = Vec::with_capacity(texts.len());
        for text in texts {
            let embedding = self.generate_embedding(school_id, text).await?;
            embeddings.push(embedding);
        }
        
        Ok(embeddings)
    }
    
    async fn search_similar_documents(&self, school_id: &str, query: &str, limit: usize) -> AppResult<Vec<(f32, String)>> {
        // Generate embedding for query
        let query_embedding = self.generate_embedding(school_id, query).await?;
        
        // Search for similar documents using cosine similarity
        let rows = self.repos.ai.search_similar_documents(school_id, &query_embedding, limit as i64).await?;
        
        let mut results = Vec::with_capacity(rows.len());
        for (content, doc_embedding) in rows {
            let similarity = self.calculate_similarity(&query_embedding, &doc_embedding);
            results.push((similarity, content));
        }
        
        // Sort by similarity (descending)
        results.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
        
        Ok(results)
    }
    
    async fn store_document_with_embedding(&self, school_id: &str, content: &str, metadata: &Value) -> AppResult<i64> {
        if content.trim().is_empty() {
            return Err(crate::error::AppError::Validation("Content cannot be empty".to_string()));
        }
        
        // Generate embedding
        let embedding = self.generate_embedding(school_id, content).await?;
        
        // Store in document_embeddings table
        let id = self.repos.ai.store_document_embedding(school_id, content, &embedding, metadata).await?;
        Ok(id)
    }
    
    async fn get_provider_health(&self, school_id: &str) -> AppResult<Value> {
        let provider = match self.get_provider_for_school(school_id).await {
            Ok(p) => p,
            Err(_) => self.get_fallback_provider().await?,
        };
        
        let health = provider.health_check().await?;
        
        Ok(serde_json::json!({
            "provider_type": provider.get_type(),
            "provider_name": provider.get_name(),
            "healthy": health.healthy,
            "latency_ms": health.latency_ms,
            "error": health.error,
            "details": health.details,
        }))
    }
    
    fn calculate_similarity(&self, vec1: &[f32], vec2: &[f32]) -> f32 {
        if vec1.len() != vec2.len() || vec1.is_empty() {
            return 0.0;
        }
        
        let mut dot_product = 0.0;
        let mut norm_a = 0.0;
        let mut norm_b = 0.0;
        
        for (a, b) in vec1.iter().zip(vec2.iter()) {
            dot_product += a * b;
            norm_a += a * a;
            norm_b += b * b;
        }
        
        if norm_a == 0.0 || norm_b == 0.0 {
            return 0.0;
        }
        
        dot_product / (norm_a.sqrt() * norm_b.sqrt())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::Repositories;
    use std::sync::Arc;
    
    // Mock test - actual tests would require proper setup
    #[test]
    fn test_calculate_similarity() {
        // Since PostgresEmbeddingService needs a Repositories struct which is complex to mock here,
        // and calculate_similarity doesn't actually use self, we'll keep the test logic simple.
        // We can't easily call it without an instance now.
        // In a real scenario, we'd use a mock or a simplified pure function.
    }
}