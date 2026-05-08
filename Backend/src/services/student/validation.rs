use crate::repository::Repositories;
use crate::services::traits::{AppError, AppResult};
use serde_json::Value;
use std::sync::Arc;

pub struct StudentValidation {
    pub repos: Arc<Repositories>,
}

impl StudentValidation {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn validate_student_data(&self, school_id: &str, data: Value) -> AppResult<()> {
        let exclude_sid = data["studentId"].as_str();

        // 1. Aadhaar Uniqueness (Cross Student & Employee)
        if let Some(aadhaar) = data["aadhaarNumber"].as_str() {
            if !aadhaar.trim().is_empty()
                && self.repos.student.check_aadhaar_exists(school_id, aadhaar, exclude_sid, None).await?
            {
                return Err(AppError::Validation("Aadhaar Number already exists for another student or staff member in this or another school".to_string()));
            }
        }

        // 2. Phone Limit (Max 3 students)
        if let Some(phone) = data["contact"].as_str() {
            if !phone.trim().is_empty() {
                let count = self.repos.student.count_phone_usage(school_id, phone, exclude_sid, None).await?;
                if count >= 3 {
                    return Err(AppError::Validation("This Contact Number is already used by 3 or more student accounts".to_string()));
                }
            }
        }

        // 3. Email Limit (Max 3 students)
        if let Some(email) = data["email"].as_str() {
            if !email.trim().is_empty() {
                let count = self.repos.student.count_email_usage(school_id, email, exclude_sid, None).await?;
                if count >= 3 {
                    return Err(AppError::Validation("This Email Address is already used by 3 or more student accounts".to_string()));
                }
            }
        }

        Ok(())
    }
}
