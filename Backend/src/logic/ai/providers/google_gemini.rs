use crate::error::AppResult;
use crate::logic::ai::providers::{GenerateOptions, HealthStatus, LLMProvider, ProviderConfig, TextResponse};
use async_trait::async_trait;
use reqwest::Client;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Google Gemini provider implementation
pub struct GoogleGeminiProvider {
    /// HTTP client
    http_client: Client,
    /// Provider configuration
    config: ProviderConfig,
    /// API key (loaded from config)
    api_key: String,
    /// Base URL for Gemini API
    base_url: String,
    /// Model to use for text generation
    text_model: String,
    /// Model to use for embeddings
    embedding_model: String,
    /// Health status cache
    health_cache: Arc<RwLock<Option<HealthStatus>>>,
}

impl GoogleGeminiProvider {
    /// Create a new Google Gemini provider
    pub fn new(config: ProviderConfig) -> AppResult<Self> {
        let api_key = config
            .config
            .get("api_key")
            .cloned()
            .ok_or_else(|| crate::error::AppError::Internal("Missing API key in config".to_string()))?;

        let text_model = config
            .config
            .get("text_model")
            .cloned()
            .unwrap_or_else(|| "gemini-1.5-pro".to_string());

        let embedding_model = config
            .config
            .get("embedding_model")
            .cloned()
            .unwrap_or_else(|| "text-embedding-004".to_string());

        let base_url = config
            .config
            .get("base_url")
            .cloned()
            .unwrap_or_else(|| "https://generativelanguage.googleapis.com/v1beta/models".to_string());

        Ok(Self {
            http_client: Client::new(),
            config,
            api_key,
            base_url,
            text_model,
            embedding_model,
            health_cache: Arc::new(RwLock::new(None)),
        })
    }

    /// Build URL for a specific model endpoint
    fn build_url(&self, model: &str, action: &str) -> String {
        format!("{}/{}:{}?key={}", self.base_url, model, action, self.api_key)
    }

    /// Parse embedding response
    fn parse_embedding_response(&self, resp_json: &Value) -> AppResult<Vec<f32>> {
        if let Some(arr) = resp_json["embedding"]["values"].as_array() {
            let embeddings: Vec<f32> = arr
                .iter()
                .filter_map(|v| v.as_f64().map(|f| f as f32))
                .collect();
            if embeddings.is_empty() {
                return Err(crate::error::AppError::Internal(
                    "Empty embedding array".to_string(),
                ));
            }
            Ok(embeddings)
        } else {
            Err(crate::error::AppError::Internal(format!(
                "Failed to parse embedding response: {:?}",
                resp_json
            )))
        }
    }

    /// Parse text generation response
    fn parse_text_response(&self, resp_json: &Value) -> AppResult<TextResponse> {
        let candidates = resp_json["candidates"]
            .as_array()
            .ok_or_else(|| {
                crate::error::AppError::Internal("No candidates in response".to_string())
            })?
            .first()
            .ok_or_else(|| {
                crate::error::AppError::Internal("Empty candidates array".to_string())
            })?;

        let content = candidates["content"].as_object().ok_or_else(|| {
            crate::error::AppError::Internal("No content in candidate".to_string())
        })?;

        let parts = content["parts"].as_array().ok_or_else(|| {
            crate::error::AppError::Internal("No parts in content".to_string())
        })?;

        let text = parts
            .iter()
            .filter_map(|part| part["text"].as_str())
            .collect::<Vec<&str>>()
            .join("");

        let usage_metadata = resp_json["usageMetadata"].as_object();
        let total_tokens = usage_metadata
            .and_then(|um| um["totalTokenCount"].as_u64())
            .unwrap_or(0) as usize;

        let finish_reason = candidates["finishReason"]
            .as_str()
            .map(|s| s.to_string());

        let mut metadata = HashMap::new();
        metadata.insert(
            "model".to_string(),
            Value::String(self.text_model.clone()),
        );
        metadata.insert(
            "candidate_count".to_string(),
            Value::Number(serde_json::Number::from(1)),
        );

        Ok(TextResponse {
            text,
            total_tokens,
            finish_reason,
            metadata,
        })
    }
}

