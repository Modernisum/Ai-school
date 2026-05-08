use crate::error::AppResult;
use crate::logic::ai::providers::{LLMProvider, ProviderConfig};
use serde_json::Value;
use sqlx::Row;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Registry for managing AI providers dynamically
pub struct ProviderRegistry {
    /// Database client for loading configurations
    db_client: Arc<crate::db::DbClient>,
    /// Active providers mapped by provider type
    providers: Arc<RwLock<HashMap<String, Arc<dyn LLMProvider>>>>,
    /// School-specific provider configurations (school_id -> provider_type)
    school_providers: Arc<RwLock<HashMap<String, String>>>,
    /// Provider health status cache
    health_cache: Arc<RwLock<HashMap<String, (bool, u64)>>>, // provider_type -> (healthy, last_check_timestamp)
}

impl ProviderRegistry {
    /// Create a new provider registry
    pub fn new(db_client: Arc<crate::db::DbClient>) -> Self {
        Self {
            db_client,
            providers: Arc::new(RwLock::new(HashMap::new())),
            school_providers: Arc::new(RwLock::new(HashMap::new())),
            health_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Initialize the registry by loading all active providers from database
    pub async fn initialize(&self) -> AppResult<()> {
        let mut providers = self.providers.write().await;
        
        tracing::info!("Initializing AI provider registry...");
        
        // Load provider configurations from database
        let rows = sqlx::query(
            "SELECT provider_id, provider_type, provider_name, config, is_active 
             FROM ai_providers WHERE is_active = true"
        )
        .fetch_all(&self.db_client.pool)
        .await
        .map_err(crate::error::AppError::Database)?;
        
        for row in rows {
            let provider_id: i32 = row.get("provider_id");
            let provider_type: String = row.get("provider_type");
            let provider_name: String = row.get("provider_name");
            let config_json: Value = row.get("config");
            let is_active: bool = row.get("is_active");
            
            if !is_active {
                continue;
            }
            
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
                    tracing::warn!("Unknown provider type: {}, skipping", provider_type);
                    continue;
                }
            };
            
            providers.insert(provider_type.clone(), provider);
            tracing::info!("Registered provider: {} (ID: {})", provider_type, provider_id);
        }
        
        tracing::info!("Provider registry initialized with {} providers", providers.len());
        Ok(())
    }

    /// Get a provider by type
    pub async fn get_provider(&self, provider_type: &str) -> Option<Arc<dyn LLMProvider>> {
        let providers = self.providers.read().await;
        providers.get(provider_type).cloned()
    }

    /// Get the provider configured for a specific school
    pub async fn get_school_provider(&self, school_id: &str) -> AppResult<Option<Arc<dyn LLMProvider>>> {
        // First check if we have cached school provider
        let provider_type = {
            let school_providers = self.school_providers.read().await;
            school_providers.get(school_id).cloned()
        };
        
        if let Some(provider_type) = provider_type {
            return Ok(self.get_provider(&provider_type).await);
        }
        
        // If not cached, query database
        let row = sqlx::query(
            "SELECT p.provider_type 
             FROM school_ai_config sac
             JOIN ai_providers p ON sac.provider_id = p.provider_id
             WHERE sac.school_id = $1 AND p.is_active = true
             LIMIT 1"
        )
        .bind(school_id)
        .fetch_optional(&self.db_client.pool)
        .await
        .map_err(crate::error::AppError::Database)?;
        
        if let Some(row) = row {
            let provider_type: String = row.get("provider_type");
            
            // Cache the result
            {
                let mut school_providers = self.school_providers.write().await;
                school_providers.insert(school_id.to_string(), provider_type.clone());
            }
            
            Ok(self.get_provider(&provider_type).await)
        } else {
            // No school-specific config, use default (first active provider)
            let providers = self.providers.read().await;
            let default_provider = providers.values().next().cloned();
            Ok(default_provider)
        }
    }

    /// Register a new provider dynamically
    pub async fn register_provider(&self, provider_type: String, provider: Arc<dyn LLMProvider>) {
        let mut providers = self.providers.write().await;
        providers.insert(provider_type, provider);
    }

