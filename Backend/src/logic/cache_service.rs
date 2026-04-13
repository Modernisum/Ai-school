//! Caching service for frequently accessed responsibility data
//! This module provides Redis-based caching for responsibility queries to reduce database load

use crate::db::DbClient;
use deadpool_redis::{redis::AsyncCommands, Pool};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use std::time::Duration;

/// Cache service for responsibility data
pub struct ResponsibilityCacheService {
    redis_pool: Pool,
}

impl ResponsibilityCacheService {
    /// Create a new cache service
    pub fn new(redis_pool: Pool) -> Self {
        Self { redis_pool }
    }

    /// Get responsibilities for a school with caching
    pub async fn get_responsibilities(
        &self,
        school_id: &str,
        employee_type: Option<&str>,
    ) -> Result<Option<Vec<Value>>, Box<dyn std::error::Error + Send + Sync>> {
        let cache_key = self.responsibilities_cache_key(school_id, employee_type);
        
        // Try to get from cache
        if let Ok(mut conn) = self.redis_pool.get().await {
            let cached: Option<String> = conn.get(&cache_key).await.ok().flatten();
            if let Some(cached_json) = cached {
                let parsed: Vec<Value> = serde_json::from_str(&cached_json)?;
                return Ok(Some(parsed));
            }
        }
        
        Ok(None)
    }

    /// Cache responsibilities for a school
    pub async fn cache_responsibilities(
        &self,
        school_id: &str,
        employee_type: Option<&str>,
        responsibilities: &[Value],
        ttl_seconds: u64,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let cache_key = self.responsibilities_cache_key(school_id, employee_type);
        let json_str = serde_json::to_string(responsibilities)?;
        
        if let Ok(mut conn) = self.redis_pool.get().await {
            let _: () = conn.set_ex(&cache_key, json_str, ttl_seconds).await?;
        }
        
        Ok(())
    }

    /// Invalidate responsibilities cache for a school
    pub async fn invalidate_responsibilities(
        &self,
        school_id: &str,
        employee_type: Option<&str>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let cache_key = self.responsibilities_cache_key(school_id, employee_type);
        
        if let Ok(mut conn) = self.redis_pool.get().await {
            let _: () = conn.del(&cache_key).await?;
        }
        
        Ok(())
    }

    /// Get responsibility by ID with caching
    pub async fn get_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> Result<Option<Value>, Box<dyn std::error::Error + Send + Sync>> {
        let cache_key = self.responsibility_cache_key(school_id, responsibility_id);
        
        if let Ok(mut conn) = self.redis_pool.get().await {
            let cached: Option<String> = conn.get(&cache_key).await.ok().flatten();
            if let Some(cached_json) = cached {
                let parsed: Value = serde_json::from_str(&cached_json)?;
                return Ok(Some(parsed));
            }
        }
        
        Ok(None)
    }

    /// Cache a single responsibility
    pub async fn cache_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
        responsibility: &Value,
        ttl_seconds: u64,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let cache_key = self.responsibility_cache_key(school_id, responsibility_id);
        let json_str = serde_json::to_string(responsibility)?;
        
        if let Ok(mut conn) = self.redis_pool.get().await {
            let _: () = conn.set_ex(&cache_key, json_str, ttl_seconds).await?;
        }
        
