use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

pub struct PostgresTaskService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl TaskService for PostgresTaskService {
    async fn add_task(&self, school_id: &str, data: Value) -> AppResult<Value> {
        Ok(self.repos.task.add_task(school_id, data).await?)
    }

    async fn list_tasks(
        &self,
        school_id: &str,
        start_date: Option<&str>,
        end_date: Option<&str>
    ) -> AppResult<Vec<Value>> {
        Ok(self.repos.task.get_tasks(school_id, start_date, end_date).await?)
    }

    async fn update_task_status(&self, school_id: &str, task_id: &str, status: &str) -> AppResult<()> {
        Ok(self.repos.task.update_task_status(school_id, task_id, status).await?)
    }
}
