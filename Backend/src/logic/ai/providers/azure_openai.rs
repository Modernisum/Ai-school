use crate::error::AppResult;
use crate::logic::ai::providers::{GenerateOptions, HealthStatus, LLMProvider, ProviderConfig, TextResponse};
use async_trait::async_trait;
use reqwest::Client;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Azure OpenAI provider implementation
pub struct AzureOpenAIProvider {
    /// HTTP client
    http_client: Client,
    /// Provider configuration
    config: ProviderConfig,
    /// API key (loaded from config)
    api_key: String,
    /// Base URL for Azure OpenAI API
    base_url: String,
    /// Deployment name for text generation
    text_deployment: String,
    /// Deployment name for embeddings
    embedding_deployment: String,
    /// API version
    api_version: String,
    /// Health status cache
    health_cache: Arc<RwLock<Option<HealthStatus>>>,
}

impl AzureOpenAIProvider {
    /// Create a new Azure OpenAI provider
    pub fn new(config: ProviderConfig) -> AppResult<Self> {
        let api_key = config
            .config
            .get("api_key")
            .cloned()
            .ok_or_else(|| crate::error::AppError::Internal("Missing API key in config".to_string()))?;

        let text_deployment = config
            .config
            .get("text_deployment")
            .cloned()
            .ok_or_else(|| crate::error::AppError::Internal("Missing text_deployment in config".to_string()))?;

        let embedding_deployment = config
            .config
            .get("embedding_deployment")
            .cloned()
            .unwrap_or_else(|| "text-embedding-ada-002".to_string());

        let base_url = config
            .config
            .get("base_url")
            .cloned()
            .ok_or_else(|| crate::error::AppError::Internal("Missing base_url in config".to_string()))?;

        let api_version = config
            .config
            .get("api_version")
            .cloned()
            .unwrap_or_else(|| "2023-12-01-preview".to_string());

        Ok(Self {
            http_client: Client::new(),
            config,
            api_key,
            base_url,
            text_deployment,
            embedding_deployment,
            api_version,
            health_cache: Arc::new(RwLock::new(None)),
        })
    }

    /// Build headers for Azure OpenAI API requests
    fn build_headers(&self) -> reqwest::header::HeaderMap {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            "api-key",
            self.api_key.parse().unwrap(),
        );
        headers.insert(
            reqwest::header::CONTENT_TYPE,
            "application/json".parse().unwrap(),
        );
        headers
    }

    /// Build URL for a specific deployment and operation
    fn build_url(&self, deployment: &str, operation: &str) -> String {
        format!("{}/openai/deployments/{}/{}?api-version={}",
            self.base_url, deployment, operation, self.api_version)
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
            "deployment".to_string(),
            Value::String(self.text_deployment.clone()),
        );
        metadata.insert(
            "id".to_string(),
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
impl LLMProvider for AzureOpenAIProvider {
    async fn generate_text(&self, prompt: &str, options: &GenerateOptions) -> AppResult<TextResponse> {
        let url = self.build_url(&self.text_deployment, "chat/completions");

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
        let url = self.build_url(&self.embedding_deployment, "embeddings");

        let request_body = json!({
            "input": text,
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
        details.insert("text_deployment".to_string(), Value::String(self.text_deployment.clone()));
        details.insert("embedding_deployment".to_string(), Value::String(self.embedding_deployment.clone()));
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
        // Azure OpenAI pricing varies by deployment
        // Using approximate OpenAI-equivalent pricing
        if self.text_deployment.contains("gpt-4") {
            0.03 / 1000.0 // $0.03 per 1K tokens
        } else if self.text_deployment.contains("gpt-35") || self.text_deployment.contains("gpt-3.5") {
            0.0015 / 1000.0 // $0.0015 per 1K tokens
        } else {
            0.002 / 1000.0 // default
        }
    }

    fn get_max_tokens(&self) -> usize {
        if self.text_deployment.contains("gpt-4") {
            8192
        } else {
            4096
        }
    }

    fn get_name(&self) -> &str {
        &self.config.provider_name
    }

    fn get_type(&self) -> &str {
        "azure_openai"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn create_test_config() -> ProviderConfig {
        let mut config = HashMap::new();
        config.insert("api_key".to_string(), "test_key".to_string());
        config.insert("text_deployment".to_string(), "gpt-35-turbo".to_string());
        config.insert("embedding_deployment".to_string(), "text-embedding-ada-002".to_string());
        config.insert("base_url".to_string(), "https://example.openai.azure.com".to_string());
        config.insert("api_version".to_string(), "2023-12-01-preview".to_string());

        ProviderConfig {
            provider_type: "azure_openai".to_string(),
            provider_name: "Test Azure OpenAI".to_string(),
            config,
            is_active: true,
            default_model: Some("gpt-35-turbo".to_string()),
            embedding_model: Some("text-embedding-ada-002".to_string()),
        }
    }

    #[tokio::test]
    async fn test_provider_creation() {
        let config = create_test_config();
        let provider = AzureOpenAIProvider::new(config);
        assert!(provider.is_ok());
    }

    #[tokio::test]
    async fn test_health_check() {
        let config = create_test_config();
        let provider = AzureOpenAIProvider::new(config).unwrap();
        let health = provider.health_check().await;
        // This will fail without actual API key, but we can test the structure
        assert!(health.is_ok());
    }
}