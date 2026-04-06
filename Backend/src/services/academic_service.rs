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
    async fn create_class(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self
            .repos
            .academic
            .add_class(school_id, data.clone())
            .await?;
        
        let class_id = data["id"].as_str().or(data["classId"].as_str()).unwrap_or("");
        
        // Audit Log
        self.repos.audit.log_action(
            school_id,
            admin_id,
            "CLASS",
            class_id,
            "CREATE",
            data.clone()
        ).await.ok();

        if !class_id.is_empty() {
            self.recompute_class_aggregates(school_id, class_id).await?;
        }
        Ok(res)
    }

    async fn list_classes(
        &self,
        school_id: &str,
    ) -> AppResult<Vec<Value>> {
        self.repos.academic.get_classes(school_id).await.map_err(AppError::from)
    }

    async fn update_class(
        &self,
        school_id: &str,
        class_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()> {
        let old_class = self.repos.academic.get_class(school_id, class_id).await?
            .ok_or_else(|| AppError::NotFound("Class not found".to_string()))?;

        self.repos
            .academic
            .update_class(school_id, class_id, data.clone())
            .await?;
        
        let delta = self.calculate_delta(&old_class, &data);
        if !delta.as_object().map(|o| o.is_empty()).unwrap_or(true) {
            self.repos.audit.log_action(
                school_id,
                admin_id,
                "CLASS",
                class_id,
                "UPDATE",
                delta
            ).await.ok();
        }

        self.recompute_class_aggregates(school_id, class_id).await?;
        Ok(())
    }

    async fn delete_class(
        &self,
        school_id: &str,
        admin_id: &str,
        class_id: &str,
    ) -> AppResult<()> {
        let class = self.repos.academic.get_class(school_id, class_id).await?
            .ok_or_else(|| AppError::NotFound("Class not found".to_string()))?;

        self.repos.academic.delete_class(school_id, class_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "CLASS",
            class_id,
            "DELETE",
            class
        ).await;

        Ok(())
    }

    async fn generate_timetable(&self, _school_id: &str, _class_name: &str) -> AppResult<Value> {
        // Implementation placeholder for the trait requirement
        Ok(json!({"status": "not_implemented"}))
    }

    async fn auto_generate_classes(&self, school_id: &str, admin_id: &str) -> AppResult<()> {
        // Assume empty/noop for now or implement as needed.
        let _ = self.repos.audit.log_action(school_id, admin_id, "CLASS", "AUTO_GENERATE", "CREATE", json!({})).await;
        Ok(())
    }

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

impl PostgresAcademicService {
    async fn recompute_class_aggregates(
        &self,
        school_id: &str,
        class_id: &str,
    ) -> AppResult<()> {
        let class = self
            .repos
            .academic
            .get_class(school_id, class_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Class not found".to_string()))?;
        let class_name = class["name"].as_str().unwrap_or("");

        let student_count = self
            .repos
            .academic
            .get_class_students_count(school_id, class_name)
            .await?;
        let period_count = self
            .repos
            .academic
            .get_periods_count(school_id, class_id)
            .await?;

        // Teachers count (from class_teachers)
        let teacher_count = self.get_class_teachers_count(school_id, class_id).await?;

        // Class Fees - Sum of subject fees for this class
        let subjects = self.repos.academic.get_subjects(school_id).await?;
        let class_fees: f64 = subjects
            .iter()
            .filter(|s| {
                s["className"].as_str() == Some(class_name)
                    || s["classId"].as_str() == Some(class_id)
            })
            .filter_map(|s| s["fees"].as_f64())
            .sum();

        let aggregates = json!({
            "totalStudents": student_count,
            "totalTeachers": teacher_count,
            "totalPeriods": period_count,
            "classFees": class_fees
        });

        self.repos
            .academic
            .update_class_aggregates(school_id, class_id, aggregates)
            .await?;
        Ok(())
    }

    fn calculate_delta(&self, old: &Value, new: &Value) -> Value {
        let mut delta = json!({});
        if let (Some(old_obj), Some(new_obj)) = (old.as_object(), new.as_object()) {
            for (key, new_val) in new_obj {
                if key == "updatedAt" || key == "updated_at" || key == "createdAt" || key == "created_at" {
                    continue;
                }
                if let Some(old_val) = old_obj.get(key) {
                    if old_val != new_val {
                        delta[key] = json!({
                            "old": old_val.clone(),
                            "new": new_val.clone()
                        });
                    }
                } else {
                    delta[key] = json!({
                        "old": null,
                        "new": new_val.clone()
                    });
                }
            }
        }
        delta
    }

    #[allow(unused_variables)]
    async fn get_class_teachers_count(
        &self,
        school_id: &str,
        class_id: &str,
    ) -> AppResult<i64> {
        // Implementation for teacher count parity
        Ok(0) // Simplified for now
    }
}
