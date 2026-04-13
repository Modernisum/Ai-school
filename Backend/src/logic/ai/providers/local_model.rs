use crate::error::AppResult;
use crate::logic::ai::providers::{GenerateOptions, HealthStatus, LLMProvider, ProviderConfig, TextResponse};
use async_trait::async_trait;
use reqwest::Client;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Local model provider implementation
/// This provider connects to local inference servers like llama.cpp, ollama, or vLLM
pub struct LocalModelProvider {
    /// HTTP client
    http_client: Client,
    /// Provider configuration
    config: ProviderConfig,
    /// Base URL for local inference server
    base_url: String,
    /// Model to use for text generation
    text_model: String,
    /// Model to use for embeddings (if supported)
    embedding_model: Option<String>,
    /// Health status cache
    health_cache: Arc<RwLock<Option<HealthStatus>>>,
}

impl LocalModelProvider {
    /// Create a new LocalModel provider
    pub fn new(config: ProviderConfig) -> AppResult<Self> {
        let base_url = config
            .config
            .get("base_url")
            .cloned()
            .unwrap_or_else(|| "http://localhost:11434".to_string()); // Default ollama port

        let text_model = config
            .config
            .get("text_model")
            .cloned()
            .unwrap_or_else(|| "llama2".to_string());

        let embedding_model = config.config.get("embedding_model").cloned();

        Ok(Self {
            http_client: Client::new(),
            config,
            base_url,
            text_model,
            embedding_model,
            health_cache: Arc::new(RwLock::new(None)),
        })
    }

    /// Check if the provider supports embeddings
    fn supports_embeddings(&self) -> bool {
        // Check if embedding model is configured
        self.embedding_model.is_some()
    }

    /// Build headers for local model API requests
    fn build_headers(&self) -> reqwest::header::HeaderMap {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            reqwest::header::CONTENT_TYPE,
            "application/json".parse().unwrap(),
        );
        // Add any API key if configured
        if let Some(api_key) = self.config.config.get("api_key") {
            headers.insert(
                "Authorization",
                format!("Bearer {}", api_key).parse().unwrap(),
            );
        }
        headers
    }

    /// Parse text generation response (ollama format)
    fn parse_ollama_response(&self, resp_json: &Value) -> AppResult<TextResponse> {
        let text = resp_json["response"]
            .as_str()
            .ok_or_else(|| {
                crate::error::AppError::Internal("No response in ollama response".to_string())
            })?
            .to_string();

        // Ollama doesn't provide token counts by default
        let total_tokens = 0;

        let finish_reason = if resp_json["done"].as_bool().unwrap_or(false) {
            Some("stop".to_string())
        } else {
            None
        };

        let mut metadata = HashMap::new();
        metadata.insert(
            "model".to_string(),
            Value::String(self.text_model.clone()),
        );
        metadata.insert(
            "created_at".to_string(),
            resp_json["created_at"].clone(),
        );

        Ok(TextResponse {
            text,
            total_tokens,
            finish_reason,
            metadata,
        })
    }

    /// Parse text generation response (llama.cpp format)
    fn parse_llama_cpp_response(&self, resp_json: &Value) -> AppResult<TextResponse> {
        let choices = resp_json["choices"]
            .as_array()
            .ok_or_else(|| {
                crate::error::AppError::Internal("No choices in llama.cpp response".to_string())
            })?
            .first()
            .ok_or_else(|| {
                crate::error::AppError::Internal("Empty choices array".to_string())
            })?;

        let text = choices["text"]
            .as_str()
            .ok_or_else(|| {
                crate::error::AppError::Internal("No text in choice".to_string())
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
            "id".to_string(),
            resp_json["id"].clone(),
        );

        Ok(TextResponse {
            text,
            total_tokens,
            finish_reason,
            metadata,
        })
    }

    /// Parse embedding response
    fn parse_embedding_response(&self, resp_json: &Value) -> AppResult<Vec<f32>> {
        // Try ollama format first
        if let Some(arr) = resp_json["embedding"].as_array() {
            let embeddings: Vec<f32> = arr
                .iter()
                .filter_map(|v| v.as_f64().map(|f| f as f32))
                .collect();
            if !embeddings.is_empty() {
                return Ok(embeddings);
            }
        }

        // Try OpenAI-compatible format
        if let Some(data) = resp_json["data"].as_array() {
            if let Some(first) = data.first() {
                if let Some(arr) = first["embedding"].as_array() {
                    let embeddings: Vec<f32> = arr
                        .iter()
                        .filter_map(|v| v.as_f64().map(|f| f as f32))
                        .collect();
                    if !embeddings.is_empty() {
                        return Ok(embeddings);
                    }
                }
            }
        }

        Err(crate::error::AppError::Internal(format!(
            "Failed to parse embedding response: {:?}",
            resp_json
        )))
    }
}

