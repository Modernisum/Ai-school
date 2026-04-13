use crate::error::AppResult;
use crate::logic::ai::providers::{LLMProvider, GenerateOptions, TextResponse};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Strategy for routing model requests
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RoutingStrategy {
    /// Route based on lowest cost
    CostOptimized,
    /// Route based on best performance (lowest latency)
    PerformanceOptimized,
    /// Route based on reliability (highest health score)
    ReliabilityOptimized,
    /// Use school-specific configuration
    SchoolConfigured,
    /// Load balance across available providers
    LoadBalanced,
}

/// Metrics for provider performance
#[derive(Debug, Clone)]
pub struct ProviderMetrics {
    /// Average latency in milliseconds
    pub avg_latency_ms: f64,
    /// Success rate (0.0 to 1.0)
    pub success_rate: f64,
    /// Cost per token in USD
    pub cost_per_token: f64,
    /// Last health check timestamp
    pub last_health_check: u64,
    /// Total tokens processed
    pub total_tokens_processed: u64,
}

/// Model router for intelligent provider selection
pub struct ModelRouter {
    /// Provider registry
    registry: Arc<crate::logic::ai::providers::registry::ProviderRegistry>,
    /// Performance metrics for each provider
    metrics: Arc<RwLock<std::collections::HashMap<String, ProviderMetrics>>>,
    /// Routing strategy
    strategy: RoutingStrategy,
    /// Load balancing weights
    load_weights: Arc<RwLock<std::collections::HashMap<String, f64>>>,
}

