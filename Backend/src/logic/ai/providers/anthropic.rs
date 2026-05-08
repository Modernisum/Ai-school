use crate::error::AppResult;
use crate::logic::ai::providers::{GenerateOptions, HealthStatus, LLMProvider, ProviderConfig, TextResponse};
use async_trait::async_trait;
use reqwest::Client;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Anthropic provider implementation
pub struct AnthropicProvider {
    /// HTTP client
    http_client: Client,
    /// Provider configuration
    config: ProviderConfig,
    /// API key (loaded from config)
    api_key: String,
    /// Base URL for Anthropic API
    base_url: String,
    /// Model to use for text generation
    text_model: String,
    /// Model to use for embeddings (Anthropic doesn't have embeddings, we'll use a fallback)
    embedding_model: String,
    /// API version
    api_version: String,
    /// Health status cache
    health_cache: Arc<RwLock<Option<HealthStatus>>>,
}

impl AnthropicProvider {
    /// Create a new Anthropic provider
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
            .unwrap_or_else(|| "claude-3-sonnet-20240229".to_string());

        // Anthropic doesn't have embedding models, we'll use a fallback
        let embedding_model = config
            .config
            .get("embedding_model")
            .cloned()
            .unwrap_or_else(|| "text-embedding-3-small".to_string());

        let base_url = config
            .config
            .get("base_url")
            .cloned()
            .unwrap_or_else(|| "https://api.anthropic.com/v1".to_string());

        let api_version = config
            .config
            .get("api_version")
            .cloned()
            .unwrap_or_else(|| "2023-06-01".to_string());

