use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

pub struct PostgresAwardService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl AwardService for PostgresAwardService {
    async fn create_award(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.repos.award.add_award(school_id, data.clone()).await.map_err(AppError::from)?;
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "AWARD",
            &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()),
            "CREATE",
            data
        ).await;
        Ok(res)
    }

    async fn list_awards(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> AppResult<Vec<Value>> {
        Ok(self.repos.award.get_awards(school_id, student_id).await.map_err(AppError::from)?)
    }

    async fn delete_award(
        &self,
        school_id: &str,
        admin_id: &str,
        award_id: i32,
    ) -> AppResult<()> {
        let award = self.repos.award.get_award(school_id, award_id).await?
            .ok_or_else(|| AppError::NotFound("Award not found".to_string()))?;

        self.repos.award.delete_award(school_id, award_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "AWARD",
            &award_id.to_string(),
            "DELETE",
            award
        ).await;

        Ok(())
    }
}
