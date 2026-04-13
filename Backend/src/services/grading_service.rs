use crate::error::AppResult;
use crate::repository::Repositories;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct GradingService {
    repos: Arc<Repositories>,
}

impl GradingService {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    /// Create a new grading rubric
    pub async fn create_rubric(
        &self,
        school_id: &str,
        rubric_data: &Value,
    ) -> AppResult<Value> {
        let rubric_name = rubric_data["rubric_name"]
            .as_str()
            .ok_or_else(|| crate::error::AppError::Validation("rubric_name is required".to_string()))?;
        
        let rubric_type = rubric_data["rubric_type"]
            .as_str()
            .ok_or_else(|| crate::error::AppError::Validation("rubric_type is required".to_string()))?;
        
        let criteria = rubric_data["criteria"]
            .as_array()
            .ok_or_else(|| crate::error::AppError::Validation("criteria array is required".to_string()))?;
        
        // Validate criteria structure
        for (i, criterion) in criteria.iter().enumerate() {
            if !criterion.is_object() {
                return Err(crate::error::AppError::Validation(
                    format!("Criterion {} must be an object", i + 1)
                ));
            }
            
            let name = criterion["name"].as_str();
            let weight = criterion["weight"].as_f64();
            let max_score = criterion["max_score"].as_f64();
            
            if name.is_none() || weight.is_none() || max_score.is_none() {
                return Err(crate::error::AppError::Validation(
                    format!("Criterion {} must have name, weight, and max_score", i + 1)
                ));
            }
        }
        
        // Calculate total score from criteria
        let total_score: f64 = criteria
            .iter()
            .filter_map(|c| c["max_score"].as_f64())
            .sum();
        
        let mut rubric_to_save = rubric_data.clone();
        rubric_to_save["total_score"] = json!(total_score);
        
        let result = self.repos.grading.add_rubric(school_id, rubric_to_save).await?;
        
        Ok(json!({
            "success": true,
            "data": result,
            "message": "Rubric created successfully"
        }))
    }

    /// Create an answer key for an exam (New)
    pub async fn create_answer_key(
        &self,
        school_id: &str,
        key_data: &Value,
    ) -> AppResult<Value> {
        let result = self.repos.grading.add_answer_key(school_id, key_data.clone()).await?;
        Ok(json!({
            "success": true,
            "data": result
        }))
    }

    /// Get grading configuration for a subject (New)
    pub async fn get_grading_config(
        &self,
        school_id: &str,
        subject_name: Option<&str>,
    ) -> AppResult<Value> {
        let config = self.repos.grading.get_grading_config(school_id, subject_name).await?;
        Ok(json!({
            "success": true,
            "data": config
        }))
    }

    /// Grade a submission using a rubric
    pub async fn grade_submission(
        &self,
        school_id: &str,
        submission_id: &str,
        rubric_id: &str,
    ) -> AppResult<Value> {
        let rubric = self.repos.grading.get_rubric(school_id, rubric_id).await?
            .ok_or_else(|| crate::error::AppError::NotFound("Rubric not found".to_string()))?;
            
        // In a real implementation, we would fetch the submission content
        // and perform the grading logic here. For now, we utilize the repository 
        // to save a placeholder result until the full AI logic is wired.
        
        let grading_data = json!({
            "submission_id": submission_id,
            "rubric_id": rubric_id,
            "overall_score": 85.5,
            "feedback": "Grading logic initialized. AI extraction pending.",
            "confidence_score": 90.0,
            "grading_provider": "gemini"
        });
        
        let result = self.repos.grading.save_grading_result(school_id, grading_data).await?;
        
        Ok(json!({
            "success": true,
            "data": result
        }))
    }

    /// Grade using AI with rubric guidance
    pub async fn grade_with_ai(
        &self,
        school_id: &str,
        submission_id: &str,
        rubric_id: &str,
        provider: Option<&str>,
    ) -> AppResult<Value> {
        // Integrate with AI providers via AiOrchestrator in Phase 2
        let result = self.grade_submission(school_id, submission_id, rubric_id).await?;
        Ok(result)
    }

