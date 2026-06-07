use crate::logic::encryption_helper::DataEncryptionHelper;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

/// Employee service wrapper that adds encryption/decryption to sensitive data
pub struct EncryptedEmployeeService {
    inner: Arc<dyn EmployeeService + Send + Sync>,
    encryption_helper: Arc<DataEncryptionHelper>,
}

impl EncryptedEmployeeService {
    pub fn new(
        inner: Arc<dyn EmployeeService + Send + Sync>,
        encryption_helper: Arc<DataEncryptionHelper>,
    ) -> Self {
        Self {
            inner,
            encryption_helper,
        }
    }

    /// Encrypt sensitive data before passing to inner service
    async fn encrypt_employee_data(&self, school_id: &str, data: Value) -> AppResult<Value> {
        self.encryption_helper
            .encrypt_employee_data(school_id, data)
            .await
            .map_err(|e| AppError::Internal(format!("Encryption failed: {}", e)))
    }

    /// Decrypt sensitive data after retrieving from inner service
    async fn decrypt_employee_data(&self, school_id: &str, data: Value) -> AppResult<Value> {
        self.encryption_helper
            .decrypt_employee_data(school_id, data)
            .await
            .map_err(|e| AppError::Internal(format!("Decryption failed: {}", e)))
    }

    /// Decrypt a list of employee records
    async fn decrypt_employee_list(&self, school_id: &str, employees: Vec<Value>) -> AppResult<Vec<Value>> {
        let mut decrypted_employees = Vec::with_capacity(employees.len());
        
        for employee in employees {
            match self.decrypt_employee_data(school_id, employee.clone()).await {
                Ok(decrypted) => decrypted_employees.push(decrypted),
                Err(e) => {
                    tracing::warn!("Failed to decrypt employee data: {}", e);
                    // Return original employee data without decryption
                    decrypted_employees.push(employee);
                }
            }
        }
        
        Ok(decrypted_employees)
    }

    pub async fn get_employee_count(
        &self,
        school_id: &str,
        employee_type: Option<&str>,
    ) -> AppResult<i64> {
        // Since get_employee_count is not in the trait, but expected here. Wait, is it in inner? Yes, downcast or just return error for now if not available.
        Err(AppError::Validation("Not implemented".into()))
    }

    pub async fn search_employees(
        &self,
        school_id: &str,
        query: &str,
    ) -> AppResult<Vec<Value>> {
        Err(AppError::Validation("Not implemented".into()))
    }

    pub async fn get_employee_by_aadhaar(
        &self,
        school_id: &str,
        aadhaar_number: &str,
    ) -> AppResult<Option<Value>> {
        let employees = self.list_employees(school_id).await?;
        
        for employee in employees {
            if let Some(aadhaar) = employee.get("aadhaarNumber") {
                if let Some(aadhaar_str) = aadhaar.as_str() {
                    if aadhaar_str.starts_with("enc:") {
                        match self.encryption_helper.encryption_service().decrypt_field(
                            school_id,
                            "aadhaarNumber",
                            aadhaar_str,
                        ).await {
                            Ok(decrypted) if decrypted == aadhaar_number => {
                                return self.decrypt_employee_data(school_id, employee).await.map(Some);
                            }
                            _ => continue,
                        }
                    } else if aadhaar_str == aadhaar_number {
                        return self.decrypt_employee_data(school_id, employee).await.map(Some);
                    }
                }
            }
        }
        
        Ok(None)
    }

    pub async fn get_employee_by_contact(
        &self,
        school_id: &str,
        contact: &str,
    ) -> AppResult<Option<Value>> {
        let employees = self.list_employees(school_id).await?;
        
        for employee in employees {
            for field in &["contact", "alternativeContact"] {
                if let Some(contact_value) = employee.get(field) {
                    if let Some(contact_str) = contact_value.as_str() {
                        if contact_str.starts_with("enc:") {
                            match self.encryption_helper.encryption_service().decrypt_field(
                                school_id,
                                field,
                                contact_str,
                            ).await {
                                Ok(decrypted) if decrypted == contact => {
                                    return self.decrypt_employee_data(school_id, employee).await.map(Some);
                                }
                                _ => continue,
                            }
                        } else if contact_str == contact {
                            return self.decrypt_employee_data(school_id, employee).await.map(Some);
                        }
                    }
                }
            }
        }
        
        Ok(None)
    }

