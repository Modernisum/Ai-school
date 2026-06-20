use serde_json::Value;
use std::sync::Arc;
use crate::repository::traits::StudentRepository;
use crate::services::traits::{AppError, AppResult};

pub async fn validate_identity(
    student_repo: &Arc<dyn StudentRepository + Send + Sync>,
    school_id: &str,
    data: &Value,
    exclude_student: Option<&str>,
    exclude_employee: Option<&str>,
) -> AppResult<()> {
    if let Some(aadhaar) = data["aadhaarNumber"].as_str() {
        if !aadhaar.trim().is_empty()
            && student_repo.check_aadhaar_exists(school_id, aadhaar, exclude_student, exclude_employee).await?
        {
            return Err(AppError::Validation(
                "Aadhaar Number already exists for another student or staff member in this or another school".to_string(),
            ));
        }
    }

    if let Some(phone) = data["contact"].as_str() {
        if !phone.trim().is_empty() {
            let count = student_repo.count_phone_usage(school_id, phone, exclude_student, exclude_employee).await?;
            if count >= 3 {
                return Err(AppError::Validation(
                    "This Contact Number is already used by 3 or more student accounts".to_string(),
                ));
            }
        }
    }

    if let Some(email) = data["email"].as_str() {
        if !email.trim().is_empty() {
            let count = student_repo.count_email_usage(school_id, email, exclude_student, exclude_employee).await?;
            if count >= 3 {
                return Err(AppError::Validation(
                    "This Email Address is already used by 3 or more student accounts".to_string(),
                ));
            }
        }
    }

    Ok(())
}