    /// Batch grade multiple submissions
    pub async fn batch_grade(
        &self,
        school_id: &str,
        submission_ids: Vec<String>,
        rubric_id: &str,
    ) -> AppResult<Value> {
        let mut results = Vec::new();
        
        for submission_id in submission_ids {
            let result = self.grade_submission(school_id, &submission_id, rubric_id).await?;
            results.push(result["data"].clone());
        }
        
        Ok(json!({
            "success": true,
            "data": results,
            "total_graded": results.len()
        }))
    }

    /// Get rubric by ID
    pub async fn get_rubric(
        &self,
        school_id: &str,
        rubric_id: &str,
    ) -> AppResult<Value> {
        let rubric = self.repos.grading.get_rubric(school_id, rubric_id).await?;
        
        Ok(json!({
            "success": true,
            "data": rubric
        }))
    }

    /// List all rubrics for a school
    pub async fn list_rubrics(
        &self,
        school_id: &str,
        rubric_type: Option<&str>,
        subject_name: Option<&str>,
    ) -> AppResult<Value> {
        let filters = json!({
            "rubric_type": rubric_type,
            "subject_name": subject_name
        });
        
        let rubrics = self.repos.grading.get_rubrics(school_id, filters).await?;
        
        Ok(json!({
            "success": true,
            "data": rubrics,
            "count": rubrics.len()
        }))
    }
}

#[async_trait]
pub trait GradingServiceTrait {
    async fn create_rubric(&self, school_id: &str, rubric_data: &Value) -> AppResult<Value>;
    async fn create_answer_key(&self, school_id: &str, key_data: &Value) -> AppResult<Value>;
    async fn get_grading_config(&self, school_id: &str, subject_name: Option<&str>) -> AppResult<Value>;
    async fn grade_submission(&self, school_id: &str, submission_id: &str, rubric_id: &str) -> AppResult<Value>;
    async fn grade_with_ai(&self, school_id: &str, submission_id: &str, rubric_id: &str, provider: Option<&str>) -> AppResult<Value>;
    async fn batch_grade(&self, school_id: &str, submission_ids: Vec<String>, rubric_id: &str) -> AppResult<Value>;
    async fn get_rubric(&self, school_id: &str, rubric_id: &str) -> AppResult<Value>;
    async fn list_rubrics(&self, school_id: &str, rubric_type: Option<&str>, subject_name: Option<&str>) -> AppResult<Value>;
}

#[async_trait]
impl GradingServiceTrait for GradingService {
    async fn create_rubric(&self, school_id: &str, rubric_data: &Value) -> AppResult<Value> {
        self.create_rubric(school_id, rubric_data).await
    }

    async fn create_answer_key(&self, school_id: &str, key_data: &Value) -> AppResult<Value> {
        self.create_answer_key(school_id, key_data).await
    }

    async fn get_grading_config(&self, school_id: &str, subject_name: Option<&str>) -> AppResult<Value> {
        self.get_grading_config(school_id, subject_name).await
    }

    async fn grade_submission(&self, school_id: &str, submission_id: &str, rubric_id: &str) -> AppResult<Value> {
        self.grade_submission(school_id, submission_id, rubric_id).await
    }

    async fn grade_with_ai(&self, school_id: &str, submission_id: &str, rubric_id: &str, provider: Option<&str>) -> AppResult<Value> {
        self.grade_with_ai(school_id, submission_id, rubric_id, provider).await
    }

    async fn batch_grade(&self, school_id: &str, submission_ids: Vec<String>, rubric_id: &str) -> AppResult<Value> {
        self.batch_grade(school_id, submission_ids, rubric_id).await
    }

    async fn get_rubric(&self, school_id: &str, rubric_id: &str) -> AppResult<Value> {
        self.get_rubric(school_id, rubric_id).await
    }

    async fn list_rubrics(&self, school_id: &str, rubric_type: Option<&str>, subject_name: Option<&str>) -> AppResult<Value> {
        self.list_rubrics(school_id, rubric_type, subject_name).await
    }
}