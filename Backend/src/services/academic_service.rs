use crate::repository::Repositories;
use crate::services::traits::*;
use crate::services::academic_utils;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::error::Error;
use std::sync::Arc;

pub struct PostgresAcademicService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl AcademicService for PostgresAcademicService {
    async fn create_class(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
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
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.academic.get_classes(school_id).await
    }

    async fn update_class(
        &self,
        school_id: &str,
        class_id: &str,
        admin_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let old_class = self.repos.academic.get_class(school_id, class_id).await?
            .ok_or("Class not found")?;

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

    async fn add_stream(
        &self,
        school_id: &str,
        class_id: &str,
        admin_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos
            .academic
            .add_stream(school_id, class_id, data.clone())
            .await?;

        // Audit Log
        self.repos.audit.log_action(
            school_id,
            admin_id,
            "CLASS_STREAM",
            class_id,
            "ADD_STREAM",
            data.clone()
        ).await.ok();

        self.recompute_class_aggregates(school_id, class_id).await?;
        Ok(data)
    }

    async fn add_period(
        &self,
        school_id: &str,
        class_id: &str,
        admin_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos
            .academic
            .add_period(school_id, class_id, data.clone())
            .await?;

        // Audit Log
        self.repos.audit.log_action(
            school_id,
            admin_id,
            "CLASS_PERIOD",
            class_id,
            "ADD_PERIOD",
            data
        ).await.ok();

        self.recompute_class_aggregates(school_id, class_id).await?;
        Ok(())
    }

    async fn create_subject(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let res = self
            .repos
            .academic
            .add_subject(school_id, data.clone())
            .await?;
        
        let subject_id = res["id"].as_str().or(res["subjectId"].as_str()).unwrap_or("");

        // Audit Log
        self.repos.audit.log_action(
            school_id,
            admin_id,
            "SUBJECT",
            subject_id,
            "CREATE",
            data.clone()
        ).await.ok();

        let class_id = data["classId"].as_str().unwrap_or("");
        if !class_id.is_empty() {
            self.recompute_class_aggregates(school_id, class_id).await?;
        }
        Ok(res)
    }

    async fn list_subjects(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.academic.get_subjects(school_id).await
    }

    async fn create_exam(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let res = self.repos.academic.add_exam(school_id, data.clone()).await?;
        
        let exam_id = res["id"].as_str().or(res["exam_id"].as_str()).unwrap_or("");

        // Audit Log
        self.repos.audit.log_action(
            school_id,
            admin_id,
            "EXAM",
            exam_id,
            "CREATE",
            data
        ).await.ok();

        Ok(res)
    }

    async fn list_exams(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.academic.get_exams(school_id, student_id).await
    }

    async fn create_topic(&self, data: Value) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.academic.add_topic(data).await
    }

    async fn list_topics(&self) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.academic.get_topics().await
    }


    async fn delete_class(
        &self,
        school_id: &str,
        admin_id: &str,
        class_id: &str,
    ) -> Result<(), AppError> {
        let class = self.repos.academic.get_class(school_id, class_id).await?
            .ok_or("Class not found")?;

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

    async fn delete_subject(
        &self,
        school_id: &str,
        admin_id: &str,
        subject_id: &str,
    ) -> Result<(), AppError> {
        let subject = self.repos.academic.get_subject(school_id, subject_id).await?
            .ok_or("Subject not found")?;
        let class_id = subject["classId"].as_str().unwrap_or("").to_string();

        self.repos.academic.delete_subject(school_id, subject_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SUBJECT",
            subject_id,
            "DELETE",
            subject
        ).await;

        if !class_id.is_empty() {
            self.recompute_class_aggregates(school_id, &class_id).await?;
        }

        Ok(())
    }

    async fn delete_exam(
        &self,
        school_id: &str,
        admin_id: &str,
        exam_id: &str,
    ) -> Result<(), AppError> {
        let exam = self.repos.academic.get_exam(school_id, exam_id).await?
            .ok_or("Exam not found")?;

        self.repos.academic.delete_exam(school_id, exam_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "EXAM",
            exam_id,
            "DELETE",
            exam
        ).await;

        Ok(())
    }

    async fn auto_generate_classes(
        &self,
        school_id: &str,
        admin_id: &str,
        start_level: i32,
        end_level: i32,
    ) -> Result<(), AppError> {
        let class_names = academic_utils::generate_classes(start_level, end_level);
        let subjects_map = academic_utils::get_subjects_map();
        let default_mats = academic_utils::get_default_materials();

        for class_name in class_names {
            // 1. Create Class
            let class_data = json!({
                "name": class_name,
                "sections": academic_utils::generate_sections(0),
                "monthlyFee": academic_utils::calculate_fee(&class_name)
            });
            
            let class_res = self.repos.academic.add_class(school_id, class_data.clone()).await?;
            let class_id = class_res["id"].as_str().or(class_res["classId"].as_str()).unwrap_or("");
            let item_id = class_name.to_lowercase().replace(' ', "-");

            // Audit Log
            let _ = self.repos.audit.log_action(
                school_id,
                admin_id,
                "CLASS_AUTO",
                class_id,
                "CREATE",
                class_data
            ).await;

            // 2. Create Subjects
            if let Some(subjects) = subjects_map.get(class_name.as_str()) {
                for subj_name in subjects {
                    let subj_data = json!({
                        "name": subj_name,
                        "classId": class_id,
                        "className": class_name,
                        "fees": 0,
                    });
                    let _ = self.repos.academic.add_subject(school_id, subj_data).await?;
                }
            }

            // 3. Create Infrastructure (Space & Materials)
            // 3.1 Ensure "classroom" space exists
            let _ = self.repos.resource.add_space(school_id, json!({"id": "classroom", "name": "classroom"})).await;
            
            // 3.2 Add the class as an item in classroom space
            let _ = self.repos.resource.add_item(school_id, "classroom", json!({
                "id": item_id,
                "itemName": class_name,
                "roomNumber": class_name,
                "classId": Some(class_id)
            })).await;

            // 3.3 Add default materials for classroom
            if let Some(mats) = default_mats.get("classroom") {
                for mat in mats {
                    let material_name = mat["materialName"].as_str().unwrap();
                    let material_id = material_name.to_lowercase();
                    let _ = self.repos.resource.add_material(school_id, mat.clone()).await;
                    let _ = self.repos.resource.add_material_location(
                        school_id,
                        &material_id,
                        "classroom",
                        &item_id,
                        mat["quantity"].as_i64().unwrap() as i32
                    ).await;
                }
            }
        }
        Ok(())
    }
}

impl PostgresAcademicService {
    async fn recompute_class_aggregates(
        &self,
        school_id: &str,
        class_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let class = self
            .repos
            .academic
            .get_class(school_id, class_id)
            .await?
            .ok_or("Class not found")?;
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
    ) -> Result<i64, Box<dyn Error + Send + Sync>> {
        // Implementation for teacher count parity
        Ok(0) // Simplified for now
    }
}