        Ok(())
    }

    /// Invalidate responsibility cache
    pub async fn invalidate_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let cache_key = self.responsibility_cache_key(school_id, responsibility_id);
        
        if let Ok(mut conn) = self.redis_pool.get().await {
            let _: () = conn.del(&cache_key).await?;
        }
        
        Ok(())
    }

    /// Get employee responsibilities with caching
    pub async fn get_employee_responsibilities(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<Option<Vec<Value>>, Box<dyn std::error::Error + Send + Sync>> {
        let cache_key = self.employee_responsibilities_cache_key(school_id, employee_id);
        
        if let Ok(mut conn) = self.redis_pool.get().await {
            let cached: Option<String> = conn.get(&cache_key).await.ok().flatten();
            if let Some(cached_json) = cached {
                let parsed: Vec<Value> = serde_json::from_str(&cached_json)?;
                return Ok(Some(parsed));
            }
        }
        
        Ok(None)
    }

    /// Cache employee responsibilities
    pub async fn cache_employee_responsibilities(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibilities: &[Value],
        ttl_seconds: u64,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let cache_key = self.employee_responsibilities_cache_key(school_id, employee_id);
        let json_str = serde_json::to_string(responsibilities)?;
        
        if let Ok(mut conn) = self.redis_pool.get().await {
            let _: () = conn.set_ex(&cache_key, json_str, ttl_seconds).await?;
        }
        
        Ok(())
    }

    /// Invalidate employee responsibilities cache
    pub async fn invalidate_employee_responsibilities(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let cache_key = self.employee_responsibilities_cache_key(school_id, employee_id);
        
        if let Ok(mut conn) = self.redis_pool.get().await {
            let _: () = conn.del(&cache_key).await?;
        }
        
        Ok(())
    }

    /// Get analytics data with caching
    pub async fn get_analytics(
        &self,
        school_id: &str,
        analytics_type: &str,
        period: &str,
    ) -> Result<Option<Value>, Box<dyn std::error::Error + Send + Sync>> {
        let cache_key = self.analytics_cache_key(school_id, analytics_type, period);
        
        if let Ok(mut conn) = self.redis_pool.get().await {
            let cached: Option<String> = conn.get(&cache_key).await.ok().flatten();
            if let Some(cached_json) = cached {
                let parsed: Value = serde_json::from_str(&cached_json)?;
                return Ok(Some(parsed));
            }
        }
        
        Ok(None)
    }

    /// Cache analytics data
    pub async fn cache_analytics(
        &self,
        school_id: &str,
        analytics_type: &str,
        period: &str,
        analytics_data: &Value,
        ttl_seconds: u64,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let cache_key = self.analytics_cache_key(school_id, analytics_type, period);
        let json_str = serde_json::to_string(analytics_data)?;
        
        if let Ok(mut conn) = self.redis_pool.get().await {
            let _: () = conn.set_ex(&cache_key, json_str, ttl_seconds).await?;
        }
        
        Ok(())
    }

    /// Invalidate analytics cache
    pub async fn invalidate_analytics(
        &self,
        school_id: &str,
        analytics_type: &str,
        period: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let cache_key = self.analytics_cache_key(school_id, analytics_type, period);
        
        if let Ok(mut conn) = self.redis_pool.get().await {
            let _: () = conn.del(&cache_key).await?;
        }
        
        Ok(())
    }

    /// Generate cache key for responsibilities list
    fn responsibilities_cache_key(&self, school_id: &str, employee_type: Option<&str>) -> String {
        if let Some(e_type) = employee_type {
            format!("responsibilities:{}:{}", school_id, e_type)
        } else {
            format!("responsibilities:{}", school_id)
        }
    }

    /// Generate cache key for a single responsibility
    fn responsibility_cache_key(&self, school_id: &str, responsibility_id: &str) -> String {
        format!("responsibility:{}:{}", school_id, responsibility_id)
    }

    /// Generate cache key for employee responsibilities
    fn employee_responsibilities_cache_key(&self, school_id: &str, employee_id: &str) -> String {
        format!("employee_responsibilities:{}:{}", school_id, employee_id)
    }

    /// Generate cache key for analytics
    fn analytics_cache_key(&self, school_id: &str, analytics_type: &str, period: &str) -> String {
        format!("analytics:{}:{}:{}", school_id, analytics_type, period)
    }

    /// Bulk invalidate all responsibility-related cache for a school
    pub async fn invalidate_all_school_cache(&self, school_id: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let patterns = vec![
            format!("responsibilities:{}*", school_id),
            format!("responsibility:{}:*", school_id),
            format!("employee_responsibilities:{}:*", school_id),
            format!("analytics:{}:*", school_id),
        ];
        
        if let Ok(mut conn) = self.redis_pool.get().await {
            for pattern in patterns {
                let keys: Vec<String> = conn.keys(&pattern).await?;
                if !keys.is_empty() {
                    let _: () = conn.del(keys).await?;
                }
            }
        }
        
        Ok(())
    }
}

