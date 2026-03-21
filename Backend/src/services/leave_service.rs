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
    ) -> Result<Value, AppError> {
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

    async fn get_leaves(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError> {
        Ok(self.repos.leave.get_leaves(school_id).await?)
    }

    async fn get_leave(
        &self,
        school_id: &str,
        leave_id: &str,
    ) -> Result<Option<Value>, AppError> {
        Ok(self.repos.leave.get_leave(school_id, leave_id).await?)
    }

    async fn update_leave_status(
        &self,
        school_id: &str,
        admin_id: &str,
        leave_id: &str,
        status: &str,
    ) -> Result<(), AppError> {
        self.repos
            .leave
            .update_leave_status(school_id, leave_id, status)
            .await?;

        // System Audit Log
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "LEAVE",
            leave_id,
            "UPDATE_STATUS",
            json!({ "status": status })
        ).await;
        Ok(())
    }

    async fn update_leave_duration(
        &self,
        school_id: &str,
        admin_id: &str,
        leave_id: &str,
        action: &str,
        days: i32,
    ) -> Result<(), AppError> {
        self.repos
            .leave
            .update_leave_duration(school_id, leave_id, action, days)
            .await?;

        // System Audit Log
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "LEAVE",
            leave_id,
            "UPDATE_DURATION",
            json!({ "action": action, "days": days })
        ).await;
        Ok(())
    }

    async fn get_proxy_suggestions(
        &self,
        school_id: &str,
        day: usize,
        period: usize,
        subject_id: Option<&str>,
    ) -> Result<Value, AppError> {
        let suggestions = self.timetable.find_available_substitutes(school_id, day, period, subject_id).await?;
        Ok(json!({ "suggestions": suggestions }))
    }

    async fn delete_leave(
        &self,
        school_id: &str,
        admin_id: &str,
        leave_id: &str,
    ) -> Result<(), AppError> {
        let leave = self.repos.leave.get_leave(school_id, leave_id).await?
            .ok_or("Leave application not found")?;

        self.repos.leave.delete_leave_application(school_id, leave_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "LEAVE",
            leave_id,
            "DELETE",
            leave
        ).await;

        Ok(())
    }
}
