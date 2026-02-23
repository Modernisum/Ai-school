use crate::repository::traits::*;
use crate::repository::Repositories;
use crate::services::traits::*;
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
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let res = self
            .repos
            .academic
            .add_class(school_id, data.clone())
            .await?;
        let class_id = data["id"].as_str().unwrap_or("");
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
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos
            .academic
            .update_class(school_id, class_id, data)
            .await?;
        self.recompute_class_aggregates(school_id, class_id).await?;
        Ok(())
    }

    async fn add_stream(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos
            .academic
            .add_stream(school_id, class_id, data.clone())
            .await?;
        self.recompute_class_aggregates(school_id, class_id).await?;
        Ok(data)
    }

    async fn add_period(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos
            .academic
            .add_period(school_id, class_id, data)
            .await?;
        self.recompute_class_aggregates(school_id, class_id).await?;
        Ok(())
    }

    async fn create_subject(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let res = self
            .repos
            .academic
            .add_subject(school_id, data.clone())
            .await?;
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
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.academic.add_exam(school_id, data).await
    }

    async fn list_exams(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.academic.get_exams(school_id).await
    }

    async fn create_topic(&self, data: Value) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.academic.add_topic(data).await
    }

    async fn list_topics(&self) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.academic.get_topics().await
    }

    async fn list_class_ids(
        &self,
        school_id: &str,
    ) -> Result<Vec<String>, Box<dyn Error + Send + Sync>> {
        let classes = self.repos.academic.get_classes(school_id).await?;
        let ids = classes
            .into_iter()
            .filter_map(|c| c["id"].as_str().map(|id| id.to_string()))
            .collect();
        Ok(ids)
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

    async fn get_class_teachers_count(
        &self,
        school_id: &str,
        class_id: &str,
    ) -> Result<i64, Box<dyn Error + Send + Sync>> {
        // Implementation for teacher count parity
        Ok(0) // Simplified for now
    }
}
