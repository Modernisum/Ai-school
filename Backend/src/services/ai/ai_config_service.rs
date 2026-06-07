use crate::error::{AppError, AppResult};
use crate::services::traits::*;
use crate::repository::{Repositories, SchoolAiConfig};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;

/// Request for updating school AI configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSchoolAiConfigRequest {
    pub provider_id: i32,
    pub default_model: Option<String>,
    pub embedding_model: Option<String>,
    pub max_monthly_cost: Option<f64>,
    pub features_enabled: Option<Value>,
}

/// Service for managing school-specific AI configurations
pub struct SchoolAiConfigService {
    repos: Arc<Repositories>,
}

impl SchoolAiConfigService {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    /// Get AI configuration for a school
    pub async fn get_config(&self, school_id: &str) -> AppResult<Vec<SchoolAiConfig>> {
        let configs = self.repos.ai.get_school_ai_configs(school_id).await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(configs)
    }

    /// Update or create AI configuration for a school
    pub async fn update_config(
        &self,
        school_id: &str,
        config: UpdateSchoolAiConfigRequest,
    ) -> AppResult<SchoolAiConfig> {
        // First, verify the provider exists and is active
        let provider_exists = self.repos.ai.check_provider_active(config.provider_id).await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if !provider_exists {
            return Err(AppError::NotFound(format!(
                "Provider with ID {} not found or inactive",
                config.provider_id
            )));
        }

        // Upsert the configuration
        let features = config.features_enabled.unwrap_or_else(|| Value::Object(Default::default()));
        let updated = self.repos.ai.upsert_school_ai_config(
            school_id,
            config.provider_id,
            config.default_model,
            config.embedding_model,
            config.max_monthly_cost,
            features,
        ).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(updated)
    }

    /// Delete AI configuration for a school
    pub async fn delete_config(&self, school_id: &str, provider_id: i32) -> AppResult<bool> {
        let deleted = self.repos.ai.delete_school_ai_config(school_id, provider_id).await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(deleted)
    }

    /// Get all active providers for a school
    pub async fn get_school_providers(&self, school_id: &str) -> AppResult<Vec<Value>> {
        let providers = self.repos.ai.get_school_providers_with_config(school_id).await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(providers)
    }

    /// Get default provider for a school (first configured provider or first active provider)
    pub async fn get_default_provider(&self, school_id: &str) -> AppResult<Option<Value>> {
        let provider = self.repos.ai.get_default_school_provider(school_id).await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(provider)
    }
}

#[async_trait]
impl AiConfigService for SchoolAiConfigService {
    async fn get_school_ai_config(&self, school_id: &str) -> AppResult<Value> {
        let configs = self.get_config(school_id).await?;
        let providers = self.get_school_providers(school_id).await?;
        let default_provider = self.get_default_provider(school_id).await?;

        Ok(json!({
            "configurations": configs,
            "available_providers": providers,
            "default_provider": default_provider,
        }))
    }

    async fn update_school_ai_config(&self, school_id: &str, config: Value) -> AppResult<Value> {
        let request: UpdateSchoolAiConfigRequest = serde_json::from_value(config)
            .map_err(|e| AppError::Validation(format!("Invalid configuration: {}", e)))?;

        let updated_config = self.update_config(school_id, request).await?;
        Ok(serde_json::to_value(updated_config)
            .map_err(|e| AppError::Internal(e.to_string()))?)
    }

    async fn delete_school_ai_config(&self, school_id: &str, provider_id: i32) -> AppResult<bool> {
        self.delete_config(school_id, provider_id).await
    }
}
