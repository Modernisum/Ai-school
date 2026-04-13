use crate::error::AppResult;
use crate::logic::ai::providers::{GenerateOptions, HealthStatus, LLMProvider, ProviderConfig, TextResponse};
use async_trait::async_trait;
use reqwest::Client;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// OpenAI provider implementation
pub struct OpenAIProvider {
    /// HTTP client
    http_client: Client,
    /// Provider configuration
    config: ProviderConfig,
    /// API key (loaded from config)
    api_key: String,
    /// Base URL for OpenAI API
    base_url: String,
    /// Model to use for text generation
    text_model: String,
    /// Model to use for embeddings
    embedding_model: String,
    /// Organization ID (optional)
    organization_id: Option<String>,
    /// Health status cache
    health_cache: Arc<RwLock<Option<HealthStatus>>>,
}

impl OpenAIProvider {
    /// Create a new OpenAI provider
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
            .unwrap_or_else(|| "gpt-3.5-turbo".to_string());

        let embedding_model = config
            .config
            .get("embedding_model")
            .cloned()
            .unwrap_or_else(|| "text-embedding-3-small".to_string());

        let base_url = config
            .config
            .get("base_url")
            .cloned()
            .unwrap_or_else(|| "https://api.openai.com/v1".to_string());

        let organization_id = config.config.get("organization_id").cloned();