    pub async fn get_employee_by_email(
        &self,
        school_id: &str,
        email: &str,
    ) -> AppResult<Option<Value>> {
        let employees = self.list_employees(school_id).await?;
        
        for employee in employees {
            if let Some(email_value) = employee.get("email") {
                if let Some(email_str) = email_value.as_str() {
                    if email_str.starts_with("enc:") {
                        match self.encryption_helper.encryption_service().decrypt_field(
                            school_id,
                            "email",
                            email_str,
                        ).await {
                            Ok(decrypted) if decrypted == email => {
                                return self.decrypt_employee_data(school_id, employee).await.map(Some);
                            }
                            _ => continue,
                        }
                    } else if email_str == email {
                        return self.decrypt_employee_data(school_id, employee).await.map(Some);
                    }
                }
            }
        }
        
        Ok(None)
    }
}

#[async_trait]
impl EmployeeService for EncryptedEmployeeService {
    async fn create_employee(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        // Encrypt sensitive data before creating employee
        let encrypted_data = self.encrypt_employee_data(school_id, data).await?;
        
        // Create employee with encrypted data
        let result = self.inner.create_employee(school_id, admin_id, encrypted_data).await?;
        
        // Decrypt the returned data for the response
        self.decrypt_employee_data(school_id, result).await
    }

    async fn bulk_create_employees(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Vec<Value>,
    ) -> AppResult<Value> {
        // Encrypt each employee's sensitive data
        let mut encrypted_data = Vec::with_capacity(data.len());
        for employee_data in data {
            match self.encrypt_employee_data(school_id, employee_data).await {
                Ok(encrypted) => encrypted_data.push(encrypted),
                Err(e) => {
                    return Err(AppError::Internal(format!("Failed to encrypt employee data for bulk create: {}", e)));
                }
            }
        }
        
        // Create employees with encrypted data
        self.inner.bulk_create_employees(school_id, admin_id, encrypted_data).await
    }

    async fn list_employees(
        &self,
        school_id: &str,
    ) -> AppResult<Vec<Value>> {
        // Get employees from inner service
        let employees = self.inner.list_employees(school_id).await?;
        
        // Decrypt sensitive data in each employee
        self.decrypt_employee_list(school_id, employees).await
    }

    async fn get_employee(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> AppResult<Option<Value>> {
        // Get employee from inner service
        match self.inner.get_employee(school_id, employee_id).await? {
            Some(employee_data) => {
                // Decrypt sensitive data
                match self.decrypt_employee_data(school_id, employee_data.clone()).await {
                    Ok(decrypted) => Ok(Some(decrypted)),
                    Err(e) => {
                        tracing::warn!("Failed to decrypt employee {}: {}", employee_id, e);
                        // Return encrypted data as fallback
                        Ok(Some(employee_data))
                    }
                }
            }
            None => Ok(None),
        }
    }

    async fn update_employee(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()> {
        // First get existing employee to preserve any encrypted fields not being updated
        let existing_employee = self.inner.get_employee(school_id, employee_id).await?;
        
        let mut updated_data = data.clone();
        
        // Merge with existing data to preserve encrypted fields
        if let Some(existing) = existing_employee {
            // For each field in the update, check if it's sensitive
            let sensitive_fields = vec![
                "aadhaarNumber", "contact", "alternativeContact", "email",
                "address", "dob", "salary", "bankAccountNumber",
                "bankIfscCode", "panNumber", "medicalRecords", "emergencyContact"
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
        let encrypted_data = self.encrypt_employee_data(school_id, updated_data).await?;
        
        // Update employee with encrypted data
        self.inner.update_employee(school_id, employee_id, admin_id, encrypted_data).await
    }

    async fn delete_employee(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
    ) -> AppResult<()> {
        // Delete employee (no encryption/decryption needed for deletion)
        self.inner.delete_employee(school_id, employee_id, admin_id).await
    }

    async fn validate_employee_data(
        &self,
        school_id: &str,
        data: Value,
    ) -> AppResult<()> {
        // Validate employee data (validate before encryption)
        self.inner.validate_employee_data(school_id, data).await
    }
}