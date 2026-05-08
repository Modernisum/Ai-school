use crate::error::{AppError, AppResult};
use crate::services::traits::*;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

/// Configuration for a school's AI settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchoolAiConfig {
    pub school_id: String,
    pub provider_id: i32,
    pub default_model: Option<String>,
    pub embedding_model: Option<String>,
    pub max_monthly_cost: Option<f64>,
    pub features_enabled: Value,
}

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
    db_client: Arc<crate::db::DbClient>,
}

impl SchoolAiConfigService {
    pub fn new(db_client: Arc<crate::db::DbClient>) -> Self {
        Self { db_client }
    }

    /// Get AI configuration for a school
    pub async fn get_config(&self, school_id: &str) -> AppResult<Vec<SchoolAiConfig>> {
        let rows = sqlx::query(
            "SELECT school_id, provider_id, default_model, embedding_model, 
                    max_monthly_cost, features_enabled
             FROM school_ai_config 
             WHERE school_id = $1
             ORDER BY provider_id"
        )
        .bind(school_id)
        .fetch_all(&self.db_client.pool)
        .await
        .map_err(AppError::Database)?;

        let mut configs = Vec::new();
        for row in rows {
            configs.push(SchoolAiConfig {
                school_id: row.get("school_id"),
                provider_id: row.get("provider_id"),
                default_model: row.get("default_model"),
                embedding_model: row.get("embedding_model"),
                max_monthly_cost: row.get("max_monthly_cost"),
                features_enabled: row.get("features_enabled"),
            });
        }

        Ok(configs)
    }

    /// Update or create AI configuration for a school
    pub async fn update_config(
        &self,
        school_id: &str,
        config: UpdateSchoolAiConfigRequest,
    ) -> AppResult<SchoolAiConfig> {
        // First, verify the provider exists and is active
        let provider_exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM ai_providers WHERE provider_id = $1 AND is_active = true)"
        )
        .bind(config.provider_id)
        .fetch_one(&self.db_client.pool)
        .await
        .map_err(AppError::Database)?;

        if !provider_exists {
            return Err(AppError::NotFound(format!(
                "Provider with ID {} not found or inactive",
                config.provider_id
            )));
        }

        // Upsert the configuration
        let row = sqlx::query(
            "INSERT INTO school_ai_config 
             (school_id, provider_id, default_model, embedding_model, max_monthly_cost, features_enabled, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (school_id, provider_id) 
             DO UPDATE SET 
                default_model = EXCLUDED.default_model,
                embedding_model = EXCLUDED.embedding_model,
                max_monthly_cost = EXCLUDED.max_monthly_cost,
                features_enabled = EXCLUDED.features_enabled,
                updated_at = NOW()
             RETURNING school_id, provider_id, default_model, embedding_model, max_monthly_cost, features_enabled"
        )
        .bind(school_id)
        .bind(config.provider_id)
        .bind(config.default_model)
        .bind(config.embedding_model)
        .bind(config.max_monthly_cost)
        .bind(config.features_enabled.unwrap_or_else(|| Value::Object(Default::default())))
        .fetch_one(&self.db_client.pool)
        .await
        .map_err(AppError::Database)?;

        Ok(SchoolAiConfig {
            school_id: row.get("school_id"),
            provider_id: row.get("provider_id"),
            default_model: row.get("default_model"),
            embedding_model: row.get("embedding_model"),
            max_monthly_cost: row.get("max_monthly_cost"),
            features_enabled: row.get("features_enabled"),
        })
    }

    /// Delete AI configuration for a school
    pub async fn delete_config(&self, school_id: &str, provider_id: i32) -> AppResult<bool> {
        let result = sqlx::query(
            "DELETE FROM school_ai_config WHERE school_id = $1 AND provider_id = $2"
        )
        .bind(school_id)
        .bind(provider_id)
        .execute(&self.db_client.pool)
        .await
        .map_err(AppError::Database)?;

        Ok(result.rows_affected() > 0)
    }

    /// Get all active providers for a school
    pub async fn get_school_providers(&self, school_id: &str) -> AppResult<Vec<Value>> {
        let rows = sqlx::query(
            "SELECT p.provider_id, p.provider_type, p.provider_name, p.config,
                    sac.default_model, sac.embedding_model, sac.max_monthly_cost, sac.features_enabled
             FROM ai_providers p
             LEFT JOIN school_ai_config sac ON p.provider_id = sac.provider_id AND sac.school_id = $1
             WHERE p.is_active = true
             ORDER BY p.provider_type"
        )
        .bind(school_id)
        .fetch_all(&self.db_client.pool)
        .await
        .map_err(AppError::Database)?;

        let mut providers = Vec::new();
        for row in rows {
            providers.push(json!({
                "provider_id": row.get::<i32, _>("provider_id"),
                "provider_type": row.get::<String, _>("provider_type"),
                "provider_name": row.get::<String, _>("provider_name"),
                "default_model": row.get::<Option<String>, _>("default_model"),
                "embedding_model": row.get::<Option<String>, _>("embedding_model"),
                "max_monthly_cost": row.get::<Option<f64>, _>("max_monthly_cost"),
                "features_enabled": row.get::<Value, _>("features_enabled"),
                "is_configured": !row.get::<Option<String>, _>("default_model").is_none(),
            }));
        }

        Ok(providers)
    }

    /// Get default provider for a school (first configured provider or first active provider)
    pub async fn get_default_provider(&self, school_id: &str) -> AppResult<Option<Value>> {
        let row = sqlx::query(
            "SELECT p.provider_id, p.provider_type, p.provider_name, p.config,
                    sac.default_model, sac.embedding_model
             FROM school_ai_config sac
             JOIN ai_providers p ON sac.provider_id = p.provider_id
             WHERE sac.school_id = $1 AND p.is_active = true
             ORDER BY sac.updated_at DESC
             LIMIT 1"
        )
        .bind(school_id)
        .fetch_optional(&self.db_client.pool)
        .await
        .map_err(AppError::Database)?;

        if let Some(row) = row {
            Ok(Some(json!({
                "provider_id": row.get::<i32, _>("provider_id"),
                "provider_type": row.get::<String, _>("provider_type"),
                "provider_name": row.get::<String, _>("provider_name"),
                "default_model": row.get::<Option<String>, _>("default_model"),
                "embedding_model": row.get::<Option<String>, _>("embedding_model"),
            })))
        } else {
            // Fallback to first active provider
            let row = sqlx::query(
                "SELECT provider_id, provider_type, provider_name, config
                 FROM ai_providers
                 WHERE is_active = true
                 ORDER BY provider_id
                 LIMIT 1"
            )
            .fetch_optional(&self.db_client.pool)
            .await
            .map_err(AppError::Database)?;

            if let Some(row) = row {
                Ok(Some(json!({
                    "provider_id": row.get::<i32, _>("provider_id"),
                    "provider_type": row.get::<String, _>("provider_type"),
                    "provider_name": row.get::<String, _>("provider_name"),
                    "default_model": None::<String>,
                    "embedding_model": None::<String>,
                })))
            } else {
                Ok(None)
            }
        }
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