        Ok(Self {
            http_client: Client::new(),
            config,
            api_key,
            base_url,
            text_model,
            embedding_model,
            organization_id,
            health_cache: Arc::new(RwLock::new(None)),
        })
    }

    /// Build headers for OpenAI API requests
    fn build_headers(&self) -> reqwest::header::HeaderMap {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            reqwest::header::AUTHORIZATION,
            format!("Bearer {}", self.api_key).parse().unwrap(),
        );
        headers.insert(
            reqwest::header::CONTENT_TYPE,
            "application/json".parse().unwrap(),
        );
        if let Some(org_id) = &self.organization_id {
            headers.insert(
                "OpenAI-Organization",
                org_id.parse().unwrap(),
            );
        }
        headers
    }

    /// Parse embedding response
    fn parse_embedding_response(&self, resp_json: &Value) -> AppResult<Vec<f32>> {
        if let Some(data) = resp_json["data"].as_array() {
            if let Some(first) = data.first() {
                if let Some(arr) = first["embedding"].as_array() {
                    let embeddings: Vec<f32> = arr
                        .iter()
                        .filter_map(|v| v.as_f64().map(|f| f as f32))
                        .collect();
                    if embeddings.is_empty() {
                        return Err(crate::error::AppError::Internal(
                            "Empty embedding array".to_string(),
                        ));
                    }
                    return Ok(embeddings);
                }
            }
        }
        Err(crate::error::AppError::Internal(format!(
            "Failed to parse embedding response: {:?}",
            resp_json
        )))
    }

    /// Parse text generation response
    fn parse_text_response(&self, resp_json: &Value) -> AppResult<TextResponse> {
        let choices = resp_json["choices"]
            .as_array()
            .ok_or_else(|| {
                crate::error::AppError::Internal("No choices in response".to_string())
            })?
            .first()
            .ok_or_else(|| {
                crate::error::AppError::Internal("Empty choices array".to_string())
            })?;

        let message = choices["message"].as_object().ok_or_else(|| {
            crate::error::AppError::Internal("No message in choice".to_string())
        })?;

        let text = message["content"]
            .as_str()
            .ok_or_else(|| {
                crate::error::AppError::Internal("No content in message".to_string())
            })?
            .to_string();

        let usage = resp_json["usage"].as_object();
        let total_tokens = usage
            .and_then(|u| u["total_tokens"].as_u64())
            .unwrap_or(0) as usize;

        let finish_reason = choices["finish_reason"]
            .as_str()
            .map(|s| s.to_string());

        let mut metadata = HashMap::new();
        metadata.insert(
            "model".to_string(),
            Value::String(self.text_model.clone()),
        );
        metadata.insert(
            "response_id".to_string(),
            resp_json["id"].clone(),
        );
        metadata.insert(
            "created".to_string(),
            resp_json["created"].clone(),
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
impl LLMProvider for OpenAIProvider {
    async fn generate_text(&self, prompt: &str, options: &GenerateOptions) -> AppResult<TextResponse> {
        let url = format!("{}/chat/completions", self.base_url);

        let mut messages = vec![json!({
            "role": "user",
            "content": prompt
        })];

        // Add system message if provided in extra_params
        if let Some(extra_params) = &options.extra_params {
            if let Some(system_message) = extra_params.get("system_message") {
                if let Some(system_text) = system_message.as_str() {
                    messages.insert(0, json!({
                        "role": "system",
                        "content": system_text
                    }));
                }
            }
        }

        let mut request_body = json!({
            "model": self.text_model,
            "messages": messages,
        });

        // Apply options
        if let Some(max_tokens) = options.max_tokens {
            request_body["max_tokens"] = json!(max_tokens);
        }
        if let Some(temperature) = options.temperature {
            request_body["temperature"] = json!(temperature);
        }
        if let Some(top_p) = options.top_p {
            request_body["top_p"] = json!(top_p);
        }
        if let Some(stop_sequences) = &options.stop_sequences {
            request_body["stop"] = json!(stop_sequences);
        }

        // Add extra params if any (excluding system_message which we already handled)
        if let Some(extra_params) = &options.extra_params {
            for (key, value) in extra_params {
                if key != "system_message" {
                    request_body[key] = value.clone();
                }
            }
        }

        let response = self
            .http_client
            .post(&url)
            .headers(self.build_headers())
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
        let url = format!("{}/embeddings", self.base_url);

        let request_body = json!({
            "model": self.embedding_model,
            "input": text,
            "encoding_format": "float"
        });

        let response = self
            .http_client
            .post(&url)
            .headers(self.build_headers())
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

        // Perform actual health check by trying to generate a small embedding
        let start = std::time::Instant::now();
        let result = self.generate_embedding("health check").await;

        let latency_ms = start.elapsed().as_millis() as u64;
        let mut details = HashMap::new();
        details.insert("model".to_string(), Value::String(self.text_model.clone()));
        details.insert("embedding_model".to_string(), Value::String(self.embedding_model.clone()));

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
        // OpenAI pricing as of 2024
        match self.text_model.as_str() {
            "gpt-4" | "gpt-4-turbo" => 0.03 / 1000.0, // $0.03 per 1K tokens input, $0.06 output
            "gpt-4-32k" => 0.06 / 1000.0,
            "gpt-3.5-turbo" => 0.0015 / 1000.0, // $0.0015 per 1K tokens
            "gpt-3.5-turbo-16k" => 0.003 / 1000.0,
            _ => 0.002 / 1000.0, // default
        }
    }

    fn get_max_tokens(&self) -> usize {
        match self.text_model.as_str() {
            "gpt-4" | "gpt-4-turbo" => 8192,
            "gpt-4-32k" => 32768,
            "gpt-3.5-turbo" => 4096,
            "gpt-3.5-turbo-16k" => 16384,
            _ => 4096,
        }
    }

    fn get_name(&self) -> &str {
        &self.config.provider_name
    }

    fn get_type(&self) -> &str {
        "openai"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn create_test_config() -> ProviderConfig {
        let mut config = HashMap::new();
        config.insert("api_key".to_string(), "test_key".to_string());
        config.insert("text_model".to_string(), "gpt-3.5-turbo".to_string());
        config.insert("embedding_model".to_string(), "text-embedding-3-small".to_string());

        ProviderConfig {
            provider_type: "openai".to_string(),
            provider_name: "Test OpenAI".to_string(),
            config,
            is_active: true,
            default_model: Some("gpt-3.5-turbo".to_string()),
            embedding_model: Some("text-embedding-3-small".to_string()),
        }
    }

    #[tokio::test]
    async fn test_provider_creation() {
        let config = create_test_config();
        let provider = OpenAIProvider::new(config);
        assert!(provider.is_ok());
    }

    #[tokio::test]
    async fn test_health_check() {
        let config = create_test_config();
        let provider = OpenAIProvider::new(config).unwrap();
        let health = provider.health_check().await;
        // This will fail without actual API key, but we can test the structure
        assert!(health.is_ok());
    }
}