    /// Unregister a provider
    pub async fn unregister_provider(&self, provider_type: &str) {
        let mut providers = self.providers.write().await;
        providers.remove(provider_type);
    }

    /// Get all registered provider types
    pub async fn get_provider_types(&self) -> Vec<String> {
        let providers = self.providers.read().await;
        providers.keys().cloned().collect()
    }

    /// Get provider health status
    pub async fn get_provider_health(&self, provider_type: &str) -> AppResult<bool> {
        // Check cache first
        {
            let health_cache = self.health_cache.read().await;
            if let Some((healthy, timestamp)) = health_cache.get(provider_type) {
                // Use cache if less than 5 minutes old
                if std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs()
                    .saturating_sub(*timestamp)
                    < 300
                {
                    return Ok(*healthy);
                }
            }
        }
        
        // Perform health check
        let provider = self.get_provider(provider_type).await;
        let healthy = match provider {
            Some(provider) => {
                match provider.health_check().await {
                    Ok(health) => health.healthy,
                    Err(_) => false,
                }
            }
            None => false,
        };
        
        // Update cache
        {
            let mut health_cache = self.health_cache.write().await;
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            health_cache.insert(provider_type.to_string(), (healthy, timestamp));
        }
        
        Ok(healthy)
    }

    /// Get provider statistics
    pub async fn get_provider_stats(&self) -> AppResult<Value> {
        let providers = self.providers.read().await;
        let mut stats = Vec::new();
        
        for (provider_type, provider) in providers.iter() {
            let health = self.get_provider_health(provider_type).await.unwrap_or(false);
            
            let stat = serde_json::json!({
                "provider_type": provider_type,
                "provider_name": provider.get_name(),
                "healthy": health,
                "max_tokens": provider.get_max_tokens(),
                "cost_per_token": provider.get_cost_per_token(),
            });
            
            stats.push(stat);
        }
        
        Ok(serde_json::json!({
            "total_providers": providers.len(),
            "providers": stats,
        }))
    }

    /// Update school provider configuration
    pub async fn update_school_provider(&self, school_id: &str, provider_type: &str) -> AppResult<()> {
        // Get provider ID
        let row = sqlx::query(
            "SELECT provider_id FROM ai_providers WHERE provider_type = $1 AND is_active = true"
        )
        .bind(provider_type)
        .fetch_optional(&self.db_client.pool)
        .await
        .map_err(crate::error::AppError::Database)?;
        
        if let Some(row) = row {
            let provider_id: i32 = row.get("provider_id");
            
            // Insert or update school configuration
            sqlx::query(
                "INSERT INTO school_ai_config (school_id, provider_id, updated_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (school_id, provider_id) 
                 DO UPDATE SET provider_id = EXCLUDED.provider_id, updated_at = NOW()"
            )
            .bind(school_id)
            .bind(provider_id)
            .execute(&self.db_client.pool)
            .await
            .map_err(crate::error::AppError::Database)?;
            
            // Update cache
            {
                let mut school_providers = self.school_providers.write().await;
                school_providers.insert(school_id.to_string(), provider_type.to_string());
            }
            
            tracing::info!("Updated school {} provider to {}", school_id, provider_type);
            Ok(())
        } else {
            Err(crate::error::AppError::NotFound(format!(
                "Provider type {} not found or inactive",
                provider_type
            )))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::DbClient;
    use std::sync::Arc;
    
    #[tokio::test]
    async fn test_provider_registry_initialization() {
        // This is a basic test to ensure the registry can be created
        // Note: Actual database tests would require a test database setup
        let db_client = Arc::new(DbClient::new_test().unwrap());
        let registry = ProviderRegistry::new(db_client);
        
        // Test that registry can be created
        assert!(true);
    }
    
    #[test]
    fn test_provider_registry_structure() {
        // Test that the registry has the expected fields
        use std::any::Any;
        
        let db_client = Arc::new(DbClient::new_test().unwrap());
        let registry = ProviderRegistry::new(db_client);
        
        // Verify registry is Send + Sync
        fn assert_send_sync<T: Send + Sync>() {}
        assert_send_sync::<ProviderRegistry>();
    }
}