use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::AppResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlagiarismCheck {
    pub submission_id: i32,
    pub compared_submission_ids: Vec<i32>,
    pub similarity_scores: Vec<f32>,
    pub highest_similarity: f32,
    pub is_plagiarized: bool,
    pub plagiarism_threshold: f32,
    pub matched_sections: Vec<MatchedSection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchedSection {
    pub text: String,
    pub similarity: f32,
    pub source_submission_id: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlagiarismCache {
    pub hash: String,
    pub submission_id: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[async_trait]
pub trait PlagiarismServiceTrait: Send + Sync {
    async fn check_plagiarism(&self, submission_id: i32, text: &str, threshold: f32) -> AppResult<PlagiarismCheck>;
    
    async fn cache_plagiarism_hash(&self, submission_id: i32, text: &str) -> AppResult<String>;
    
    async fn get_cached_hashes(&self, assignment_id: i32) -> AppResult<Vec<PlagiarismCache>>;
    
    async fn batch_check_plagiarism(&self, submission_ids: Vec<i32>) -> AppResult<Vec<PlagiarismCheck>>;
}