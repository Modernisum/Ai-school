use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::error::Error;
use std::sync::Arc;

pub struct PostgresLeaveService {
    pub repos: Arc<Repositories>,
    pub timetable: Arc<crate::logic::timetable_engine::TimetableEngine>,
}

#[async_trait]
impl LeaveService for PostgresLeaveService {
    async fn create_leave(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.leave.add_leave(school_id, data).await
    }

    async fn get_leaves(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.leave.get_leaves(school_id).await
    }

    async fn update_leave_status(
        &self,
        school_id: &str,
        leave_id: &str,
        status: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos
            .leave
            .update_leave_status(school_id, leave_id, status)
            .await
    }

    async fn update_leave_duration(
        &self,
        school_id: &str,
        leave_id: &str,
        action: &str,
        days: i32,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos
            .leave
            .update_leave_duration(school_id, leave_id, action, days)
            .await
    }

    async fn get_proxy_suggestions(
        &self,
        school_id: &str,
        day: usize,
        period: usize,
        subject_id: Option<&str>,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let suggestions = self.timetable.find_available_substitutes(school_id, day, period, subject_id).await?;
        Ok(json!({ "suggestions": suggestions }))
    }
}
