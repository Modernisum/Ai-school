use crate::error::AppResult;
use serde_json::Value;
use sqlx::Row;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Trait for usage tracking service
#[async_trait::async_trait]
pub trait UsageTracker: Send + Sync {
    /// Record usage of an AI provider
    async fn record_usage(
        &self,
        school_id: &str,
        provider_id: i32,
        operation_type: &str,
        input_tokens: Option<i32>,
        output_tokens: Option<i32>,
        total_tokens: Option<i32>,
        cost: Option<f64>,
        model_used: Option<&str>,
        metadata: Option<Value>,
    ) -> AppResult<i64>;
    
    /// Get usage statistics for a school
    async fn get_school_usage(&self, school_id: &str, start_date: Option<&str>, end_date: Option<&str>) -> AppResult<Value>;
    
    /// Get usage statistics for a provider
    async fn get_provider_usage(&self, provider_id: i32, start_date: Option<&str>, end_date: Option<&str>) -> AppResult<Value>;
    
    /// Get total cost for a school
    async fn get_school_cost(&self, school_id: &str, start_date: Option<&str>, end_date: Option<&str>) -> AppResult<f64>;
    
    /// Get monthly usage summary
    async fn get_monthly_summary(&self, school_id: Option<&str>, year: i32, month: i32) -> AppResult<Value>;
}

/// PostgreSQL-based usage tracker implementation
pub struct PostgresUsageTracker {
    /// Database client
    db_client: Arc<crate::db::DbClient>,
    /// Cache for frequently accessed usage data
    usage_cache: Arc<RwLock<std::collections::HashMap<String, (Value, u64)>>>, // key -> (data, timestamp)
}

impl PostgresUsageTracker {
    /// Create a new usage tracker
    pub fn new(db_client: Arc<crate::db::DbClient>) -> Self {
        Self {
            db_client,
            usage_cache: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }
    
    /// Clear cache
    pub async fn clear_cache(&self) {
        let mut cache = self.usage_cache.write().await;
        cache.clear();
    }
    
    /// Get cache key for school usage
    fn get_school_cache_key(school_id: &str, start_date: Option<&str>, end_date: Option<&str>) -> String {
        format!(
            "school_usage_{}_{}_{}",
            school_id,
            start_date.unwrap_or(""),
            end_date.unwrap_or("")
        )
    }
    
    /// Get cache key for provider usage
    fn get_provider_cache_key(provider_id: i32, start_date: Option<&str>, end_date: Option<&str>) -> String {
        format!(
            "provider_usage_{}_{}_{}",
            provider_id,
            start_date.unwrap_or(""),
            end_date.unwrap_or("")
        )
    }
}

#[async_trait::async_trait]
impl UsageTracker for PostgresUsageTracker {
    async fn record_usage(
        &self,
        school_id: &str,
        provider_id: i32,
        operation_type: &str,
        input_tokens: Option<i32>,
        output_tokens: Option<i32>,
        total_tokens: Option<i32>,
        cost: Option<f64>,
        model_used: Option<&str>,
        metadata: Option<Value>,
    ) -> AppResult<i64> {
        // Calculate total tokens if not provided
        let total_tokens_val = total_tokens.unwrap_or_else(|| {
            input_tokens.unwrap_or(0) + output_tokens.unwrap_or(0)
        });
        
        // Calculate cost if not provided (estimate based on tokens)
        let cost_val = cost.unwrap_or_else(|| {
            // Default cost estimation: $0.0001 per token
            total_tokens_val as f64 * 0.0001
        });
        
        let metadata_val = metadata.unwrap_or_else(|| Value::Object(serde_json::Map::new()));
        
        let result = sqlx::query(
            "INSERT INTO ai_provider_usage (
                school_id, provider_id, operation_type, 
                input_tokens, output_tokens, total_tokens, 
                cost, model_used, metadata, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING usage_id"
        )
        .bind(school_id)
        .bind(provider_id)
        .bind(operation_type)
        .bind(input_tokens)
        .bind(output_tokens)
        .bind(total_tokens_val)
        .bind(cost_val)
        .bind(model_used)
        .bind(metadata_val)
        .fetch_one(&self.db_client.pool)
        .await
        .map_err(|e| crate::error::AppError::Database(e))?;
        
        let usage_id: i64 = result.get("usage_id");
        
        // Clear relevant cache entries
        {
            let mut cache = self.usage_cache.write().await;
            // Remove school-specific cache
            let school_prefix = format!("school_usage_{}", school_id);
            cache.retain(|k, _| !k.starts_with(&school_prefix));
            
            // Remove provider-specific cache
            let provider_prefix = format!("provider_usage_{}", provider_id);
            cache.retain(|k, _| !k.starts_with(&provider_prefix));
        }
        
        tracing::info!(
            "Recorded AI usage: school={}, provider={}, operation={}, tokens={}, cost=${:.6}",
            school_id, provider_id, operation_type, total_tokens_val, cost_val
        );
        
        Ok(usage_id)
    }
    