impl ModelRouter {
    /// Create a new model router
    pub fn new(registry: Arc<crate::logic::ai::providers::registry::ProviderRegistry>) -> Self {
        Self {
            registry,
            metrics: Arc::new(RwLock::new(std::collections::HashMap::new())),
            strategy: RoutingStrategy::CostOptimized,
            load_weights: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }

    /// Set routing strategy
    pub fn set_strategy(&mut self, strategy: RoutingStrategy) {
        self.strategy = strategy;
    }

    /// Get current routing strategy
    pub fn get_strategy(&self) -> RoutingStrategy {
        self.strategy
    }

    /// Update provider metrics
    pub async fn update_metrics(&self, provider_type: &str, latency_ms: u64, success: bool) {
        let mut metrics = self.metrics.write().await;
        let entry = metrics.entry(provider_type.to_string()).or_insert(ProviderMetrics {
            avg_latency_ms: latency_ms as f64,
            success_rate: if success { 1.0 } else { 0.0 },
            cost_per_token: 0.0,
            last_health_check: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            total_tokens_processed: 0,
        });

        // Update moving average for latency (EMA with alpha=0.3)
        entry.avg_latency_ms = 0.7 * entry.avg_latency_ms + 0.3 * (latency_ms as f64);
        
        // Update success rate (EMA with alpha=0.2)
        let success_value = if success { 1.0 } else { 0.0 };
        entry.success_rate = 0.8 * entry.success_rate + 0.2 * success_value;
        
        entry.last_health_check = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
    }

    /// Update token usage
    pub async fn update_token_usage(&self, provider_type: &str, tokens: u64) {
        let mut metrics = self.metrics.write().await;
        if let Some(entry) = metrics.get_mut(provider_type) {
            entry.total_tokens_processed += tokens;
        }
    }

    /// Select provider based on routing strategy
    pub async fn select_provider(
        &self,
        school_id: Option<&str>,
        operation_type: &str,
    ) -> AppResult<Option<Arc<dyn LLMProvider>>> {
        match self.strategy {
            RoutingStrategy::SchoolConfigured => {
                if let Some(school_id) = school_id {
                    self.registry.get_school_provider(school_id).await
                } else {
                    // Fall back to cost-optimized if no school ID
                    self.select_provider_by_cost().await
                }
            }
            RoutingStrategy::CostOptimized => self.select_provider_by_cost().await,
            RoutingStrategy::PerformanceOptimized => self.select_provider_by_performance().await,
            RoutingStrategy::ReliabilityOptimized => self.select_provider_by_reliability().await,
            RoutingStrategy::LoadBalanced => self.select_provider_by_load_balance().await,
        }
    }

    /// Select provider based on lowest cost
    async fn select_provider_by_cost(&self) -> AppResult<Option<Arc<dyn LLMProvider>>> {
        let provider_types = self.registry.get_provider_types().await;
        let mut best_provider: Option<(Arc<dyn LLMProvider>, f64)> = None;

        for provider_type in provider_types {
            if let Some(provider) = self.registry.get_provider(&provider_type).await {
                let cost = provider.get_cost_per_token();
                
                // Check health
                let healthy = self.registry.get_provider_health(&provider_type).await.unwrap_or(false);
                if !healthy {
                    continue;
                }

                match best_provider {
                    Some((_, best_cost)) if cost < best_cost => {
                        best_provider = Some((provider, cost));
                    }
                    None => {
                        best_provider = Some((provider, cost));
                    }
                    _ => {}
                }
            }
        }

        Ok(best_provider.map(|(provider, _)| provider))
    }

    /// Select provider based on performance (lowest latency)
    async fn select_provider_by_performance(&self) -> AppResult<Option<Arc<dyn LLMProvider>>> {
        let metrics = self.metrics.read().await;
        let provider_types = self.registry.get_provider_types().await;
        let mut best_provider: Option<(Arc<dyn LLMProvider>, f64)> = None;

        for provider_type in provider_types {
            if let Some(provider) = self.registry.get_provider(&provider_type).await {
                // Check health
                let healthy = self.registry.get_provider_health(&provider_type).await.unwrap_or(false);
                if !healthy {
                    continue;
                }

                let latency = metrics
                    .get(&provider_type)
                    .map(|m| m.avg_latency_ms)
                    .unwrap_or(1000.0); // Default high latency if no metrics

                match best_provider {
                    Some((_, best_latency)) if latency < best_latency => {
                        best_provider = Some((provider, latency));
                    }
                    None => {
                        best_provider = Some((provider, latency));
                    }
                    _ => {}
                }
            }
        }

        Ok(best_provider.map(|(provider, _)| provider))
    }

    /// Select provider based on reliability (highest success rate)
    async fn select_provider_by_reliability(&self) -> AppResult<Option<Arc<dyn LLMProvider>>> {
        let metrics = self.metrics.read().await;
        let provider_types = self.registry.get_provider_types().await;
        let mut best_provider: Option<(Arc<dyn LLMProvider>, f64)> = None;

        for provider_type in provider_types {
            if let Some(provider) = self.registry.get_provider(&provider_type).await {
                // Check health
                let healthy = self.registry.get_provider_health(&provider_type).await.unwrap_or(false);
                if !healthy {
                    continue;
                }

                let success_rate = metrics
                    .get(&provider_type)
                    .map(|m| m.success_rate)
                    .unwrap_or(0.5); // Default medium success rate if no metrics

                match best_provider {
                    Some((_, best_rate)) if success_rate > best_rate => {
                        best_provider = Some((provider, success_rate));
                    }
                    None => {
                        best_provider = Some((provider, success_rate));
                    }
                    _ => {}
                }
            }
        }

        Ok(best_provider.map(|(provider, _)| provider))
    }

    /// Select provider using load balancing
    async fn select_provider_by_load_balance(&self) -> AppResult<Option<Arc<dyn LLMProvider>>> {
        let provider_types = self.registry.get_provider_types().await;
        let mut healthy_providers = Vec::new();

        // Collect healthy providers
        for provider_type in provider_types {
            if let Some(provider) = self.registry.get_provider(&provider_type).await {
                let healthy = self.registry.get_provider_health(&provider_type).await.unwrap_or(false);
                if healthy {
                    healthy_providers.push(provider);
                }
            }
        }

        if healthy_providers.is_empty() {
            return Ok(None);
        }

        // Simple round-robin (could be enhanced with weighted load balancing)
        use std::sync::atomic::{AtomicUsize, Ordering};
        static COUNTER: AtomicUsize = AtomicUsize::new(0);
        
        let index = COUNTER.fetch_add(1, Ordering::Relaxed) % healthy_providers.len();
        Ok(Some(healthy_providers[index].clone()))
    }

    /// Generate text using the router
    pub async fn generate_text(
        &self,
        school_id: Option<&str>,
        prompt: &str,
        options: &GenerateOptions,
        operation_type: &str,
    ) -> AppResult<TextResponse> {
        let start_time = std::time::Instant::now();
        
        // Select provider
        let provider = self.select_provider(school_id, operation_type).await?;
        
        let provider = provider.ok_or_else(|| {
            crate::error::AppError::NotFound("No healthy AI provider available".to_string())
        })?;
        
        let provider_type = provider.get_type().to_string();
        
        // Generate text
        let result = provider.generate_text(prompt, options).await;
        
        // Update metrics
        let latency_ms = start_time.elapsed().as_millis() as u64;
        let success = result.is_ok();
        
        self.update_metrics(&provider_type, latency_ms, success).await;
        
        // Update token usage if successful
        if let Ok(ref response) = result {
            self.update_token_usage(&provider_type, response.total_tokens as u64).await;
        }
        
        result
    }

    /// Get router statistics
    pub async fn get_stats(&self) -> AppResult<Value> {
        let metrics = self.metrics.read().await;
        let mut provider_stats = Vec::new();
        
        for (provider_type, metric) in metrics.iter() {
            let stat = serde_json::json!({
                "provider_type": provider_type,
                "avg_latency_ms": metric.avg_latency_ms,
                "success_rate": metric.success_rate,
                "total_tokens_processed": metric.total_tokens_processed,
                "last_health_check": metric.last_health_check,
            });
            
            provider_stats.push(stat);
        }
        
        Ok(serde_json::json!({
            "strategy": format!("{:?}", self.strategy),
            "total_providers_tracked": metrics.len(),
            "providers": provider_stats,
        }))
    }

    /// Get recommended provider for a school
    pub async fn get_recommendation(&self, school_id: &str) -> AppResult<Value> {
        // Get current provider
        let current = self.registry.get_school_provider(school_id).await?;
        
        // Get cost-optimized recommendation
        let cost_optimized = self.select_provider_by_cost().await?;
        
        // Get performance-optimized recommendation
        let performance_optimized = self.select_provider_by_performance().await?;
        
        let current_info = if let Some(provider) = current {
            Some(serde_json::json!({
                "provider_type": provider.get_type(),
                "provider_name": provider.get_name(),
                "cost_per_token": provider.get_cost_per_token(),
                "max_tokens": provider.get_max_tokens(),
            }))
        } else {
            None
        };
        
        let cost_info = if let Some(provider) = cost_optimized {
            Some(serde_json::json!({
                "provider_type": provider.get_type(),
                "provider_name": provider.get_name(),
                "cost_per_token": provider.get_cost_per_token(),
                "max_tokens": provider.get_max_tokens(),
            }))
        } else {
            None
        };
        
        let performance_info = if let Some(provider) = performance_optimized {
            Some(serde_json::json!({
                "provider_type": provider.get_type(),
                "provider_name": provider.get_name(),
                "cost_per_token": provider.get_cost_per_token(),
                "max_tokens": provider.get_max_tokens(),
            }))
        } else {
            None
        };
        
        Ok(serde_json::json!({
            "current": current_info,
            "cost_optimized": cost_info,
            "performance_optimized": performance_info,
            "recommendation": {
                "for_budget": cost_info.as_ref().map(|c| c["provider_type"].as_str().unwrap_or("")),
                "for_performance": performance_info.as_ref().map(|p| p["provider_type"].as_str().unwrap_or("")),
            }
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::logic::ai::providers::ProviderConfig;
    use std::collections::HashMap;
    use std::sync::Arc;
    
    fn create_test_provider_config() -> ProviderConfig {
        ProviderConfig {
            provider_type: "test".to_string(),
            provider_name: "Test Provider".to_string(),
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
    fn test_routing_strategy_enum() {
        assert_eq!(RoutingStrategy::CostOptimized as u8, 0);
        assert_eq!(RoutingStrategy::PerformanceOptimized as u8, 1);
        assert_eq!(RoutingStrategy::ReliabilityOptimized as u8, 2);
        assert_eq!(RoutingStrategy::SchoolConfigured as u8, 3);
        assert_eq!(RoutingStrategy::LoadBalanced as u8, 4);
    }
    
    #[test]
    fn test_provider_metrics_creation() {
        let metrics = ProviderMetrics {
            avg_latency_ms: 100.0,
            success_rate: 0.95,
            cost_per_token: 0.0001,
            last_health_check: 1234567890,
            total_tokens_processed: 1000,
        };
        
        assert_eq!(metrics.avg_latency_ms, 100.0);
        assert_eq!(metrics.success_rate, 0.95);
        assert_eq!(metrics.cost_per_token, 0.0001);
        assert_eq!(metrics.total_tokens_processed, 1000);
    }
    
    #[tokio::test]
    async fn test_model_router_creation() {
        // This test verifies the router can be created
        // Note: Actual functionality tests would require a mock registry
        use crate::db::DbClient;
        
        let db_client = Arc::new(DbClient::new_test().unwrap());
        let registry = Arc::new(crate::logic::ai::providers::registry::ProviderRegistry::new(db_client));
        let router = ModelRouter::new(registry);
        
        assert_eq!(router.get_strategy(), RoutingStrategy::CostOptimized);
    }
    
    #[test]
    fn test_routing_strategy_set_get() {
        use crate::db::DbClient;
        
        let db_client = Arc::new(DbClient::new_test().unwrap());
        let registry = Arc::new(crate::logic::ai::providers::registry::ProviderRegistry::new(db_client));
        let mut router = ModelRouter::new(registry);
        
        router.set_strategy(RoutingStrategy::PerformanceOptimized);
        assert_eq!(router.get_strategy(), RoutingStrategy::PerformanceOptimized);
        
        router.set_strategy(RoutingStrategy::ReliabilityOptimized);
        assert_eq!(router.get_strategy(), RoutingStrategy::ReliabilityOptimized);
    }
}