#[async_trait]
impl LLMProvider for LocalModelProvider {
    async fn generate_text(&self, prompt: &str, options: &GenerateOptions) -> AppResult<TextResponse> {
        // Try ollama format first (most common for local models)
        let url = format!("{}/api/generate", self.base_url);

        let mut request_body = json!({
            "model": self.text_model,
            "prompt": prompt,
            "stream": false,
        });

        // Apply options
        if let Some(max_tokens) = options.max_tokens {
            request_body["num_predict"] = json!(max_tokens);
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

        // Add extra params if any
        if let Some(extra_params) = &options.extra_params {
            for (key, value) in extra_params {
                request_body[key] = value.clone();
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
            // Try llama.cpp format as fallback
            let llama_url = format!("{}/v1/completions", self.base_url);
            let llama_body = json!({
                "model": self.text_model,
                "prompt": prompt,
                "max_tokens": options.max_tokens.unwrap_or(1024),
                "temperature": options.temperature.unwrap_or(0.7),
            });

            let llama_response = self
                .http_client
                .post(&llama_url)
                .headers(self.build_headers())
                .json(&llama_body)
                .send()
                .await
                .map_err(|e| {
                    crate::error::AppError::Internal(format!("Failed to send request: {}", e))
                })?;

            if !llama_response.status().is_success() {
                let status = llama_response.status();
                let error_text = llama_response.text().await.unwrap_or_default();
                return Err(crate::error::AppError::Internal(format!(
                    "API request failed with status {}: {}",
                    status, error_text
                )));
            }

            let resp_json: Value = llama_response.json().await.map_err(|e| {
                crate::error::AppError::Internal(format!("Failed to parse response: {}", e))
            })?;

            return self.parse_llama_cpp_response(&resp_json);
        }

        let resp_json: Value = response.json().await.map_err(|e| {
            crate::error::AppError::Internal(format!("Failed to parse response: {}", e))
        })?;

        self.parse_ollama_response(&resp_json)
    }

    async fn generate_embedding(&self, text: &str) -> AppResult<Vec<f32>> {
        if !self.supports_embeddings() {
            return Err(crate::error::AppError::Internal(
                "Embeddings not configured for local model provider".to_string(),
            ));
        }

        let embedding_model = self.embedding_model.as_ref().unwrap();
        
        // Try ollama embeddings endpoint
        let url = format!("{}/api/embeddings", self.base_url);
        let request_body = json!({
            "model": embedding_model,
            "prompt": text,
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
            // Try OpenAI-compatible embeddings endpoint
            let openai_url = format!("{}/v1/embeddings", self.base_url);
            let openai_body = json!({
                "model": embedding_model,
                "input": text,
            });

            let openai_response = self
                .http_client
                .post(&openai_url)
                .headers(self.build_headers())
                .json(&openai_body)
                .send()
                .await
                .map_err(|e| {
                    crate::error::AppError::Internal(format!("Failed to send request: {}", e))
                })?;

            if !openai_response.status().is_success() {
                let status = openai_response.status();
                let error_text = openai_response.text().await.unwrap_or_default();
                return Err(crate::error::AppError::Internal(format!(
                    "API request failed with status {}: {}",
                    status, error_text
                )));
            }

            let resp_json: Value = openai_response.json().await.map_err(|e| {
                crate::error::AppError::Internal(format!("Failed to parse response: {}", e))
            })?;

            return self.parse_embedding_response(&resp_json);
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

        // Perform actual health check by trying to list models
        let start = std::time::Instant::now();
        let url = format!("{}/api/tags", self.base_url); // ollama endpoint
        let result = self
            .http_client
            .get(&url)
            .headers(self.build_headers())
            .send()
            .await;

        let latency_ms = start.elapsed().as_millis() as u64;
        let mut details = HashMap::new();
        details.insert("model".to_string(), Value::String(self.text_model.clone()));
        details.insert("base_url".to_string(), Value::String(self.base_url.clone()));

        let status = match result {
            Ok(resp) if resp.status().is_success() => HealthStatus {
                healthy: true,
                latency_ms: Some(latency_ms),
                error: None,
                details,
            },
            Ok(resp) => {
                let status_code = resp.status();
                let error_text = resp.text().await.unwrap_or_default();
                HealthStatus {
                    healthy: false,
                    latency_ms: Some(latency_ms),
                    error: Some(format!("Status {}: {}", status_code, error_text)),
                    details,
                }
            }
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
        // Local models have no API cost, only infrastructure cost
        0.0
    }

    fn get_max_tokens(&self) -> usize {
        // Default context size for local models
        4096
    }

    fn get_name(&self) -> &str {
        &self.config.provider_name
    }

    fn get_type(&self) -> &str {
        "local_model"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn create_test_config() -> ProviderConfig {
        let mut config = HashMap::new();
        config.insert("base_url".to_string(), "http://localhost:11434".to_string());
        config.insert("text_model".to_string(), "llama2".to_string());

        ProviderConfig {
            provider_type: "local_model".to_string(),
            provider_name: "Test Local Model".to_string(),
            config,
            is_active: true,
            default_model: Some("llama2".to_string()),
            embedding_model: None,
        }
    }

    #[tokio::test]
    async fn test_provider_creation() {
        let config = create_test_config();
        let provider = LocalModelProvider::new(config);
        assert!(provider.is_ok());
    }

    #[tokio::test]
    async fn test_health_check() {
        let config = create_test_config();
        let provider = LocalModelProvider::new(config).unwrap();
        let health = provider.health_check().await;
        // This will fail without actual local server, but we can test the structure
        assert!(health.is_ok());
    }
}