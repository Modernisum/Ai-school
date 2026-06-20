use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::repository::Repositories;
use crate::services::traits::gradebook::{GradebookServiceTrait, GradebookEntry, StudentGradebook, GradebookSyncLog};

pub struct GradebookService {
    repos: Arc<Repositories>,
}

impl GradebookService {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }
    
    fn calculate_letter_grade(&self, percentage: f32) -> String {
        match percentage {
            p if p >= 90.0 => "A+".to_string(),
            p if p >= 85.0 => "A".to_string(),
            p if p >= 80.0 => "A-".to_string(),
            p if p >= 75.0 => "B+".to_string(),
            p if p >= 70.0 => "B".to_string(),
            p if p >= 65.0 => "B-".to_string(),
            p if p >= 60.0 => "C+".to_string(),
            p if p >= 55.0 => "C".to_string(),
            p if p >= 50.0 => "C-".to_string(),
            p if p >= 45.0 => "D".to_string(),
            _ => "F".to_string(),
        }
    }
    
    fn calculate_overall_average(&self, entries: &[GradebookEntry]) -> f32 {
        if entries.is_empty() {
            return 0.0;
        }
        
        let total_percentage: f32 = entries.iter().map(|e| e.percentage).sum();
        total_percentage / entries.len() as f32
    }
}

#[async_trait]
impl GradebookServiceTrait for GradebookService {
    async fn sync_grading_to_gradebook(&self, grading_result_id: i32) -> crate::error::AppResult<GradebookEntry> {
        // Mock implementation - in production, this would:
        // 1. Fetch the grading result
        // 2. Create or update gradebook entry
        // 3. Sync with external systems if configured
        
        let mock_entry = GradebookEntry {
            id: 1001,
            student_id: 501,
            assignment_id: 201,
            grade: 85.0,
            max_grade: 100.0,
            percentage: 85.0,
            letter_grade: "A".to_string(),
            feedback: Some("Good work on the assignment. Your analysis was thorough.".to_string()),
            published: true,
            published_at: Some(chrono::Utc::now()),
            synced_with_external: true,
            external_system_id: Some("EXT-2023-001".to_string()),
        };
        
        Ok(mock_entry)
    }
    
    async fn get_student_gradebook(&self, student_id: i32, term: Option<&str>) -> crate::error::AppResult<StudentGradebook> {
        // Mock implementation
        let entries = vec![
            GradebookEntry {
                id: 1001,
                student_id,
                assignment_id: 201,
                grade: 85.0,
                max_grade: 100.0,
                percentage: 85.0,
                letter_grade: "A".to_string(),
                feedback: Some("Good work".to_string()),
                published: true,
                published_at: Some(chrono::Utc::now()),
                synced_with_external: true,
                external_system_id: Some("EXT-001".to_string()),
            },
            GradebookEntry {
                id: 1002,
                student_id,
                assignment_id: 202,
                grade: 92.0,
                max_grade: 100.0,
                percentage: 92.0,
                letter_grade: "A+".to_string(),
                feedback: Some("Excellent work".to_string()),
                published: true,
                published_at: Some(chrono::Utc::now()),
                synced_with_external: true,
                external_system_id: Some("EXT-002".to_string()),
            },
            GradebookEntry {
                id: 1003,
                student_id,
                assignment_id: 203,
                grade: 78.0,
                max_grade: 100.0,
                percentage: 78.0,
                letter_grade: "B+".to_string(),
                feedback: Some("Good effort".to_string()),
                published: false,
                published_at: None,
                synced_with_external: false,
                external_system_id: None,
            },
        ];
        
        let overall_average = self.calculate_overall_average(&entries);
        let overall_letter_grade = self.calculate_letter_grade(overall_average);
        
        Ok(StudentGradebook {
            student_id,
            student_name: "John Doe".to_string(),
            class_id: 10,
            term: term.unwrap_or("2023-24 Term 1").to_string(),
            entries,
            overall_average,
            overall_letter_grade,
            rank_in_class: Some(5),
        })
    }
    
    async fn publish_grades(&self, assignment_id: i32) -> crate::error::AppResult<i32> {
        // Mock implementation - returns number of grades published
        Ok(25)
    }
    
    async fn batch_sync_grades(&self, assignment_ids: Vec<i32>) -> crate::error::AppResult<GradebookSyncLog> {
        // Mock implementation
        let sync_log = GradebookSyncLog {
            id: 5001,
            sync_type: "batch".to_string(),
            records_synced: assignment_ids.len() as i32 * 25, // Assuming 25 students per assignment
            success_count: assignment_ids.len() as i32 * 24,
            failure_count: assignment_ids.len() as i32,
            sync_started_at: chrono::Utc::now(),
            sync_completed_at: Some(chrono::Utc::now()),
            status: "completed".to_string(),
            error_message: Some("3 records failed to sync due to network issues".to_string()),
        };
        
        Ok(sync_log)
    }
    
    async fn export_gradebook(&self, class_id: i32, term: &str, format: &str) -> crate::error::AppResult<Vec<u8>> {
        // Mock implementation - returns CSV data
        let csv_data = "Student ID,Student Name,Assignment 1,Assignment 2,Assignment 3,Overall Grade\n501,John Doe,85,92,78,A\n502,Jane Smith,88,95,82,A\n".to_string();
        
        Ok(csv_data.into_bytes())
    }
    
    async fn get_sync_logs(&self, limit: i32) -> crate::error::AppResult<Vec<GradebookSyncLog>> {
        // Mock implementation
        let logs = vec![
            GradebookSyncLog {
                id: 5001,
                sync_type: "batch".to_string(),
                records_synced: 75,
                success_count: 72,
                failure_count: 3,
                sync_started_at: chrono::Utc::now() - chrono::Duration::hours(2),
                sync_completed_at: Some(chrono::Utc::now() - chrono::Duration::hours(1)),
                status: "completed".to_string(),
                error_message: Some("Network timeout".to_string()),
            },
            GradebookSyncLog {
                id: 5002,
                sync_type: "manual".to_string(),
                records_synced: 1,
                success_count: 1,
                failure_count: 0,
                sync_started_at: chrono::Utc::now() - chrono::Duration::hours(3),
                sync_completed_at: Some(chrono::Utc::now() - chrono::Duration::hours(3)),
                status: "completed".to_string(),
                error_message: None,
            },
        ];
        
        Ok(logs.into_iter().take(limit as usize).collect())
    }
}