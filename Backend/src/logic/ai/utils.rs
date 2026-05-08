use crate::repository::Repositories;
use anyhow::{anyhow, Result};
use sqlx::Row;
use std::sync::Arc;

/// Shared AI utility functions used across all AI engine modules.

/// Fetch the Gemini API key from system_config
pub async fn fetch_api_key(repos: &Arc<Repositories>) -> Result<String> {
    let row = sqlx::query("SELECT config_value FROM system_config WHERE config_key = 'GEMINI_API_KEY'")
        .fetch_optional(&repos.db_client.pool)
        .await?;

    match row {
        Some(r) => Ok(r.get::<String, _>("config_value")),
        None => Err(anyhow!(
            "GEMINI_API_KEY not found in system_config. Please update settings."
        )),
    }
}

/// Cosine similarity between two float vectors
pub fn calculate_similarity(vec1: &[f32], vec2: &[f32]) -> f32 {
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
