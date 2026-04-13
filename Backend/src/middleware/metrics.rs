//! Performance metrics middleware for monitoring responsibility queries
//! 
//! This middleware tracks:
//! - Request duration for responsibility endpoints
//! - Database query performance
//! - Error rates
//! - Response sizes

use axum::{
    body::Body,
    extract::Request,
    http::{Response, StatusCode},
    middleware::Next,
    response::IntoResponse,
};
use chrono::Utc;
use std::time::Instant;
use tracing::{info, warn, error, debug};

/// Metrics data structure for tracking performance
#[derive(Debug, Clone)]
pub struct RequestMetrics {
    pub path: String,
    pub method: String,
    pub status_code: u16,
    pub duration_ms: u64,
    pub school_id: Option<String>,
    pub endpoint_type: EndpointType,
    pub timestamp: chrono::DateTime<Utc>,
}

/// Type of endpoint for categorization
#[derive(Debug, Clone, PartialEq)]
pub enum EndpointType {
    ResponsibilityCrud,
    ResponsibilityMetrics,
    ResponsibilityBulk,
    ResponsibilityHistory,
    Other,
}

impl EndpointType {
    /// Determine endpoint type from path
    pub fn from_path(path: &str) -> Self {
        if path.contains("/responsibility/") {
            if path.contains("/metrics/") || path.contains("/analytics") {
                EndpointType::ResponsibilityMetrics
            } else if path.contains("/bulk-") || path.contains("/bulk_") {
                EndpointType::ResponsibilityBulk
            } else if path.contains("/history") || path.contains("/versions") {
                EndpointType::ResponsibilityHistory
            } else {
                EndpointType::ResponsibilityCrud
            }
        } else {
            EndpointType::Other
        }
    }
}

/// Extract school ID from request path
fn extract_school_id(path: &str) -> Option<String> {
    // Path pattern: /api/responsibility/:schoolId/...
    let parts: Vec<&str> = path.split('/').collect();
    for (i, part) in parts.iter().enumerate() {
        if *part == "responsibility" && i + 1 < parts.len() {
            let school_id = parts[i + 1];
            // Check if it looks like a school ID (not a reserved word)
            if !school_id.is_empty() 
                && school_id != "metrics" 
                && school_id != "analytics"
                && school_id != "history"
                && school_id != "bulk"
                && !school_id.contains('?') {
                return Some(school_id.to_string());
            }
        }
    }
    None
}

/// Performance metrics middleware
pub async fn metrics_middleware(
    request: Request,
    next: Next,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let start_time = Instant::now();
    let path = request.uri().path().to_string();
    let method = request.method().to_string();
    
    // Extract metrics metadata
    let endpoint_type = EndpointType::from_path(&path);
    let school_id = extract_school_id(&path);
    
    // Log request start for responsibility endpoints
    if endpoint_type != EndpointType::Other {
        debug!(
            "Responsibility request started: {} {} (school: {:?})",
            method, path, school_id
        );
    }
    
    // Process request
    let response = next.run(request).await;
    let duration = start_time.elapsed();
    let duration_ms = duration.as_millis() as u64;
    let status_code = response.status().as_u16();
    
    // Create metrics
    let metrics = RequestMetrics {
        path,
        method,
        status_code,
        duration_ms,
        school_id,
        endpoint_type: endpoint_type.clone(),
        timestamp: Utc::now(),
    };
    
    // Log based on performance and endpoint type
    log_metrics(&metrics);
    
    // Store metrics for aggregation (in a real implementation, this would send to metrics system)
    store_metrics(metrics);
    
    Ok(response)
}

/// Log metrics based on performance thresholds
fn log_metrics(metrics: &RequestMetrics) {
    let is_responsibility = metrics.endpoint_type != EndpointType::Other;
    
    // Performance thresholds
    let warning_threshold_ms = 1000; // 1 second
    let error_threshold_ms = 5000;   // 5 seconds
    
    if metrics.duration_ms >= error_threshold_ms {
        error!(
            "SLOW RESPONSE: {} {} took {}ms (school: {:?})",
            metrics.method, metrics.path, metrics.duration_ms, metrics.school_id
        );
    } else if metrics.duration_ms >= warning_threshold_ms {
        warn!(
            "Slow response: {} {} took {}ms (school: {:?})",
            metrics.method, metrics.path, metrics.duration_ms, metrics.school_id
        );
    } else if is_responsibility {
        info!(
            "Responsibility request: {} {} {}ms (school: {:?})",
            metrics.method, metrics.path, metrics.duration_ms, metrics.school_id
        );
    }
    
    // Log errors
    if metrics.status_code >= 500 {
        error!(
            "Error response: {} {} -> {} (school: {:?})",
            metrics.method, metrics.path, metrics.status_code, metrics.school_id
        );
    } else if metrics.status_code >= 400 && is_responsibility {
        warn!(
            "Client error: {} {} -> {} (school: {:?})",
            metrics.method, metrics.path, metrics.status_code, metrics.school_id
        );
    }
}

