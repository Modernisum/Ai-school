use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::error::{AppError, AppResult};

use crate::repository::Repositories;
use crate::services::traits::feedback::{FeedbackServiceTrait, ErrorPattern, FeedbackAnalysis};

pub struct FeedbackService {
    repos: Arc<Repositories>,
}

impl FeedbackService {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    fn analyze_text(&self, text: &str) -> Vec<ErrorPattern> {
        // Mock implementation for rapid prototyping
        // In production, this would use regex patterns and NLP
        let mut patterns = Vec::new();
        
        // Common error patterns
        if text.to_lowercase().contains("i think") {
            patterns.push(ErrorPattern {
                id: 1,
                pattern_name: "Hedging Language".to_string(),
                pattern_regex: "i think".to_string(),
                feedback_template: "Try to state your points more confidently. Instead of 'I think', use 'The evidence shows' or 'Based on the data'.".to_string(),
                severity: "Low".to_string(),
                subject_area: None,
                grade_level: None,
            });
        }
        
        if text.len() < 50 {
            patterns.push(ErrorPattern {
                id: 2,
                pattern_name: "Insufficient Detail".to_string(),
                pattern_regex: "short answer".to_string(),
                feedback_template: "Your answer is too brief. Try to provide more examples or explanations to support your points.".to_string(),
                severity: "Medium".to_string(),
                subject_area: None,
                grade_level: None,
            });
        }
        
        if text.contains("??") || text.contains("!!") {
            patterns.push(ErrorPattern {
                id: 3,
                pattern_name: "Informal Punctuation".to_string(),
                pattern_regex: r"(\?\?|!!)".to_string(),
                feedback_template: "Avoid using multiple punctuation marks in academic writing. Use single question marks or exclamation points.".to_string(),
                severity: "Low".to_string(),
                subject_area: None,
                grade_level: None,
            });
        }
        
        patterns
    }
    
    fn generate_personalized_feedback(&self, patterns: &[ErrorPattern], score: f32) -> String {
        if patterns.is_empty() {
            return if score >= 80.0 {
                "Excellent work! Your answer demonstrates strong understanding and clear communication.".to_string()
            } else if score >= 60.0 {
                "Good effort. Your answer shows understanding but could benefit from more detail or clearer organization.".to_string()
            } else {
                "Your answer needs improvement. Focus on providing more specific examples and clearer explanations.".to_string()
            };
        }
        
        let mut feedback = String::from("Here are some areas for improvement:\n");
        
        for pattern in patterns {
            feedback.push_str(&format!("• {}\n", pattern.feedback_template));
        }
        
        if score < 70.0 {
            feedback.push_str("\nConsider reviewing the material and trying again with more specific examples.");
        }
        
        feedback
    }
}

#[async_trait]
impl FeedbackServiceTrait for FeedbackService {
    async fn analyze_submission(&self, submission_id: i32, text: &str, score: f32) -> AppResult<FeedbackAnalysis> {
        let error_patterns = self.analyze_text(text);
        let overall_feedback = self.generate_personalized_feedback(&error_patterns, score);
        
        let suggestions = error_patterns
            .iter()
            .map(|p| format!("Address: {}", p.pattern_name))
            .collect();
        
        let confidence_score = if error_patterns.is_empty() { 0.9 } else { 0.7 };
        
        Ok(FeedbackAnalysis {
            submission_id,
            error_patterns_found: error_patterns,
            overall_feedback,
            suggestions,
            confidence_score,
        })
    }
    
    async fn get_error_patterns(&self, subject_area: Option<&str>, grade_level: Option<&str>) -> AppResult<Vec<ErrorPattern>> {
        // Mock implementation
        let patterns = vec![
            ErrorPattern {
                id: 1,
                pattern_name: "Hedging Language".to_string(),
                pattern_regex: "i think".to_string(),
                feedback_template: "Try to state your points more confidently.".to_string(),
                severity: "Low".to_string(),
                subject_area: subject_area.map(|s| s.to_string()),
                grade_level: grade_level.map(|g| g.to_string()),
            },
            ErrorPattern {
                id: 2,
                pattern_name: "Insufficient Detail".to_string(),
                pattern_regex: "short answer".to_string(),
                feedback_template: "Provide more examples or explanations.".to_string(),
                severity: "Medium".to_string(),
                subject_area: subject_area.map(|s| s.to_string()),
                grade_level: grade_level.map(|g| g.to_string()),
            },
            ErrorPattern {
                id: 3,
                pattern_name: "Informal Punctuation".to_string(),
                pattern_regex: r"(\?\?|!!)".to_string(),
                feedback_template: "Avoid multiple punctuation marks.".to_string(),
                severity: "Low".to_string(),
                subject_area: subject_area.map(|s| s.to_string()),
                grade_level: grade_level.map(|g| g.to_string()),
            },
        ];
        
        Ok(patterns)
    }
    
    async fn add_error_pattern(&self, pattern: ErrorPattern) -> AppResult<i32> {
        // Mock implementation
        Ok(pattern.id)
    }
}