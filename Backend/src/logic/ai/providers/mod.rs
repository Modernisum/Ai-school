use crate::error::AppResult;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use async_trait::async_trait;

/// Options for text generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateOptions {
    /// Maximum tokens to generate
    pub max_tokens: Option<usize>,
    /// Temperature (0.0 to 2.0)
    pub temperature: Option<f32>,
    /// Top-p sampling (0.0 to 1.0)
    pub top_p: Option<f32>,
    /// Stop sequences
    pub stop_sequences: Option<Vec<String>>,
    /// Additional provider-specific parameters
    pub extra_params: Option<HashMap<String, serde_json::Value>>,
}

/// Response from text generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextResponse {
    /// Generated text
    pub text: String,
    /// Tokens used (input + output)
    pub total_tokens: usize,
    /// Finish reason
    pub finish_reason: Option<String>,
    /// Additional metadata
    pub metadata: HashMap<String, serde_json::Value>,
}

/// Health status of a provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    /// Whether the provider is healthy
    pub healthy: bool,
    /// Latency in milliseconds
    pub latency_ms: Option<u64>,
    /// Error message if unhealthy
    pub error: Option<String>,
    /// Additional provider-specific health info
    pub details: HashMap<String, serde_json::Value>,
}

/// Trait that all LLM providers must implement
#[async_trait]
pub trait LLMProvider: Send + Sync {
    /// Generate text from a prompt
    async fn generate_text(&self, prompt: &str, options: &GenerateOptions) -> AppResult<TextResponse>;
    
    /// Generate embedding for text
    async fn generate_embedding(&self, text: &str) -> AppResult<Vec<f32>>;
    
    /// Check provider health
    async fn health_check(&self) -> AppResult<HealthStatus>;
    
    /// Get cost per token (in USD)
    fn get_cost_per_token(&self) -> f64;
    
    /// Get maximum tokens supported
    fn get_max_tokens(&self) -> usize;
    
    /// Get provider name
    fn get_name(&self) -> &str;
    
    /// Get provider type (e.g., "google_gemini", "openai")
    fn get_type(&self) -> &str;
}

/// Configuration for a provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    /// Provider type
    pub provider_type: String,
    /// Provider name
    pub provider_name: String,
    /// Configuration data (API keys, endpoints, etc.)
    pub config: HashMap<String, String>,
    /// Whether this provider is active
    pub is_active: bool,
    /// Default model to use
    pub default_model: Option<String>,
    /// Default embedding model
    pub embedding_model: Option<String>,
}

/// Common errors for providers
#[derive(Debug, thiserror::Error)]
pub enum ProviderError {
    #[error("Provider configuration error: {0}")]
    Config(String),
    
    #[error("Provider API error: {0}")]
    Api(String),
    
    #[error("Provider rate limited: {0}")]
    RateLimited(String),
    
    #[error("Provider authentication failed: {0}")]
    Auth(String),
    
    #[error("Provider not found: {0}")]
    NotFound(String),
}

impl From<ProviderError> for crate::error::AppError {
    fn from(err: ProviderError) -> Self {
        crate::error::AppError::Internal(err.to_string())
    }
}

// Re-export provider implementations
pub mod google_gemini;
pub mod openai;
pub mod anthropic;
pub mod azure_openai;
pub mod local_model;
pub mod registry;
pub mod router;
pub mod usage_tracker;

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    
    fn create_test_config(provider_type: &str) -> ProviderConfig {
        ProviderConfig {
            provider_type: provider_type.to_string(),
            provider_name: format!("Test {}", provider_type),
            config: {
                let mut map = HashMap::new();
                map.insert("api_key".to_string(), "test_key".to_string());
                map.insert("model".to_string(), "test-model".to_string());
                map
            },
            is_active: true,
            default_model: Some("test-model".to_string()),
            embedding_model: Some("test-embedding".to_string()),
        }
    }
    
    #[test]
    fn test_provider_config_creation() {
        let config = create_test_config("test");
        assert_eq!(config.provider_type, "test");
        assert_eq!(config.provider_name, "Test test");
        assert!(config.is_active);
        assert_eq!(config.default_model, Some("test-model".to_string()));
    }
    
    #[test]
    fn test_provider_error_conversion() {
        let error = ProviderError::Configuration("test error".to_string());
        let app_error: crate::error::AppError = error.into();
        
        match app_error {
            crate::error::AppError::Internal(msg) => {
                assert!(msg.contains("test error"));
            }
            _ => panic!("Expected Internal error"),
        }
    }
    
    #[test]
    fn test_generate_options_default() {
        let options = GenerateOptions::default();
        assert_eq!(options.max_tokens, 1000);
        assert_eq!(options.temperature, 0.7);
        assert_eq!(options.top_p, 1.0);
        assert!(!options.stream);
    }
    
    #[test]
    fn test_text_response_creation() {
        let response = TextResponse {
            text: "Test response".to_string(),
            tokens_used: 10,
            finish_reason: "stop".to_string(),
            model_used: "test-model".to_string(),
        };
        
        assert_eq!(response.text, "Test response");
        assert_eq!(response.tokens_used, 10);
        assert_eq!(response.finish_reason, "stop");
    }
    
    #[test]
    fn test_health_status_creation() {
        let health = HealthStatus {
            healthy: true,
            latency_ms: 100,
            error: None,
            details: Some("All good".to_string()),
        };
        
        assert!(health.healthy);
        assert_eq!(health.latency_ms, 100);
        assert!(health.error.is_none());
        assert_eq!(health.details, Some("All good".to_string()));
    }
}