    async fn get_school_usage(&self, school_id: &str, start_date: Option<&str>, end_date: Option<&str>) -> AppResult<Value> {
        let cache_key = Self::get_school_cache_key(school_id, start_date, end_date);
        
        // Check cache first
        {
            let cache = self.usage_cache.read().await;
            if let Some((cached_data, timestamp)) = cache.get(&cache_key) {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                
                // Use cache if less than 5 minutes old
                if now.saturating_sub(*timestamp) < 300 {
                    return Ok(cached_data.clone());
                }
            }
        }
        
        // Build query
        let mut query = "
            SELECT 
                p.provider_type,
                p.provider_name,
                COUNT(u.usage_id) as request_count,
                COALESCE(SUM(u.input_tokens), 0) as total_input_tokens,
                COALESCE(SUM(u.output_tokens), 0) as total_output_tokens,
                COALESCE(SUM(u.total_tokens), 0) as total_tokens,
                COALESCE(SUM(u.cost), 0) as total_cost,
                AVG(u.cost) as avg_cost_per_request
            FROM ai_provider_usage u
            JOIN ai_providers p ON u.provider_id = p.provider_id
            WHERE u.school_id = $1
        ".to_string();
        
        let mut params: Vec<String> = Vec::new();
        params.push(school_id.to_string());
        
        if let Some(start_date) = start_date {
            query.push_str(" AND u.timestamp >= $2");
            params.push(start_date.to_string());
        }
        
        if let Some(end_date) = end_date {
            let param_index = if start_date.is_some() { 3 } else { 2 };
            query.push_str(&format!(" AND u.timestamp <= ${}", param_index));
            params.push(end_date.to_string());
        }
        
        query.push_str(" GROUP BY p.provider_type, p.provider_name ORDER BY total_cost DESC");
        
        // Execute query
        let mut query_builder = sqlx::query(&query);
        
        for param in &params {
            query_builder = query_builder.bind(param);
        }
        
        let rows = query_builder
            .fetch_all(&self.db_client.pool)
            .await
            .map_err(|e| crate::error::AppError::Database(e))?;
        
        let mut usage_by_provider = Vec::new();
        let mut total_requests = 0;
        let mut total_tokens = 0;
        let mut total_cost = 0.0;
        
        for row in rows {
            let provider_type: String = row.get("provider_type");
            let provider_name: String = row.get("provider_name");
            let request_count: i64 = row.get("request_count");
            let total_input_tokens: i64 = row.get("total_input_tokens");
            let total_output_tokens: i64 = row.get("total_output_tokens");
            let provider_total_tokens: i64 = row.get("total_tokens");
            let provider_total_cost: f64 = row.get("total_cost");
            let avg_cost_per_request: f64 = row.get("avg_cost_per_request");
            
            total_requests += request_count;
            total_tokens += provider_total_tokens;
            total_cost += provider_total_cost;
            
            usage_by_provider.push(serde_json::json!({
                "provider_type": provider_type,
                "provider_name": provider_name,
                "request_count": request_count,
                "total_input_tokens": total_input_tokens,
                "total_output_tokens": total_output_tokens,
                "total_tokens": provider_total_tokens,
                "total_cost": provider_total_cost,
                "avg_cost_per_request": avg_cost_per_request,
                "avg_tokens_per_request": if request_count > 0 { provider_total_tokens as f64 / request_count as f64 } else { 0.0 },
            }));
        }
        
        // Get daily usage trend
        let daily_trend = self.get_daily_usage_trend(school_id, start_date, end_date).await?;
        
        let result = serde_json::json!({
            "school_id": school_id,
            "period": {
                "start_date": start_date,
                "end_date": end_date,
            },
            "summary": {
                "total_requests": total_requests,
                "total_tokens": total_tokens,
                "total_cost": total_cost,
                "avg_cost_per_request": if total_requests > 0 { total_cost / total_requests as f64 } else { 0.0 },
                "avg_tokens_per_request": if total_requests > 0 { total_tokens as f64 / total_requests as f64 } else { 0.0 },
            },
            "usage_by_provider": usage_by_provider,
            "daily_trend": daily_trend,
        });
        
        // Update cache
        {
            let mut cache = self.usage_cache.write().await;
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            cache.insert(cache_key, (result.clone(), timestamp));
        }
        
        Ok(result)
    }
    
