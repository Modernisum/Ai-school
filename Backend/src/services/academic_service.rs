use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct PostgresAcademicService {
    pub repos: Arc<Repositories>,
    pub responsibility: Arc<dyn ResponsibilityService>,
}

#[async_trait]
impl AcademicService for PostgresAcademicService {
    async fn create_exam(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value> {
        let res = self.repos.academic.add_exam(school_id, data.clone()).await?;
        let exam_id = res["id"].as_i64().unwrap_or(0).to_string();
        let _ = self.repos.audit.log_action(school_id, admin_id, "EXAM", &exam_id, "CREATE", data).await;
        Ok(res)
    }

    async fn list_exams(&self, school_id: &str, student_id: String) -> AppResult<Vec<Value>> {
        let student_opt = if student_id.is_empty() { None } else { Some(student_id.as_str()) };
        Ok(self.repos.academic.get_exams(school_id, student_opt).await?)
    }

    async fn create_subject(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value> {
        // 1. Create Subject
        let res = self.repos.academic.add_subject(school_id, data.clone()).await?;
        let subject_id = if let Some(id) = res["id"].as_i64() { id.to_string() } else { res["id"].as_str().unwrap_or("0").to_string() };
        
        // 2. Automated Responsibility Creation (Follow User's Strict Validator)
        let subject_name = res["name"].as_str().or(res["subjectName"].as_str()).unwrap_or("Unknown Subject");
        let class_name = res["className"].as_str().unwrap_or("General");
        let class_id = res["classId"].as_str().unwrap_or("");
        
        // Get spaceIds (Room number from class)
        let mut space_ids = Vec::new();
        if !class_id.is_empty() {
             if let Ok(Some(cls)) = self.repos.academic.get_class(school_id, class_id).await {
                 if let Some(room) = cls["roomNumber"].as_str() {
                     if !room.is_empty() {
                         space_ids.push(room.to_string());
                     }
                 }
             }
        }

        let resp_payload = json!({
            "name": format!("{} - {}", subject_name, class_name),
            "description": format!("Teaching {} for {} sections", subject_name, class_name),
            "spaceCategory": "classroom",
            "employeeType": "teaching",
            "workLevel": "senior",
            "workAmount": 0.0,
            "workPeriod": "monthly",
            "spaceIds": space_ids,
            "studentFee": res["subjectFees"].as_f64().or(res["fees"].as_f64()).unwrap_or(0.0)
        });

        // Trigger the strict create_responsibility (it handles validation and audit internally)
        let _ = self.responsibility.create_responsibility(school_id, admin_id, resp_payload).await?;

        let _ = self.repos.audit.log_action(school_id, admin_id, "SUBJECT", &subject_id, "CREATE", data).await;
        Ok(res)
    }

    async fn list_subjects(&self, school_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.academic.get_subjects(school_id).await?)
    }

    async fn create_topic(&self, data: Value) -> AppResult<Value> {
        Ok(self.repos.academic.add_topic(data).await?)
    }
}