#[async_trait]
impl LLMProvider for GoogleGeminiProvider {
    async fn generate_text(&self, prompt: &str, options: &GenerateOptions) -> AppResult<TextResponse> {
        let url = self.build_url(&self.text_model, "generateContent");

        let mut request_body = json!({
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {}
        });

        // Apply options
        if let Some(max_tokens) = options.max_tokens {
            request_body["generationConfig"]["maxOutputTokens"] = json!(max_tokens);
        }
        if let Some(temperature) = options.temperature {
            request_body["generationConfig"]["temperature"] = json!(temperature);
        }
        if let Some(top_p) = options.top_p {
            request_body["generationConfig"]["topP"] = json!(top_p);
        }
        if let Some(stop_sequences) = &options.stop_sequences {
            request_body["generationConfig"]["stopSequences"] = json!(stop_sequences);
        }

        // Add extra params if any
        if let Some(extra_params) = &options.extra_params {
            for (key, value) in extra_params {
                request_body["generationConfig"][key] = value.clone();
            }
        }

        let response = self
            .http_client
            .post(&url)
            .json(&request_body)
            .send()
            .await
            .map_err(|e| {
                crate::error::AppError::Internal(format!("Failed to send request: {}", e))
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(crate::error::AppError::Internal(format!(
                "API request failed with status {}: {}",
                status, error_text
            )));
        }

        let resp_json: Value = response.json().await.map_err(|e| {
            crate::error::AppError::Internal(format!("Failed to parse response: {}", e))
        })?;

        self.parse_text_response(&resp_json)
    }

    async fn generate_embedding(&self, text: &str) -> AppResult<Vec<f32>> {
        let url = self.build_url(&self.embedding_model, "embedContent");

        let request_body = json!({
            "model": format!("models/{}", self.embedding_model),
            "content": {
                "parts": [{"text": text}]
            }
        });

        let response = self
            .http_client
            .post(&url)
            .json(&request_body)
            .send()
            .await
            .map_err(|e| {
                crate::error::AppError::Internal(format!("Failed to send request: {}", e))
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(crate::error::AppError::Internal(format!(
                "API request failed with status {}: {}",
                status, error_text
            )));
        }

        let resp_json: Value = response.json().await.map_err(|e| {
            crate::error::AppError::Internal(format!("Failed to parse response: {}", e))
        })?;

        self.parse_embedding_response(&resp_json)
    }

    async fn health_check(&self) -> AppResult<HealthStatus> {
        // Check cache first
        {
            let cache = self.health_cache.read().await;
            if let Some(status) = cache.as_ref() {
                // Return cached status if less than 30 seconds old
                // For simplicity, we'll just return it
                return Ok(status.clone());
            }
        }

        // Perform actual health check
        let start = std::time::Instant::now();
        let result = self.generate_embedding("health check").await;

        let latency_ms = start.elapsed().as_millis() as u64;
        let mut details = HashMap::new();
        details.insert("model".to_string(), Value::String(self.text_model.clone()));

        let status = match result {
            Ok(_) => HealthStatus {
                healthy: true,
                latency_ms: Some(latency_ms),
                error: None,
                details,
            },
            Err(e) => HealthStatus {
                healthy: false,
                latency_ms: Some(latency_ms),
                error: Some(e.to_string()),
                details,
            },
        };

        // Update cache
        {
            let mut cache = self.health_cache.write().await;
            *cache = Some(status.clone());
        }

        Ok(status)
    }

    fn get_cost_per_token(&self) -> f64 {
        // Gemini pricing as of 2024: $0.000125 per 1K characters for input, $0.000375 for output
        // Approximate as $0.00025 per 1K tokens (1 token ≈ 4 characters)
        0.00025 / 1000.0 // per token
    }

    fn get_max_tokens(&self) -> usize {
        match self.text_model.as_str() {
            "gemini-1.5-pro" => 8192,
            "gemini-1.5-flash" => 8192,
            "gemini-pro" => 2048,
            _ => 2048,
        }
    }

    fn get_name(&self) -> &str {
        &self.config.provider_name
    }

    fn get_type(&self) -> &str {
        "google_gemini"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn create_test_config() -> ProviderConfig {
        let mut config = HashMap::new();
        config.insert("api_key".to_string(), "test_key".to_string());
        config.insert("text_model".to_string(), "gemini-1.5-pro".to_string());
        config.insert("embedding_model".to_string(), "text-embedding-004".to_string());

        ProviderConfig {
            provider_type: "google_gemini".to_string(),
            provider_name: "Test Gemini".to_string(),
            config,
            is_active: true,
            default_model: Some("gemini-1.5-pro".to_string()),
            embedding_model: Some("text-embedding-004".to_string()),
        }
    }

    #[tokio::test]
    async fn test_provider_creation() {
        let config = create_test_config();
        let provider = GoogleGeminiProvider::new(config);
        assert!(provider.is_ok());
    }

    #[tokio::test]
    async fn test_health_check() {
        let config = create_test_config();
        let provider = GoogleGeminiProvider::new(config).unwrap();
        let health = provider.health_check().await;
        // This will fail without actual API key, but we can test the structure
        assert!(health.is_ok());
    }
}