    async fn get_provider_usage(&self, provider_id: i32, start_date: Option<&str>, end_date: Option<&str>) -> AppResult<Value> {
        let cache_key = Self::get_provider_cache_key(provider_id, start_date, end_date);
        
        // Check cache first
        {
            let cache = self.usage_cache.read().await;
            if let Some((cached_data, timestamp)) = cache.get(&cache_key) {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                
                // Use cache if less than 5 minutes old
                if now.saturating_sub(*timestamp) < 300 {
                    return Ok(cached_data.clone());
                }
            }
        }
        
        // Build query
        let mut query = "
            SELECT 
                COUNT(u.usage_id) as total_requests,
                COALESCE(SUM(u.input_tokens), 0) as total_input_tokens,
                COALESCE(SUM(u.output_tokens), 0) as total_output_tokens,
                COALESCE(SUM(u.total_tokens), 0) as total_tokens,
                COALESCE(SUM(u.cost), 0) as total_cost,
                COUNT(DISTINCT u.school_id) as school_count,
                p.provider_type,
                p.provider_name
            FROM ai_provider_usage u
            JOIN ai_providers p ON u.provider_id = p.provider_id
            WHERE u.provider_id = $1
        ".to_string();
        
        let mut params: Vec<String> = Vec::new();
        params.push(provider_id.to_string());
        
        if let Some(start_date) = start_date {
            query.push_str(" AND u.timestamp >= $2");
            params.push(start_date.to_string());
        }
        
        if let Some(end_date) = end_date {
            let param_index = if start_date.is_some() { 3 } else { 2 };
            query.push_str(&format!(" AND u.timestamp <= ${}", param_index));
            params.push(end_date.to_string());
        }
        
        query.push_str(" GROUP BY p.provider_type, p.provider_name");
        
        // Execute query
        let mut query_builder = sqlx::query(&query);
        
        for param in &params {
            query_builder = query_builder.bind(param);
        }
        
        let row = query_builder
            .fetch_optional(&self.db_client.pool)
            .await
            .map_err(|e| crate::error::AppError::Database(e))?;
        
        let result = if let Some(row) = row {
            let provider_type: String = row.get("provider_type");
            let provider_name: String = row.get("provider_name");
            let total_requests: i64 = row.get("total_requests");
            let total_input_tokens: i64 = row.get("total_input_tokens");
            let total_output_tokens: i64 = row.get("total_output_tokens");
            let total_tokens: i64 = row.get("total_tokens");
            let total_cost: f64 = row.get("total_cost");
            let school_count: i64 = row.get("school_count");
            
            serde_json::json!({
                "provider_id": provider_id,
                "provider_type": provider_type,
                "provider_name": provider_name,
                "summary": {
                    "total_requests": total_requests,
                    "total_input_tokens": total_input_tokens,
                    "total_output_tokens": total_output_tokens,
                    "total_tokens": total_tokens,
                    "total_cost": total_cost,
                    "school_count": school_count,
                    "avg_cost_per_request": if total_requests > 0 { total_cost / total_requests as f64 } else { 0.0 },
                    "avg_tokens_per_request": if total_requests > 0 { total_tokens as f64 / total_requests as f64 } else { 0.0 },
                },
                "period": {
                    "start_date": start_date,
                    "end_date": end_date,
                }
            })
        } else {
            // No usage data for this provider
            serde_json::json!({
                "provider_id": provider_id,
                "summary": {
                    "total_requests": 0,
                    "total_input_tokens": 0,
                    "total_output_tokens": 0,
                    "total_tokens": 0,
                    "total_cost": 0.0,
                    "school_count": 0,
                    "avg_cost_per_request": 0.0,
                    "avg_tokens_per_request": 0.0,
                },
                "period": {
                    "start_date": start_date,
                    "end_date": end_date,
                }
            })
        };
        
        // Update cache
        {
            let mut cache = self.usage_cache.write().await;
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            cache.insert(cache_key, (result.clone(), timestamp));
        }
        
        Ok(result)
    }
    
