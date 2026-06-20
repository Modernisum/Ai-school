use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::AppResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorPattern {
    pub id: i32,
    pub pattern_name: String,
    pub pattern_regex: String,
    pub feedback_template: String,
    pub severity: String,
    pub subject_area: Option<String>,
    pub grade_level: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedbackAnalysis {
    pub submission_id: i32,
    pub error_patterns_found: Vec<ErrorPattern>,
    pub overall_feedback: String,
    pub suggestions: Vec<String>,
    pub confidence_score: f32,
}

#[async_trait]
pub trait FeedbackServiceTrait: Send + Sync {
    async fn analyze_submission(&self, submission_id: i32, text: &str, score: f32) -> AppResult<FeedbackAnalysis>;
    
    async fn get_error_patterns(&self, subject_area: Option<&str>, grade_level: Option<&str>) -> AppResult<Vec<ErrorPattern>>;
    
    async fn add_error_pattern(&self, pattern: ErrorPattern) -> AppResult<i32>;
}