/// Store metrics for aggregation
/// In a production system, this would send to Prometheus, Datadog, etc.
fn store_metrics(metrics: RequestMetrics) {
    // Simple in-memory storage for demonstration
    // In production, use a proper metrics system
    
    // Track metrics by endpoint type
    let metric_key = format!("{}_{}", metrics.endpoint_type.as_str(), metrics.method);
    
    // Here you would increment counters in a metrics system
    // For example:
    // - responsibility_crud_requests_total
    // - responsibility_metrics_duration_ms
    // - responsibility_errors_total
    
    debug!("Stored metrics: {:?}", metrics);
}

impl EndpointType {
    /// Convert to string for metrics labeling
    pub fn as_str(&self) -> &'static str {
        match self {
            EndpointType::ResponsibilityCrud => "responsibility_crud",
            EndpointType::ResponsibilityMetrics => "responsibility_metrics",
            EndpointType::ResponsibilityBulk => "responsibility_bulk",
            EndpointType::ResponsibilityHistory => "responsibility_history",
            EndpointType::Other => "other",
        }
    }
}

/// Database query performance monitoring
pub mod query_monitoring {
    use sqlx::{Postgres, postgres::PgQueryResult};
    use std::time::Instant;
    use tracing::{debug, warn};
    
    /// Monitor a database query execution
    pub async fn monitor_query<F, T>(
        query_name: &str,
        school_id: Option<&str>,
        f: F,
    ) -> Result<T, sqlx::Error>
    where
        F: std::future::Future<Output = Result<T, sqlx::Error>>,
    {
        let start_time = Instant::now();
        let result = f.await;
        let duration = start_time.elapsed();
        let duration_ms = duration.as_millis() as u64;
        
        // Log slow queries
        if duration_ms > 500 {
            warn!(
                "Slow database query: {} took {}ms (school: {:?})",
                query_name, duration_ms, school_id
            );
        } else if duration_ms > 100 {
            debug!(
                "Database query: {} took {}ms (school: {:?})",
                query_name, duration_ms, school_id
            );
        }
        
        result
    }
    
    /// Monitor query execution with result count
    pub async fn monitor_query_with_count<F>(
        query_name: &str,
        school_id: Option<&str>,
        f: F,
    ) -> Result<PgQueryResult, sqlx::Error>
    where
        F: std::future::Future<Output = Result<PgQueryResult, sqlx::Error>>,
    {
        let start_time = Instant::now();
        let result = f.await;
        let duration = start_time.elapsed();
        let duration_ms = duration.as_millis() as u64;
        
        if let Ok(ref query_result) = result {
            let rows_affected = query_result.rows_affected();
            
            if duration_ms > 500 {
                warn!(
                    "Slow database query: {} took {}ms, affected {} rows (school: {:?})",
                    query_name, duration_ms, rows_affected, school_id
                );
            } else if duration_ms > 100 {
                debug!(
                    "Database query: {} took {}ms, affected {} rows (school: {:?})",
                    query_name, duration_ms, rows_affected, school_id
                );
            }
        }
        
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_endpoint_type_from_path() {
        assert_eq!(
            EndpointType::from_path("/api/responsibility/school123/responsibilities"),
            EndpointType::ResponsibilityCrud
        );
        
        assert_eq!(
            EndpointType::from_path("/api/responsibility/school123/metrics/utilization"),
            EndpointType::ResponsibilityMetrics
        );
        
        assert_eq!(
            EndpointType::from_path("/api/responsibility/school123/bulk-assign"),
            EndpointType::ResponsibilityBulk
        );
        
        assert_eq!(
            EndpointType::from_path("/api/responsibility/school123/history"),
            EndpointType::ResponsibilityHistory
        );
        
        assert_eq!(
            EndpointType::from_path("/api/other/endpoint"),
            EndpointType::Other
        );
    }
    
    #[test]
    fn test_extract_school_id() {
        assert_eq!(
            extract_school_id("/api/responsibility/school123/responsibilities"),
            Some("school123".to_string())
        );
        
        assert_eq!(
            extract_school_id("/api/responsibility/school-456/metrics"),
            Some("school-456".to_string())
        );
        
        // Should not extract reserved words
        assert_eq!(
            extract_school_id("/api/responsibility/metrics/utilization"),
            None
        );
        
        // Should not extract from non-responsibility paths
        assert_eq!(
            extract_school_id("/api/other/school123"),
            None
        );
        
        // Should handle query parameters
        assert_eq!(
            extract_school_id("/api/responsibility/school789/responsibilities?page=1"),
            Some("school789".to_string())
        );
    }
    
    #[test]
    fn test_endpoint_type_as_str() {
        assert_eq!(EndpointType::ResponsibilityCrud.as_str(), "responsibility_crud");
        assert_eq!(EndpointType::ResponsibilityMetrics.as_str(), "responsibility_metrics");
        assert_eq!(EndpointType::ResponsibilityBulk.as_str(), "responsibility_bulk");
        assert_eq!(EndpointType::ResponsibilityHistory.as_str(), "responsibility_history");
        assert_eq!(EndpointType::Other.as_str(), "other");
    }
}