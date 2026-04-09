use crate::repository::Repositories;
use anyhow::{anyhow, Result};
use reqwest::Client;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct AnalysisEngine {
    pub repos: Arc<Repositories>,
    pub http_client: Client,
}

impl AnalysisEngine {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self {
            repos,
            http_client: Client::new(),
        }
    }

    pub async fn fetch_api_key(&self) -> Result<String> {
        let row = sqlx::query("SELECT config_value FROM system_config WHERE config_key = 'GEMINI_API_KEY'")
            .fetch_optional(&self.repos.db_client.pool)
            .await?;
        
        match row {
            Some(r) => Ok(r.get::<String, _>("config_value")),
            None => Err(anyhow!("GEMINI_API_KEY not found in system_config. Please update settings.")),
        }
    }

    pub async fn generate_embedding(&self, text: &str) -> Result<Vec<f32>> {
        let api_key = self.fetch_api_key().await?;
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={}",
            api_key
        );
        let response = self.http_client.post(&url).json(&json!({
            "model": "models/text-embedding-004",
            "content": { "parts": [{"text": text}] }
        })).send().await?;
        let resp_json: Value = response.json().await?;
        if let Some(arr) = resp_json["embedding"]["values"].as_array() {
            return Ok(arr.iter().filter_map(|v| v.as_f64().map(|f| f as f32)).collect());
        }
        Err(anyhow!("Failed to generate embedding: {:?}", resp_json))
    }

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
        if norm_a == 0.0 || norm_b == 0.0 { return 0.0; }
        dot_product / (norm_a.sqrt() * norm_b.sqrt())
    }

    pub async fn search_documents(&self, school_id: &str, query: &str) -> Result<Value> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let query_embedding = self.generate_embedding(query).await?;
        let doc_rows = sqlx::query("SELECT content, embedding FROM document_embeddings")
            .fetch_all(&mut *conn).await.unwrap_or_default();
        let mut dmatches = vec![];
        for dr in doc_rows {
            let sim = Self::calculate_similarity(&query_embedding, &dr.get::<Vec<f32>, _>("embedding"));
            if sim > 0.7 { dmatches.push((sim, dr.get::<String, _>("content"))); }
        }
        dmatches.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap());
        
        Ok(json!({ 
            "excerpts": dmatches.into_iter().take(5).map(|m| m.1).collect::<Vec<_>>() 
        }))
    }
}
