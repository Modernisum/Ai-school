use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::{Row, Acquire};
use std::sync::Arc;

pub struct PostgresAiRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl AiRepository for PostgresAiRepository {
    async fn get_active_ai_providers(&self) -> Result<Vec<(String, String, Value)>, AppError> {
        let rows = sqlx::query("SELECT provider_type, provider_name, config FROM ai_providers WHERE is_active = true")
            .fetch_all(&self.client.pool)
            .await?;

        let mut result = Vec::new();
        for row in rows {
            let provider_type: String = row.get("provider_type");
            let provider_name: String = row.get("provider_name");
            let config: Value = row.get("config");
            result.push((provider_type, provider_name, config));
        }
        Ok(result)
    }

    async fn get_school_ai_provider_type(&self, school_id: &str) -> Result<Option<String>, AppError> {
        let row = sqlx::query(
            "SELECT p.provider_type FROM school_ai_config s \
             JOIN ai_providers p ON s.provider_id = p.provider_id \
             WHERE s.school_id = $1 AND p.is_active = true \
             LIMIT 1"
        )
        .bind(school_id)
        .fetch_optional(&self.client.pool)
        .await?;

        Ok(row.map(|r| r.get("provider_type")))
    }

    async fn search_similar_documents(
        &self,
        school_id: &str,
        query_embedding: &[f32],
        limit: i64,
    ) -> Result<Vec<(String, Vec<f32>)>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT content, embedding FROM document_embeddings \
             WHERE embedding IS NOT NULL \
             ORDER BY embedding <=> $1::real[] \
             LIMIT $2"
        )
        .bind(query_embedding)
        .bind(limit)
        .fetch_all(&mut *conn)
        .await?;

        let mut result = Vec::new();
        for row in rows {
            let content: String = row.get("content");
            let embedding: Vec<f32> = row.get("embedding");
            result.push((content, embedding));
        }
        Ok(result)
    }

    async fn store_document_embedding(
        &self,
        school_id: &str,
        content: &str,
        embedding: &[f32],
        metadata: &Value,
    ) -> Result<i64, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query(
            "INSERT INTO document_embeddings (content, embedding, metadata, created_at) \
             VALUES ($1, $2, $3, NOW()) \
             RETURNING id"
        )
        .bind(content)
        .bind(embedding)
        .bind(metadata)
        .fetch_one(&mut *conn)
        .await?;

        let id: i64 = row.get("id");
        Ok(id)
    }

    async fn get_school_ai_configs(&self, school_id: &str) -> Result<Vec<SchoolAiConfig>, AppError> {
        let rows = sqlx::query(
            "SELECT school_id, provider_id, default_model, embedding_model, \
                    max_monthly_cost, features_enabled \
             FROM school_ai_config \
             WHERE school_id = $1 \
             ORDER BY provider_id"
        )
        .bind(school_id)
        .fetch_all(&self.client.pool)
        .await?;

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

    async fn check_provider_active(&self, provider_id: i32) -> Result<bool, AppError> {
        let provider_exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM ai_providers WHERE provider_id = $1 AND is_active = true)"
        )
        .bind(provider_id)
        .fetch_one(&self.client.pool)
        .await?;
        Ok(provider_exists)
    }

    async fn upsert_school_ai_config(
        &self,
        school_id: &str,
        provider_id: i32,
        default_model: Option<String>,
        embedding_model: Option<String>,
        max_monthly_cost: Option<f64>,
        features_enabled: Value,
    ) -> Result<SchoolAiConfig, AppError> {
        let row = sqlx::query(
            "INSERT INTO school_ai_config \
             (school_id, provider_id, default_model, embedding_model, max_monthly_cost, features_enabled, updated_at) \
             VALUES ($1, $2, $3, $4, $5, $6, NOW()) \
             ON CONFLICT (school_id, provider_id) \
             DO UPDATE SET \
                default_model = EXCLUDED.default_model, \
                embedding_model = EXCLUDED.embedding_model, \
                max_monthly_cost = EXCLUDED.max_monthly_cost, \
                features_enabled = EXCLUDED.features_enabled, \
                updated_at = NOW() \
             RETURNING school_id, provider_id, default_model, embedding_model, max_monthly_cost, features_enabled"
        )
        .bind(school_id)
        .bind(provider_id)
        .bind(default_model)
        .bind(embedding_model)
        .bind(max_monthly_cost)
        .bind(features_enabled)
        .fetch_one(&self.client.pool)
        .await?;

        Ok(SchoolAiConfig {
            school_id: row.get("school_id"),
            provider_id: row.get("provider_id"),
            default_model: row.get("default_model"),
            embedding_model: row.get("embedding_model"),
            max_monthly_cost: row.get("max_monthly_cost"),
            features_enabled: row.get("features_enabled"),
        })
    }

    async fn delete_school_ai_config(&self, school_id: &str, provider_id: i32) -> Result<bool, AppError> {
        let result = sqlx::query(
            "DELETE FROM school_ai_config WHERE school_id = $1 AND provider_id = $2"
        )
        .bind(school_id)
        .bind(provider_id)
        .execute(&self.client.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    async fn get_school_providers_with_config(&self, school_id: &str) -> Result<Vec<Value>, AppError> {
        let rows = sqlx::query(
            "SELECT p.provider_id, p.provider_type, p.provider_name, p.config, \
                    sac.default_model, sac.embedding_model, sac.max_monthly_cost, sac.features_enabled \
             FROM ai_providers p \
             LEFT JOIN school_ai_config sac ON p.provider_id = sac.provider_id AND sac.school_id = $1 \
             WHERE p.is_active = true \
             ORDER BY p.provider_type"
        )
        .bind(school_id)
        .fetch_all(&self.client.pool)
        .await?;

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

    async fn get_default_school_provider(&self, school_id: &str) -> Result<Option<Value>, AppError> {
        let row = sqlx::query(
            "SELECT p.provider_id, p.provider_type, p.provider_name, p.config, \
                    sac.default_model, sac.embedding_model \
             FROM school_ai_config sac \
             JOIN ai_providers p ON sac.provider_id = p.provider_id \
             WHERE sac.school_id = $1 AND p.is_active = true \
             ORDER BY sac.updated_at DESC \
             LIMIT 1"
        )
        .bind(school_id)
        .fetch_optional(&self.client.pool)
        .await?;

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
                "SELECT provider_id, provider_type, provider_name, config \
                 FROM ai_providers \
                 WHERE is_active = true \
                 ORDER BY provider_id \
                 LIMIT 1"
            )
            .fetch_optional(&self.client.pool)
            .await?;

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