/// Cached responsibility repository wrapper
pub struct CachedResponsibilityRepository {
    inner: Arc<dyn crate::repository::traits::ResponsibilityRepository + Send + Sync>,
    cache: Arc<ResponsibilityCacheService>,
}

impl CachedResponsibilityRepository {
    /// Create a new cached repository
    pub fn new(
        inner: Arc<dyn crate::repository::traits::ResponsibilityRepository + Send + Sync>,
        cache: Arc<ResponsibilityCacheService>,
    ) -> Self {
        Self { inner, cache }
    }
}

#[async_trait::async_trait]
impl crate::repository::traits::ResponsibilityRepository for CachedResponsibilityRepository {
    async fn get_responsibilities(
        &self,
        school_id: &str,
        employee_type: Option<String>,
    ) -> Result<crate::repository::traits::JsonList, crate::repository::traits::AppError> {
        // Try cache first
        if let Ok(Some(cached)) = self.cache.get_responsibilities(school_id, employee_type.as_deref()).await {
            return Ok(cached);
        }
        
        // Cache miss, fetch from database
        let result = self.inner.get_responsibilities(school_id, employee_type.clone()).await?;
        
        // Cache the result (30 minutes TTL for lists)
        let _ = self.cache.cache_responsibilities(
            school_id,
            employee_type.as_deref(),
            &result,
            30 * 60, // 30 minutes
        ).await;
        
        Ok(result)
    }

    async fn add_responsibility(&self, school_id: &str, data: Value) -> Result<Value, crate::repository::traits::AppError> {
        let result = self.inner.add_responsibility(school_id, data).await?;
        
        // Invalidate cache for this school
        let _ = self.cache.invalidate_all_school_cache(school_id).await;
        
        Ok(result)
    }

    async fn assign_employees_with_spaces(
        &self,
        school_id: &str,
        responsibility_id: &str,
        assignments: Vec<(String, Vec<String>)>,
    ) -> Result<(), crate::repository::traits::AppError> {
        self.inner.assign_employees_with_spaces(school_id, responsibility_id, assignments.clone()).await?;
        
        // Invalidate cache for affected employees
        for (employee_id, _) in assignments {
            let _ = self.cache.invalidate_employee_responsibilities(school_id, &employee_id).await;
        }
        
        // Invalidate responsibility cache
        let _ = self.cache.invalidate_responsibility(school_id, responsibility_id).await;
        
        Ok(())
    }

