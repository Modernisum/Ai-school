use crate::logic::encryption_middleware::DataEncryptionMiddleware;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

/// Student service wrapper that adds encryption/decryption to sensitive data
pub struct EncryptedStudentService {
    inner: Arc<dyn StudentService + Send + Sync>,
    encryption_middleware: Arc<DataEncryptionMiddleware>,
}

impl EncryptedStudentService {
    pub fn new(
        inner: Arc<dyn StudentService + Send + Sync>,
        encryption_middleware: Arc<DataEncryptionMiddleware>,
    ) -> Self {
        Self {
            inner,
            encryption_middleware,
        }
    }

    /// Encrypt sensitive data before passing to inner service
    async fn encrypt_student_data(&self, school_id: &str, data: Value) -> AppResult<Value> {
        self.encryption_middleware
            .encrypt_student_data(school_id, data)
            .await
            .map_err(|e| AppError::Internal(format!("Encryption failed: {}", e)))
    }

    /// Decrypt sensitive data after retrieving from inner service
    async fn decrypt_student_data(&self, school_id: &str, data: Value) -> AppResult<Value> {
        self.encryption_middleware
            .decrypt_student_data(school_id, data)
            .await
            .map_err(|e| AppError::Internal(format!("Decryption failed: {}", e)))
    }

    /// Decrypt a list of student records
    async fn decrypt_student_list(&self, school_id: &str, students: Vec<Value>) -> AppResult<Vec<Value>> {
        let mut decrypted_students = Vec::with_capacity(students.len());
        
        for student in students {
            match self.decrypt_student_data(school_id, student.clone()).await {
                Ok(decrypted) => decrypted_students.push(decrypted),
                Err(e) => {
                    tracing::warn!("Failed to decrypt student data: {}", e);
                    // Return original student data without decryption
                    decrypted_students.push(student);
                }
            }
        }
        
        Ok(decrypted_students)
    }

    pub async fn get_student_count(
        &self,
        school_id: &str,
    ) -> AppResult<i64> {
        Err(AppError::Validation("Not implemented".into()))
    }

    pub async fn search_students(
        &self,
        school_id: &str,
        query: &str,
    ) -> AppResult<Vec<Value>> {
        Err(AppError::Validation("Not implemented".into()))
    }

    pub async fn get_student_by_aadhaar(
        &self,
        school_id: &str,
        aadhaar_number: &str,
    ) -> AppResult<Option<Value>> {
        let students = self.list_students(school_id).await?;
        
        for student in students {
            if let Some(aadhaar) = student.get("aadhaarNumber") {
                if let Some(aadhaar_str) = aadhaar.as_str() {
                    if aadhaar_str.starts_with("enc:") {
                        match self.encryption_middleware.encryption_service().decrypt_field(
                            school_id,
                            "aadhaarNumber",
                            aadhaar_str,
                        ).await {
                            Ok(decrypted) if decrypted == aadhaar_number => {
                                return self.decrypt_student_data(school_id, student).await.map(Some);
                            }
                            _ => continue,
                        }
                    } else if aadhaar_str == aadhaar_number {
                        return self.decrypt_student_data(school_id, student).await.map(Some);
                    }
                }
            }
        }
        
        Ok(None)
    }

    pub async fn get_student_by_contact(
        &self,
        school_id: &str,
        contact: &str,
    ) -> AppResult<Option<Value>> {
        let students = self.list_students(school_id).await?;
        
        for student in students {
            for field in &["contact", "alternativeContact"] {
                if let Some(contact_value) = student.get(field) {
                    if let Some(contact_str) = contact_value.as_str() {
                        if contact_str.starts_with("enc:") {
                            match self.encryption_middleware.encryption_service().decrypt_field(
                                school_id,
                                field,
                                contact_str,
                            ).await {
                                Ok(decrypted) if decrypted == contact => {
                                    return self.decrypt_student_data(school_id, student).await.map(Some);
                                }
                                _ => continue,
                            }
                        } else if contact_str == contact {
                            return self.decrypt_student_data(school_id, student).await.map(Some);
                        }
                    }
                }
            }
        }
        
        Ok(None)
    }
}

#[async_trait]
impl StudentService for EncryptedStudentService {
    async fn create_student(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        // Encrypt sensitive data before creating student
        let encrypted_data = self.encrypt_student_data(school_id, data).await?;
        
        // Create student with encrypted data
        let result = self.inner.create_student(school_id, admin_id, encrypted_data).await?;
        
        // Decrypt the returned data for the response
        self.decrypt_student_data(school_id, result).await
    }

