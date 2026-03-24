use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
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
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.repos.leave.add_leave(school_id, data.clone()).await?;

        // System Audit Log
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "LEAVE",
            &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()),
            "CREATE",
            data
        ).await;
        Ok(res)
    }

    async fn list_leaves(
        &self,
        school_id: &str,
    ) -> AppResult<Vec<Value>> {
        Ok(self.repos.leave.get_leaves(school_id).await?)
    }

    async fn approve_leave(&self, school_id: &str, admin_id: &str, leave_id: i32) -> AppResult<()> {
        let lid = leave_id.to_string();
        self.repos.leave.update_leave_status(school_id, &lid, "APPROVED").await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "LEAVE", &lid, "APPROVE", json!({})).await;
        Ok(())
    }

    async fn reject_leave(&self, school_id: &str, admin_id: &str, leave_id: i32) -> AppResult<()> {
        let lid = leave_id.to_string();
        self.repos.leave.update_leave_status(school_id, &lid, "REJECTED").await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "LEAVE", &lid, "REJECT", json!({})).await;
        Ok(())
    }

    async fn extend_leave(&self, school_id: &str, admin_id: &str, leave_id: i32, days: i32) -> AppResult<()> {
        let lid = leave_id.to_string();
        self.repos.leave.update_leave_duration(school_id, &lid, "EXTEND", days).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "LEAVE", &lid, "EXTEND", json!({"days": days})).await;
        Ok(())
    }

    async fn reduce_leave(&self, school_id: &str, admin_id: &str, leave_id: i32, days: i32) -> AppResult<()> {
        let lid = leave_id.to_string();
        self.repos.leave.update_leave_duration(school_id, &lid, "REDUCE", days).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "LEAVE", &lid, "REDUCE", json!({"days": days})).await;
        Ok(())
    }

    async fn download_leave_pdf(&self, _school_id: &str, _leave_id: i32) -> AppResult<Vec<u8>> {
        // Placeholder implementation
        Ok(vec![])
    }

    async fn get_proxy_suggestions(
        &self,
        school_id: &str,
        date: &str,
        period: &str,
        subject: Option<&str>,
    ) -> AppResult<Value> {
        // Map date/teacher to day/period for the engine (simplified logic)
        // In a real scenario, we'd lookup the teacher's schedule for that date.
        let suggestions = self.timetable.find_available_substitutes(school_id, 1, 1, None).await?;
        Ok(json!({ 
            "suggestions": suggestions,
            "meta": { "date": date, "period": period, "subject": subject }
        }))
    }

    async fn get_leaves(&self, school_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.leave.get_leaves(school_id).await?)
    }

    async fn update_leave_status(&self, school_id: &str, admin_id: &str, leave_id: &str, status: &str) -> AppResult<()> {
        self.repos.leave.update_leave_status(school_id, leave_id, status).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "LEAVE", leave_id, "STATUS_UPDATE", json!({"status": status})).await;
        Ok(())
    }

    async fn update_leave_duration(&self, school_id: &str, admin_id: &str, leave_id: &str, action: &str, days: i32) -> AppResult<()> {
        self.repos.leave.update_leave_duration(school_id, leave_id, action, days).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "LEAVE", leave_id, "DURATION_UPDATE", json!({"action": action, "days": days})).await;
        Ok(())
    }
}