    async fn get_school_cost(&self, school_id: &str, start_date: Option<&str>, end_date: Option<&str>) -> AppResult<f64> {
        let mut query = "
            SELECT COALESCE(SUM(cost), 0) as total_cost
            FROM ai_provider_usage
            WHERE school_id = $1
        ".to_string();
        
        let mut params: Vec<String> = Vec::new();
        params.push(school_id.to_string());
        
        if let Some(start_date) = start_date {
            query.push_str(" AND timestamp >= $2");
            params.push(start_date.to_string());
        }
        
        if let Some(end_date) = end_date {
            let param_index = if start_date.is_some() { 3 } else { 2 };
            query.push_str(&format!(" AND timestamp <= ${}", param_index));
            params.push(end_date.to_string());
        }
        
        let mut query_builder = sqlx::query(&query);
        
        for param in &params {
            query_builder = query_builder.bind(param);
        }
        
        let row = query_builder
            .fetch_optional(&self.db_client.pool)
            .await
            .map_err(|e| crate::error::AppError::Database(e))?;
        
        let total_cost = if let Some(row) = row {
            row.get::<f64, _>("total_cost")
        } else {
            0.0
        };
        
        Ok(total_cost)
    }
    
    async fn get_monthly_summary(&self, school_id: Option<&str>, year: i32, month: i32) -> AppResult<Value> {
        let start_date = format!("{}-{:02}-01", year, month);
        let end_date = if month == 12 {
            format!("{}-12-31", year)
        } else {
            format!("{}-{:02}-01", year, month + 1)
        };
        
        let mut query = "
            SELECT
                DATE(timestamp) as usage_date,
                COUNT(usage_id) as daily_requests,
                COALESCE(SUM(total_tokens), 0) as daily_tokens,
                COALESCE(SUM(cost), 0) as daily_cost
            FROM ai_provider_usage
            WHERE timestamp >= $1::date AND timestamp < $2::date
        ".to_string();
        
        let mut params: Vec<String> = Vec::new();
        params.push(start_date.clone());
        params.push(end_date.clone());
        
        if let Some(school_id) = school_id {
            query.push_str(" AND school_id = $3");
            params.push(school_id.to_string());
        }
        
        query.push_str(" GROUP BY DATE(timestamp) ORDER BY usage_date");
        
        let mut query_builder = sqlx::query(&query);
        
        for (i, param) in params.iter().enumerate() {
            query_builder = query_builder.bind(param);
        }
        
        let rows = query_builder
            .fetch_all(&self.db_client.pool)
            .await
            .map_err(|e| crate::error::AppError::Database(e))?;
        
        let mut daily_data = Vec::new();
        let mut total_requests = 0;
        let mut total_tokens = 0;
        let mut total_cost = 0.0;
        
        for row in rows {
            let usage_date: chrono::NaiveDate = row.get("usage_date");
            let daily_requests: i64 = row.get("daily_requests");
            let daily_tokens: i64 = row.get("daily_tokens");
            let daily_cost: f64 = row.get("daily_cost");
            
            total_requests += daily_requests;
            total_tokens += daily_tokens;
            total_cost += daily_cost;
            
            daily_data.push(serde_json::json!({
                "date": usage_date.to_string(),
                "requests": daily_requests,
                "tokens": daily_tokens,
                "cost": daily_cost,
            }));
        }
        
        Ok(serde_json::json!({
            "year": year,
            "month": month,
            "school_id": school_id,
            "period": {
                "start_date": start_date,
                "end_date": end_date,
            },
            "summary": {
                "total_requests": total_requests,
                "total_tokens": total_tokens,
                "total_cost": total_cost,
                "avg_daily_requests": if !daily_data.is_empty() { total_requests as f64 / daily_data.len() as f64 } else { 0.0 },
                "avg_daily_tokens": if !daily_data.is_empty() { total_tokens as f64 / daily_data.len() as f64 } else { 0.0 },
                "avg_daily_cost": if !daily_data.is_empty() { total_cost / daily_data.len() as f64 } else { 0.0 },
            },
            "daily_data": daily_data,
        }))
    }
}

impl PostgresUsageTracker {
    /// Get daily usage trend for a school
    async fn get_daily_usage_trend(
        &self,
        school_id: &str,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value> {
        let mut query = "
            SELECT
                DATE(timestamp) as usage_date,
                COUNT(usage_id) as daily_requests,
                COALESCE(SUM(total_tokens), 0) as daily_tokens,
                COALESCE(SUM(cost), 0) as daily_cost
            FROM ai_provider_usage
            WHERE school_id = $1
        ".to_string();
        
        let mut params: Vec<String> = Vec::new();
        params.push(school_id.to_string());
        
        if let Some(start_date) = start_date {
            query.push_str(" AND timestamp >= $2");
            params.push(start_date.to_string());
        }
        
        if let Some(end_date) = end_date {
            let param_index = if start_date.is_some() { 3 } else { 2 };
            query.push_str(&format!(" AND timestamp <= ${}", param_index));
            params.push(end_date.to_string());
        }
        
        query.push_str(" GROUP BY DATE(timestamp) ORDER BY usage_date");
        
        let mut query_builder = sqlx::query(&query);
        
        for param in &params {
            query_builder = query_builder.bind(param);
        }
        
        let rows = query_builder
            .fetch_all(&self.db_client.pool)
            .await
            .map_err(|e| crate::error::AppError::Database(e))?;
        
        let mut trend_data = Vec::new();
        
        for row in rows {
            let usage_date: chrono::NaiveDate = row.get("usage_date");
            let daily_requests: i64 = row.get("daily_requests");
            let daily_tokens: i64 = row.get("daily_tokens");
            let daily_cost: f64 = row.get("daily_cost");
            
            trend_data.push(serde_json::json!({
                "date": usage_date.to_string(),
                "requests": daily_requests,
                "tokens": daily_tokens,
                "cost": daily_cost,
            }));
        }
        
        Ok(serde_json::json!(trend_data))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::DbClient;
    use std::sync::Arc;
    
    #[tokio::test]
    async fn test_usage_tracker_creation() {
        let db_client = Arc::new(DbClient::new_test().unwrap());
        let tracker = PostgresUsageTracker::new(db_client);
        
        // Test that tracker can be created
        assert!(true);
    }
    
    #[test]
    fn test_cache_key_generation() {
        assert_eq!(
            PostgresUsageTracker::get_school_cache_key("school1", None, None),
            "school_usage_school1__"
        );
        
        assert_eq!(
            PostgresUsageTracker::get_school_cache_key("school2", Some("2024-01-01"), Some("2024-12-31")),
            "school_usage_school2_2024-01-01_2024-12-31"
        );
        
        assert_eq!(
            PostgresUsageTracker::get_provider_cache_key(1, None, None),
            "provider_usage_1__"
        );
    }
    
    #[test]
    fn test_usage_tracker_trait_implementation() {
        // Verify that PostgresUsageTracker implements UsageTracker
        fn assert_impl_usage_tracker<T: UsageTracker>() {}
        assert_impl_usage_tracker::<PostgresUsageTracker>();
    }
}