    async fn bulk_create_students(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Vec<Value>,
    ) -> AppResult<Value> {
        // Encrypt each student's sensitive data
        let mut encrypted_data = Vec::with_capacity(data.len());
        for student_data in data {
            match self.encrypt_student_data(school_id, student_data).await {
                Ok(encrypted) => encrypted_data.push(encrypted),
                Err(e) => {
                    return Err(AppError::Internal(format!("Failed to encrypt student data for bulk create: {}", e)));
                }
            }
        }
        
        // Create students with encrypted data
        self.inner.bulk_create_students(school_id, admin_id, encrypted_data).await
    }

    async fn list_students(
        &self,
        school_id: &str,
    ) -> AppResult<Vec<Value>> {
        // Get students from inner service
        let students = self.inner.list_students(school_id).await?;
        
        // Decrypt sensitive data in each student
        self.decrypt_student_list(school_id, students).await
    }

    async fn list_students_by_class(
        &self,
        school_id: &str,
        class_name: &str,
        section: Option<&str>,
    ) -> AppResult<Vec<Value>> {
        // Get students from inner service
        let students = self.inner.list_students_by_class(school_id, class_name, section).await?;
        
        // Decrypt sensitive data in each student
        self.decrypt_student_list(school_id, students).await
    }

    async fn get_student(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> AppResult<Option<Value>> {
        // Get student from inner service
        match self.inner.get_student(school_id, student_id).await? {
            Some(student_data) => {
                // Decrypt sensitive data
                match self.decrypt_student_data(school_id, student_data.clone()).await {
                    Ok(decrypted) => Ok(Some(decrypted)),
                    Err(e) => {
                        tracing::warn!("Failed to decrypt student {}: {}", student_id, e);
                        // Return encrypted data as fallback
                        Ok(Some(student_data))
                    }
                }
            }
            None => Ok(None),
        }
    }

    async fn update_student(
        &self,
        school_id: &str,
        student_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()> {
        // First get existing student to preserve any encrypted fields not being updated
        let existing_student = self.inner.get_student(school_id, student_id).await?;
        
        let mut updated_data = data.clone();
        
        // Merge with existing data to preserve encrypted fields
        if let Some(existing) = existing_student {
            // For each field in the update, check if it's sensitive
            let sensitive_fields = vec![
                "aadhaarNumber", "contact", "alternativeContact", "email",
                "fatherName", "motherName", "addressLine1", "addressCity",
                "addressState", "addressPincode", "dob", "medicalRecords", "tcNumber"
            ];
            
            for field in sensitive_fields {
                // If field is not being updated, preserve existing value (which might be encrypted)
                if data.get(field).is_none() {
                    if let Some(existing_value) = existing.get(field) {
                        updated_data[field] = existing_value.clone();
                    }
                }
            }
        }
        
        // Encrypt any sensitive fields being updated
        let encrypted_data = self.encrypt_student_data(school_id, updated_data).await?;
        
        // Update student with encrypted data
        self.inner.update_student(school_id, student_id, admin_id, encrypted_data).await
    }

    async fn list_students_paginated(
        &self,
        school_id: &str,
        _page: i32,
        _limit: i32,
        _class_name: Option<&str>,
        _section: Option<&str>,
        _status: Option<&str>,
        _search: Option<&str>,
    ) -> AppResult<(Vec<Value>, i64)> {
        // Fallback to non-paginated or implement specifically
        let results = self.list_students(school_id).await?;
        let count = results.len() as i64;
        Ok((results, count))
    }

    async fn delete_student(
        &self,
        school_id: &str,
        student_id: &str,
        admin_id: &str,
    ) -> AppResult<()> {
        // Delete student (no encryption/decryption needed for deletion)
        self.inner.delete_student(school_id, student_id, admin_id).await
    }

    async fn resequence_roll_numbers(
        &self,
        school_id: &str,
        class_name: &str,
    ) -> AppResult<()> {
        // Resequence roll numbers (no sensitive data involved)
        self.inner.resequence_roll_numbers(school_id, class_name).await
    }

    async fn list_student_ids(
        &self,
        school_id: &str,
    ) -> AppResult<Vec<String>> {
        // List student IDs (no sensitive data)
        self.inner.list_student_ids(school_id).await
    }

    async fn validate_student_data(
        &self,
        school_id: &str,
        data: Value,
    ) -> AppResult<()> {
        // Validate student data (validate before encryption)
        self.inner.validate_student_data(school_id, data).await
    }
}