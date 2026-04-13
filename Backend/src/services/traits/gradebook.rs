use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::AppResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GradebookEntry {
    pub id: i32,
    pub student_id: i32,
    pub assignment_id: i32,
    pub grade: f32,
    pub max_grade: f32,
    pub percentage: f32,
    pub letter_grade: String,
    pub feedback: Option<String>,
    pub published: bool,
    pub published_at: Option<chrono::DateTime<chrono::Utc>>,
    pub synced_with_external: bool,
    pub external_system_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentGradebook {
    pub student_id: i32,
    pub student_name: String,
    pub class_id: i32,
    pub term: String,
    pub entries: Vec<GradebookEntry>,
    pub overall_average: f32,
    pub overall_letter_grade: String,
    pub rank_in_class: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GradebookSyncLog {
    pub id: i32,
    pub sync_type: String,
    pub records_synced: i32,
    pub success_count: i32,
    pub failure_count: i32,
    pub sync_started_at: chrono::DateTime<chrono::Utc>,
    pub sync_completed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub status: String,
    pub error_message: Option<String>,
}

#[async_trait]
pub trait GradebookServiceTrait: Send + Sync {
    async fn sync_grading_to_gradebook(&self, grading_result_id: i32) -> AppResult<GradebookEntry>;
    
    async fn get_student_gradebook(&self, student_id: i32, term: Option<&str>) -> AppResult<StudentGradebook>;
    
    async fn publish_grades(&self, assignment_id: i32) -> AppResult<i32>;
    
    async fn batch_sync_grades(&self, assignment_ids: Vec<i32>) -> AppResult<GradebookSyncLog>;
    
    async fn export_gradebook(&self, class_id: i32, term: &str, format: &str) -> AppResult<Vec<u8>>;
    
    async fn get_sync_logs(&self, limit: i32) -> AppResult<Vec<GradebookSyncLog>>;
}