use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

pub struct PostgresComplainService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl ComplainService for PostgresComplainService {
    async fn create_complain(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.repos.complain.add_complain(school_id, data.clone()).await?;
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "COMPLAIN",
            &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()),
            "CREATE",
            data
        ).await;
        Ok(res)
    }

    async fn list_complains(
        &self,
        school_id: &str,
        user_id: Option<&str>,
        user_role: Option<&str>,
    ) -> AppResult<Vec<Value>> {
        Ok(self.repos.complain.get_complains(school_id, user_id, user_role).await?)
    }

    async fn delete_complain(
        &self,
        school_id: &str,
        admin_id: &str,
        complain_id: i32,
    ) -> AppResult<()> {
        let complain = self.repos.complain.get_complain(school_id, complain_id).await?
            .ok_or_else(|| AppError::NotFound("Complain not found".to_string()))?;

        self.repos.complain.delete_complain(school_id, complain_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "COMPLAIN",
            &complain_id.to_string(),
            "DELETE",
            complain
        ).await;

        Ok(())
    }
}