    async fn assign_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), crate::repository::traits::AppError> {
        self.inner.assign_responsibility(school_id, employee_id, responsibility_id).await?;
        
        // Invalidate cache
        let _ = self.cache.invalidate_employee_responsibilities(school_id, employee_id).await;
        let _ = self.cache.invalidate_responsibility(school_id, responsibility_id).await;
        
        Ok(())
    }

    async fn bulk_assign_responsibilities(
        &self,
        school_id: &str,
        employee_ids: Vec<String>,
        responsibility_ids: Vec<String>,
        space_ids: Vec<String>,
    ) -> Result<(), crate::repository::traits::AppError> {
        self.inner.bulk_assign_responsibilities(school_id, employee_ids.clone(), responsibility_ids.clone(), space_ids).await?;
        
        // Invalidate cache for all affected employees and responsibilities
        for employee_id in employee_ids {
            let _ = self.cache.invalidate_employee_responsibilities(school_id, &employee_id).await;
        }
        
        for responsibility_id in responsibility_ids {
            let _ = self.cache.invalidate_responsibility(school_id, &responsibility_id).await;
        }
        
        Ok(())
    }

    async fn remove_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), crate::repository::traits::AppError> {
        self.inner.remove_responsibility(school_id, employee_id, responsibility_id).await?;
        
        // Invalidate cache
        let _ = self.cache.invalidate_employee_responsibilities(school_id, employee_id).await;
        let _ = self.cache.invalidate_responsibility(school_id, responsibility_id).await;
        
        Ok(())
    }

    async fn get_responsibility_analytics(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> Result<Value, crate::repository::traits::AppError> {
        // Analytics cache key (daily period for now)
        let period = "daily";
        
        // Try cache first
        if let Ok(Some(cached)) = self.cache.get_analytics(school_id, "responsibility", period).await {
            return Ok(cached);
        }
        
        // Cache miss, fetch from database
        let result = self.inner.get_responsibility_analytics(school_id, responsibility_id).await?;
        
        // Cache the result (5 minutes TTL for analytics)
        let _ = self.cache.cache_analytics(
            school_id,
            "responsibility",
            period,
            &result,
            5 * 60, // 5 minutes
        ).await;
        
        Ok(result)
    }

    async fn get_responsibilities_paginated(
        &self,
        school_id: &str,
        employee_type: Option<String>,
        page: i32,
        limit: i32,
    ) -> Result<Value, crate::repository::traits::AppError> {
        // For paginated results, we don't cache them as they're dynamic
        // Just delegate to inner repository
        self.inner.get_responsibilities_paginated(school_id, employee_type, page, limit).await
    }

    async fn get_student_responsibilities_paginated(
        &self,
        school_id: &str,
        student_id: &str,
        page: i32,
        limit: i32,
    ) -> Result<Value, crate::repository::traits::AppError> {
        // For paginated results, we don't cache them as they're dynamic
        // Just delegate to inner repository
        self.inner.get_student_responsibilities_paginated(school_id, student_id, page, limit).await
    }

    async fn get_employee_responsibilities_paginated(
        &self,
        school_id: &str,
        employee_id: &str,
        page: i32,
        limit: i32,
    ) -> Result<Value, crate::repository::traits::AppError> {
        // For paginated results, we don't cache them as they're dynamic
        // Just delegate to inner repository
        self.inner.get_employee_responsibilities_paginated(school_id, employee_id, page, limit).await
    }

    async fn get_student_fee_sum_for_space(&self, school_id: &str, space_id: &str) -> Result<f64, crate::repository::traits::AppError> {
        self.inner.get_student_fee_sum_for_space(school_id, space_id).await
    }

    async fn get_student_responsibilities(&self, school_id: &str, student_id: &str) -> Result<Vec<Value>, crate::repository::traits::AppError> {
        self.inner.get_student_responsibilities(school_id, student_id).await
    }

    async fn get_responsibility(&self, school_id: &str, responsibility_id: &str) -> Result<Option<Value>, crate::repository::traits::AppError> {
        if let Ok(Some(cached)) = self.cache.get_responsibility(school_id, responsibility_id).await {
            return Ok(Some(cached));
        }
        let result = self.inner.get_responsibility(school_id, responsibility_id).await?;
        if let Some(ref data) = result {
            let _ = self.cache.cache_responsibility(school_id, responsibility_id, data, 30 * 60).await;
        }
        Ok(result)
    }

    async fn get_responsibility_by_name(&self, school_id: &str, name: &str) -> Result<Option<Value>, crate::repository::traits::AppError> {
        self.inner.get_responsibility_by_name(school_id, name).await
    }

    async fn update_responsibility(&self, school_id: &str, responsibility_id: &str, data: Value) -> Result<(), crate::repository::traits::AppError> {
        self.inner.update_responsibility(school_id, responsibility_id, data).await?;
        let _ = self.cache.invalidate_responsibility(school_id, responsibility_id).await;
        let _ = self.cache.invalidate_all_school_cache(school_id).await;
        Ok(())
    }

    async fn delete_responsibility(&self, school_id: &str, responsibility_id: &str) -> Result<(), crate::repository::traits::AppError> {
        self.inner.delete_responsibility(school_id, responsibility_id).await?;
        let _ = self.cache.invalidate_responsibility(school_id, responsibility_id).await;
        let _ = self.cache.invalidate_all_school_cache(school_id).await;
        Ok(())
    }

    async fn get_employee_responsibilities(&self, school_id: &str, employee_id: &str) -> Result<crate::repository::traits::JsonList, crate::repository::traits::AppError> {
        if let Ok(Some(cached)) = self.cache.get_employee_responsibilities(school_id, employee_id).await {
            return Ok(cached);
        }
        let result = self.inner.get_employee_responsibilities(school_id, employee_id).await?;
        let _ = self.cache.cache_employee_responsibilities(school_id, employee_id, &result, 30 * 60).await;
        Ok(result)
    }
}