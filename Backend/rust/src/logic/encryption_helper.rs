use crate::logic::encryption_service::{AesGcmEncryptionService, DataClassification, EncryptionService};
use serde_json::{json, Value};
use std::sync::Arc;

/// Helper for encrypting/decrypting sensitive data in student and employee records
pub struct DataEncryptionHelper {
    encryption_service: Arc<AesGcmEncryptionService>,
}

impl DataEncryptionHelper {
    pub fn new(encryption_service: Arc<AesGcmEncryptionService>) -> Self {
        Self { encryption_service }
    }

    /// Get a reference to the encryption service
    pub fn encryption_service(&self) -> &Arc<AesGcmEncryptionService> {
        &self.encryption_service
    }

    /// Encrypt sensitive fields in student data before storage
    pub async fn encrypt_student_data(&self, school_id: &str, mut student_data: Value) -> Result<Value, String> {
        // Define sensitive fields for students
        let sensitive_fields = vec![
            ("aadhaarNumber", DataClassification::HighlyRestricted),
            ("contact", DataClassification::Restricted),
            ("alternativeContact", DataClassification::Restricted),
            ("email", DataClassification::Confidential),
            ("fatherName", DataClassification::Confidential),
            ("motherName", DataClassification::Confidential),
            ("addressLine1", DataClassification::Confidential),
            ("addressCity", DataClassification::Confidential),
            ("addressState", DataClassification::Confidential),
            ("addressPincode", DataClassification::Confidential),
            ("dob", DataClassification::Confidential),
            ("medicalRecords", DataClassification::HighlyRestricted),
            ("tcNumber", DataClassification::Confidential),
        ];

        for (field_name, classification) in sensitive_fields {
            if let Some(field_value) = student_data.get(field_name) {
                if let Some(value_str) = field_value.as_str() {
                    if !value_str.is_empty() {
                        match self.encryption_service.encrypt_field(
                            school_id,
                            field_name,
                            value_str,
                            classification,
                        ).await {
                            Ok(encrypted) => {
                                student_data[field_name] = json!(encrypted);
                            }
                            Err(e) => {
                                tracing::warn!("Failed to encrypt field {}: {}", field_name, e);
                                // Continue without encryption for this field
                            }
                        }
                    }
                }
            }
        }

        Ok(student_data)
    }

    /// Decrypt sensitive fields in student data after retrieval
    pub async fn decrypt_student_data(&self, school_id: &str, mut student_data: Value) -> Result<Value, String> {
        // Define sensitive fields for students
        let sensitive_fields = vec![
            "aadhaarNumber",
            "contact",
            "alternativeContact",
            "email",
            "fatherName",
            "motherName",
            "addressLine1",
            "addressCity",
            "addressState",
            "addressPincode",
            "dob",
            "medicalRecords",
            "tcNumber",
        ];

        for field_name in sensitive_fields {
            if let Some(field_value) = student_data.get(field_name) {
                if let Some(value_str) = field_value.as_str() {
                    if !value_str.is_empty() && value_str.starts_with("enc:") {
                        match self.encryption_service.decrypt_field(
                            school_id,
                            field_name,
                            value_str,
                        ).await {
                            Ok(decrypted) => {
                                student_data[field_name] = json!(decrypted);
                            }
                            Err(e) => {
                                tracing::warn!("Failed to decrypt field {}: {}", field_name, e);
                                // Keep encrypted value
                            }
                        }
                    }
                }
            }
        }

        Ok(student_data)
    }

    /// Encrypt sensitive fields in employee data before storage
    pub async fn encrypt_employee_data(&self, school_id: &str, mut employee_data: Value) -> Result<Value, String> {
        // Define sensitive fields for employees
        let sensitive_fields = vec![
            ("aadhaarNumber", DataClassification::HighlyRestricted),
            ("contact", DataClassification::Restricted),
            ("alternativeContact", DataClassification::Restricted),
            ("email", DataClassification::Confidential),
            ("address", DataClassification::Confidential),
            ("dob", DataClassification::Confidential),
            ("salary", DataClassification::Restricted),
            ("bankAccountNumber", DataClassification::HighlyRestricted),
            ("bankIfscCode", DataClassification::Restricted),
            ("panNumber", DataClassification::Restricted),
            ("medicalRecords", DataClassification::HighlyRestricted),
            ("emergencyContact", DataClassification::Confidential),
        ];

        for (field_name, classification) in sensitive_fields {
            if let Some(field_value) = employee_data.get(field_name) {
                if field_value.is_string() {
                    if let Some(value_str) = field_value.as_str() {
                        if !value_str.is_empty() {
                            match self.encryption_service.encrypt_field(
                                school_id,
                                field_name,
                                value_str,
                                classification,
                            ).await {
                                Ok(encrypted) => {
                                    employee_data[field_name] = json!(encrypted);
                                }
                                Err(e) => {
                                    tracing::warn!("Failed to encrypt field {}: {}", field_name, e);
                                    // Continue without encryption for this field
                                }
                            }
                        }
                    }
                } else if field_value.is_number() && field_name == "salary" {
                    // Encrypt salary as string
                    let salary_str = field_value.to_string();
                    match self.encryption_service.encrypt_field(
                        school_id,
                        field_name,
                        &salary_str,
                        classification,
                    ).await {
                        Ok(encrypted) => {
                            employee_data[field_name] = json!(encrypted);
                        }
                        Err(e) => {
                            tracing::warn!("Failed to encrypt salary: {}", e);
                        }
                    }
                }
            }
        }

        Ok(employee_data)
    }

    /// Decrypt sensitive fields in employee data after retrieval
    pub async fn decrypt_employee_data(&self, school_id: &str, mut employee_data: Value) -> Result<Value, String> {
        // Define sensitive fields for employees
        let sensitive_fields = vec![
            "aadhaarNumber",
            "contact",
            "alternativeContact",
            "email",
            "address",
            "dob",
            "salary",
            "bankAccountNumber",
            "bankIfscCode",
            "panNumber",
            "medicalRecords",
            "emergencyContact",
        ];

        for field_name in sensitive_fields {
            if let Some(field_value) = employee_data.get(field_name) {
                if let Some(value_str) = field_value.as_str() {
                    if !value_str.is_empty() && value_str.starts_with("enc:") {
                        match self.encryption_service.decrypt_field(
                            school_id,
                            field_name,
                            value_str,
                        ).await {
                            Ok(decrypted) => {
                                // For salary, convert back to number if possible
                                if field_name == "salary" {
                                    if let Ok(salary_num) = decrypted.parse::<f64>() {
                                        employee_data[field_name] = json!(salary_num);
                                    } else {
                                        employee_data[field_name] = json!(decrypted);
                                    }
                                } else {
                                    employee_data[field_name] = json!(decrypted);
                                }
                            }
                            Err(e) => {
                                tracing::warn!("Failed to decrypt field {}: {}", field_name, e);
                                // Keep encrypted value
                            }
                        }
                    }
                }
            }
        }

        Ok(employee_data)
    }

    /// Check if data needs encryption based on classification
    pub fn should_encrypt_field(&self, field_name: &str, classification: DataClassification) -> bool {
        match classification {
            DataClassification::HighlyRestricted | DataClassification::Restricted => true,
            DataClassification::Confidential => {
                // Encrypt confidential fields that are highly sensitive
                matches!(
                    field_name,
                    "aadhaarNumber"
                        | "medicalRecords"
                        | "bankAccountNumber"
                        | "salary"
                        | "panNumber"
                )
            }
            DataClassification::Internal | DataClassification::Public => false,
        }
    }
}
