use crate::repository::Repositories;
use crate::services::traits::*;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct ResponsibilityMetrics {
    pub repos: Arc<Repositories>,
}

impl ResponsibilityMetrics {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn get_responsibility_utilization_metrics(
        &self,
        school_id: &str,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value> {
        let metrics = self.repos.responsibility.get_responsibility_utilization_metrics(school_id, start_date, end_date).await?;
        Ok(metrics)
    }
    
    pub async fn get_employee_workload_metrics(
        &self,
        school_id: &str,
        employee_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value> {
        let metrics = self.repos.responsibility.get_employee_workload_metrics(school_id, employee_id, start_date, end_date).await?;
        Ok(metrics)
    }
    
    pub async fn get_space_distribution_metrics(
        &self,
        school_id: &str,
        space_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value> {
        let metrics = self.repos.responsibility.get_space_distribution_metrics(school_id, space_id, start_date, end_date).await?;
        Ok(metrics)
    }
    
    pub async fn get_revenue_metrics(
        &self,
        school_id: &str,
        responsibility_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value> {
        let metrics = self.repos.responsibility.get_revenue_metrics(school_id, responsibility_id, start_date, end_date).await?;
        Ok(metrics)
    }
    
    pub async fn generate_utilization_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        let metrics = self.get_responsibility_utilization_metrics(school_id, Some(start_date), Some(end_date)).await?;
        
        Ok(json!({
            "reportType": "utilization",
            "schoolId": school_id,
            "period": {
                "start": start_date,
                "end": end_date
            },
            "metrics": metrics,
            "generatedAt": chrono::Utc::now().to_rfc3339()
        }))
    }
    
    pub async fn generate_workload_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        let metrics = self.get_employee_workload_metrics(school_id, None, Some(start_date), Some(end_date)).await?;
        
        Ok(json!({
            "reportType": "workload",
            "schoolId": school_id,
            "period": {
                "start": start_date,
                "end": end_date
            },
            "metrics": metrics,
            "generatedAt": chrono::Utc::now().to_rfc3339()
        }))
    }
    
    pub async fn generate_space_distribution_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        let metrics = self.get_space_distribution_metrics(school_id, None, Some(start_date), Some(end_date)).await?;
        
        Ok(json!({
            "reportType": "space_distribution",
            "schoolId": school_id,
            "period": {
                "start": start_date,
                "end": end_date
            },
            "metrics": metrics,
            "generatedAt": chrono::Utc::now().to_rfc3339()
        }))
    }
    
    pub async fn generate_revenue_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        let metrics = self.get_revenue_metrics(school_id, None, Some(start_date), Some(end_date)).await?;
        
        Ok(json!({
            "reportType": "revenue",
            "schoolId": school_id,
            "period": {
                "start": start_date,
                "end": end_date
            },
            "metrics": metrics,
            "generatedAt": chrono::Utc::now().to_rfc3339()
        }))
    }
}