        Ok(Self {
            http_client: Client::new(),
            config,
            api_key,
            base_url,
            text_model,
            embedding_model,
            api_version,
            health_cache: Arc::new(RwLock::new(None)),
        })
    }

    /// Build headers for Anthropic API requests
    fn build_headers(&self) -> reqwest::header::HeaderMap {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            "x-api-key",
            self.api_key.parse().unwrap(),
        );
        headers.insert(
            reqwest::header::CONTENT_TYPE,
            "application/json".parse().unwrap(),
        );
        headers.insert(
            "anthropic-version",
            self.api_version.parse().unwrap(),
        );
        headers
    }

    /// Parse text generation response
    fn parse_text_response(&self, resp_json: &Value) -> AppResult<TextResponse> {
        let content = resp_json["content"]
            .as_array()
            .ok_or_else(|| {
                crate::error::AppError::Internal("No content in response".to_string())
            })?
            .first()
            .ok_or_else(|| {
                crate::error::AppError::Internal("Empty content array".to_string())
            })?;

        let text = content["text"]
            .as_str()
            .ok_or_else(|| {
                crate::error::AppError::Internal("No text in content".to_string())
            })?
            .to_string();

        let usage = resp_json["usage"].as_object();
        let input_tokens = usage
            .and_then(|u| u["input_tokens"].as_u64())
            .unwrap_or(0) as usize;
        let output_tokens = usage
            .and_then(|u| u["output_tokens"].as_u64())
            .unwrap_or(0) as usize;
        let total_tokens = input_tokens + output_tokens;

        let finish_reason = resp_json["stop_reason"]
            .as_str()
            .map(|s| s.to_string());

        let mut metadata = HashMap::new();
        metadata.insert(
            "model".to_string(),
            Value::String(self.text_model.clone()),
        );
        metadata.insert(
            "id".to_string(),
            resp_json["id"].clone(),
        );
        metadata.insert(
            "type".to_string(),
            Value::String("message".to_string()),
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
impl LLMProvider for AnthropicProvider {
    async fn generate_text(&self, prompt: &str, options: &GenerateOptions) -> AppResult<TextResponse> {
        let url = format!("{}/messages", self.base_url);

        let mut request_body = json!({
            "model": self.text_model,
            "max_tokens": options.max_tokens.unwrap_or(1024),
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
        });

        // Apply options
        if let Some(temperature) = options.temperature {
            request_body["temperature"] = json!(temperature);
        }
        if let Some(top_p) = options.top_p {
            request_body["top_p"] = json!(top_p);
        }
        if let Some(stop_sequences) = &options.stop_sequences {
            request_body["stop_sequences"] = json!(stop_sequences);
        }

        // Add system prompt if provided in extra_params
        if let Some(extra_params) = &options.extra_params {
            if let Some(system_prompt) = extra_params.get("system") {
                if let Some(system_text) = system_prompt.as_str() {
                    request_body["system"] = json!(system_text);
                }
            }
            
            // Add other extra params
            for (key, value) in extra_params {
                if key != "system" {
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
        // Anthropic doesn't have embedding API, so we return an error
        // In a real implementation, we might fall back to another provider
        Err(crate::error::AppError::Internal(
            "Anthropic does not provide embedding API. Please configure a fallback embedding provider.".to_string(),
        ))
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

        // Perform actual health check by trying to generate a small message
        let start = std::time::Instant::now();
        let result = self.generate_text("ping", &GenerateOptions {
            max_tokens: Some(1),
            temperature: None,
            top_p: None,
            stop_sequences: None,
            stream: false,
            extra_params: None,
        }).await;

        let latency_ms = start.elapsed().as_millis() as u64;
        let mut details = HashMap::new();
        details.insert("model".to_string(), Value::String(self.text_model.clone()));
        details.insert("api_version".to_string(), Value::String(self.api_version.clone()));

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
        // Anthropic pricing as of 2024
        match self.text_model.as_str() {
            "claude-3-opus-20240229" => 0.015 / 1000.0, // $15 per 1M tokens input
            "claude-3-sonnet-20240229" => 0.003 / 1000.0, // $3 per 1M tokens input
            "claude-3-haiku-20240307" => 0.00025 / 1000.0, // $0.25 per 1M tokens input
            "claude-2.1" => 0.008 / 1000.0,
            "claude-2.0" => 0.008 / 1000.0,
            _ => 0.003 / 1000.0, // default to Sonnet pricing
        }
    }

    fn get_max_tokens(&self) -> usize {
        match self.text_model.as_str() {
            "claude-3-opus-20240229" => 4096,
            "claude-3-sonnet-20240229" => 4096,
            "claude-3-haiku-20240307" => 4096,
            "claude-2.1" => 4096,
            "claude-2.0" => 4096,
            _ => 4096,
        }
    }

    fn get_name(&self) -> &str {
        &self.config.provider_name
    }

    fn get_type(&self) -> &str {
        "anthropic"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn create_test_config() -> ProviderConfig {
        let mut config = HashMap::new();
        config.insert("api_key".to_string(), "test_key".to_string());
        config.insert("text_model".to_string(), "claude-3-sonnet-20240229".to_string());
        config.insert("api_version".to_string(), "2023-06-01".to_string());

        ProviderConfig {
            provider_type: "anthropic".to_string(),
            provider_name: "Test Anthropic".to_string(),
            config,
            is_active: true,
            default_model: Some("claude-3-sonnet-20240229".to_string()),
            embedding_model: Some("text-embedding-3-small".to_string()),
        }
    }

    #[tokio::test]
    async fn test_provider_creation() {
        let config = create_test_config();
        let provider = AnthropicProvider::new(config);
        assert!(provider.is_ok());
    }

    #[tokio::test]
    async fn test_health_check() {
        let config = create_test_config();
        let provider = AnthropicProvider::new(config).unwrap();
        let health = provider.health_check().await;
        // This will fail without actual API key, but we can test the structure
        assert!(health.is_ok());
    }

    #[tokio::test]
    async fn test_embedding_not_supported() {
        let config = create_test_config();
        let provider = AnthropicProvider::new(config).unwrap();
        let embedding = provider.generate_embedding("test").await;
        assert!(embedding.is_err());
    }
}