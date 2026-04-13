//! Comprehensive data classification for school management system
//! 
//! This module defines data classification structures for all school operational data
//! across 7 major categories with detailed field-level sensitivity analysis.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// School data categories as defined in the comprehensive data safety solution
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SchoolDataCategory {
    /// Student personal and academic data
    StudentData,
    /// Employee personal and professional data
    EmployeeData,
    /// Academic curriculum, assessments, and learning materials
    AcademicCurriculumData,
    /// Financial transactions, fees, and administrative records
    FinancialAdministrativeData,
    /// Infrastructure, facilities, and operational data
    InfrastructureOperations,
    /// Communication records and documentation
    CommunicationDocumentation,
    /// Compliance, legal, and regulatory data
    ComplianceLegalData,
}

impl SchoolDataCategory {
    /// Get all categories as a vector
    pub fn all_categories() -> Vec<Self> {
        vec![
            Self::StudentData,
            Self::EmployeeData,
            Self::AcademicCurriculumData,
            Self::FinancialAdministrativeData,
            Self::InfrastructureOperations,
            Self::CommunicationDocumentation,
            Self::ComplianceLegalData,
        ]
    }

    /// Get category name as string
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::StudentData => "Student Data",
            Self::EmployeeData => "Employee Data",
            Self::AcademicCurriculumData => "Academic & Curriculum Data",
            Self::FinancialAdministrativeData => "Financial & Administrative Data",
            Self::InfrastructureOperations => "Infrastructure & Operations",
            Self::CommunicationDocumentation => "Communication & Documentation",
            Self::ComplianceLegalData => "Compliance & Legal Data",
        }
    }

    /// Get category description
    pub fn description(&self) -> &'static str {
        match self {
            Self::StudentData => "Personal, academic, and health information of students including Aadhaar, medical records, contact details, and academic performance",
            Self::EmployeeData => "Personal, professional, and financial information of staff including salary, bank details, Aadhaar, PAN, and employment records",
            Self::AcademicCurriculumData => "Curriculum content, lesson plans, assessments, examination papers, student performance data, and learning analytics",
            Self::FinancialAdministrativeData => "Fee transactions, invoices, payroll, budgets, procurement records, and financial statements",
            Self::InfrastructureOperations => "Facility management, asset tracking, maintenance records, security systems, and operational logistics",
            Self::CommunicationDocumentation => "Official correspondence, meeting minutes, policy documents, announcements, and parent-teacher communications",
            Self::ComplianceLegalData => "Regulatory filings, audit reports, legal documents, consent forms, and compliance certifications",
        }
    }
}

/// Data classification levels based on sensitivity
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DataClassificationLevel {
    /// Public information - can be stored in plaintext
    Public,
    /// Internal information - basic encryption recommended
    Internal,
    /// Confidential information - must be encrypted
    Confidential,
    /// Restricted information - must be encrypted with strong key management
    Restricted,
    /// Highly restricted information - requires HSM-backed encryption
    HighlyRestricted,
}

impl DataClassificationLevel {
    /// Get all levels in order of sensitivity
    pub fn all_levels() -> Vec<Self> {
        vec![
            Self::Public,
            Self::Internal,
            Self::Confidential,
            Self::Restricted,
            Self::HighlyRestricted,
        ]
    }

    /// Check if encryption is required for this level
    pub fn requires_encryption(&self) -> bool {
        match self {
            Self::Public => false,
            Self::Internal => true,  // Recommended but not strictly required
            Self::Confidential => true,
            Self::Restricted => true,
            Self::HighlyRestricted => true,
        }
    }

    /// Get minimum encryption algorithm for this level
    pub fn min_encryption_algorithm(&self) -> &'static str {
        match self {
            Self::Public => "None",
            Self::Internal => "AES-128-GCM",
            Self::Confidential => "AES-256-GCM",
            Self::Restricted => "AES-256-GCM with key rotation",
            Self::HighlyRestricted => "AES-256-GCM with HSM-backed keys",
        }
    }
}

/// Sensitive field definition with comprehensive metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SensitiveField {
    /// Field name in the database
    pub field_name: String,
    /// Table name where the field resides
    pub table_name: String,
    /// School data category
    pub category: SchoolDataCategory,
    /// Data classification level
    pub classification: DataClassificationLevel,
    /// Data type (for validation and formatting)
    pub data_type: String,
    /// Whether encryption is required for this field
    pub encryption_required: bool,
    /// Encryption algorithm to use (if applicable)
    pub encryption_algorithm: Option<String>,
    /// Retention period in days (if applicable)
    pub retention_days: Option<i32>,
    /// Special handling requirements
    pub special_requirements: Vec<String>,
    /// Description of the field and its sensitivity
    pub description: String,
    /// Example values (for testing and validation)
    pub examples: Vec<String>,
}

/// Comprehensive field mapping for school data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchoolDataFieldMapping {
    /// Mapping of categories to their sensitive fields
    pub categories: HashMap<SchoolDataCategory, Vec<SensitiveField>>,
    /// Total count of sensitive fields
    pub total_sensitive_fields: usize,
    /// Count of fields requiring encryption
    pub fields_requiring_encryption: usize,
    /// Count of highly restricted fields
    pub highly_restricted_fields: usize,
}

impl SchoolDataFieldMapping {
    /// Create a new comprehensive field mapping with all school data categories
    pub fn comprehensive() -> Self {
        let mut categories = HashMap::new();
        
        // Student Data fields
        categories.insert(SchoolDataCategory::StudentData, vec![
            SensitiveField {
                field_name: "aadhaar_number".to_string(),
                table_name: "students".to_string(),
                category: SchoolDataCategory::StudentData,
                classification: DataClassificationLevel::HighlyRestricted,
                data_type: "VARCHAR(12)".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 75), // 75 years for permanent records
                special_requirements: vec!["DPDPA 2023".to_string(), "GDPR".to_string()],
                description: "Unique identification number - highly sensitive personal data".to_string(),
                examples: vec!["123456789012".to_string()],
            },
            SensitiveField {
                field_name: "medical_records".to_string(),
                table_name: "student_health".to_string(),
                category: SchoolDataCategory::StudentData,
                classification: DataClassificationLevel::HighlyRestricted,
                data_type: "TEXT".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 25), // 25 years
                special_requirements: vec!["Medical confidentiality".to_string(), "HIPAA equivalent".to_string()],
                description: "Medical history, allergies, disabilities, and health conditions".to_string(),
                examples: vec!["Asthma, peanut allergy".to_string()],
            },
            SensitiveField {
                field_name: "contact_number".to_string(),
                table_name: "student_contacts".to_string(),
                category: SchoolDataCategory::StudentData,
                classification: DataClassificationLevel::Confidential,
                data_type: "VARCHAR(15)".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 10),
                special_requirements: vec!["PII protection".to_string()],
                description: "Primary contact phone number".to_string(),
                examples: vec!["+919876543210".to_string()],
            },
            SensitiveField {
                field_name: "email".to_string(),
                table_name: "student_contacts".to_string(),
                category: SchoolDataCategory::StudentData,
                classification: DataClassificationLevel::Confidential,
                data_type: "VARCHAR(255)".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 10),
                special_requirements: vec!["PII protection".to_string()],
                description: "Primary email address".to_string(),
                examples: vec!["student@example.com".to_string()],
            },
            SensitiveField {
                field_name: "address".to_string(),
                table_name: "student_addresses".to_string(),
                category: SchoolDataCategory::StudentData,
                classification: DataClassificationLevel::Confidential,
                data_type: "TEXT".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 10),
                special_requirements: vec!["PII protection".to_string()],
                description: "Residential address with full details".to_string(),
                examples: vec!["123 Main St, City, State 12345".to_string()],
            },
        ]);

        // Employee Data fields
        categories.insert(SchoolDataCategory::EmployeeData, vec![
            SensitiveField {
                field_name: "aadhaar_number".to_string(),
                table_name: "employees".to_string(),
                category: SchoolDataCategory::EmployeeData,
                classification: DataClassificationLevel::HighlyRestricted,
                data_type: "VARCHAR(12)".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 75),
                special_requirements: vec!["DPDPA 2023".to_string(), "GDPR".to_string()],
                description: "Employee unique identification number".to_string(),
                examples: vec!["987654321098".to_string()],
            },
            SensitiveField {
                field_name: "salary".to_string(),
                table_name: "employee_salaries".to_string(),
                category: SchoolDataCategory::EmployeeData,
                classification: DataClassificationLevel::Restricted,
                data_type: "DECIMAL(10,2)".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 30), // 30 years for payroll records
                special_requirements: vec!["Financial confidentiality".to_string()],
                description: "Monthly salary amount".to_string(),
                examples: vec!["50000.00".to_string()],
            },
            SensitiveField {
                field_name: "bank_account_number".to_string(),
                table_name: "employee_bank_details".to_string(),
                category: SchoolDataCategory::EmployeeData,
                classification: DataClassificationLevel::HighlyRestricted,
                data_type: "VARCHAR(20)".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 30),
                special_requirements: vec!["Financial data protection".to_string(), "PCI DSS equivalent".to_string()],
                description: "Bank account number for salary deposits".to_string(),
                examples: vec!["1234567890123456".to_string()],
            },
            SensitiveField {
                field_name: "pan_number".to_string(),
                table_name: "employee_tax_details".to_string(),
                category: SchoolDataCategory::EmployeeData,
                classification: DataClassificationLevel::Restricted,
                data_type: "VARCHAR(10)".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 30),
                special_requirements: vec!["Tax information protection".to_string()],
                description: "Permanent Account Number for taxation".to_string(),
                examples: vec!["ABCDE1234F".to_string()],
            },
        ]);

        // Academic & Curriculum Data fields
        categories.insert(SchoolDataCategory::AcademicCurriculumData, vec![
            SensitiveField {
                field_name: "examination_papers".to_string(),
                table_name: "examination_materials".to_string(),
                category: SchoolDataCategory::AcademicCurriculumData,
                classification: DataClassificationLevel::Restricted,
                data_type: "TEXT".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 5),
                special_requirements: vec!["Academic integrity".to_string()],
                description: "Examination question papers and answer keys".to_string(),
                examples: vec!["Final exam paper for Grade 10 Mathematics".to_string()],
            },
            SensitiveField {
                field_name: "student_performance_data".to_string(),
                table_name: "academic_records".to_string(),
                category: SchoolDataCategory::AcademicCurriculumData,
                classification: DataClassificationLevel::Confidential,
                data_type: "JSONB".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 25),
                special_requirements: vec!["Student privacy".to_string()],
                description: "Detailed academic performance and assessment data".to_string(),
                examples: vec!["{\"grades\": [85, 92, 78], \"rank\": 15}".to_string()],
            },
            SensitiveField {
                field_name: "curriculum_content".to_string(),
                table_name: "learning_materials".to_string(),
                category: SchoolDataCategory::AcademicCurriculumData,
                classification: DataClassificationLevel::Internal,
                data_type: "TEXT".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 10),
                special_requirements: vec!["Intellectual property".to_string()],
                description: "Proprietary curriculum and teaching materials".to_string(),
                examples: vec!["Custom mathematics curriculum for Grade 5".to_string()],
            },
        ]);

        // Financial & Administrative Data fields
        categories.insert(SchoolDataCategory::FinancialAdministrativeData, vec![
            SensitiveField {
                field_name: "transaction_details".to_string(),
                table_name: "financial_transactions".to_string(),
                category: SchoolDataCategory::FinancialAdministrativeData,
                classification: DataClassificationLevel::Restricted,
                data_type: "JSONB".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 10), // 10 years for financial records
                special_requirements: vec!["Financial audit trail".to_string()],
                description: "Detailed financial transaction records".to_string(),
                examples: vec!["{\"amount\": 5000, \"type\": \"fee_payment\", \"method\": \"credit_card\"}".to_string()],
            },
            SensitiveField {
                field_name: "invoice_data".to_string(),
                table_name: "invoices".to_string(),
                category: SchoolDataCategory::FinancialAdministrativeData,
                classification: DataClassificationLevel::Confidential,
                data_type: "JSONB".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 10),
                special_requirements: vec!["Financial confidentiality".to_string()],
                description: "Invoice details including amounts, dates, and parties".to_string(),
                examples: vec!["Invoice #INV-2024-001 for annual fees".to_string()],
            },
            SensitiveField {
                field_name: "budget_allocations".to_string(),
                table_name: "budget_plans".to_string(),
                category: SchoolDataCategory::FinancialAdministrativeData,
                classification: DataClassificationLevel::Internal,
                data_type: "JSONB".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 7),
                special_requirements: vec!["Financial planning confidentiality".to_string()],
                description: "Detailed budget allocations and financial planning".to_string(),
                examples: vec!["{\"department\": \"Science\", \"allocation\": 500000}".to_string()],
            },
        ]);

        // Infrastructure & Operations fields
        categories.insert(SchoolDataCategory::InfrastructureOperations, vec![
            SensitiveField {
                field_name: "security_system_logs".to_string(),
                table_name: "security_logs".to_string(),
                category: SchoolDataCategory::InfrastructureOperations,
                classification: DataClassificationLevel::Restricted,
                data_type: "JSONB".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 3),
                special_requirements: vec!["Security monitoring".to_string()],
                description: "Access control and security system logs".to_string(),
                examples: vec!["{\"timestamp\": \"2024-01-15T08:30:00Z\", \"access_point\": \"Main Gate\"}".to_string()],
            },
            SensitiveField {
                field_name: "maintenance_records".to_string(),
                table_name: "facility_maintenance".to_string(),
                category: SchoolDataCategory::InfrastructureOperations,
                classification: DataClassificationLevel::Internal,
                data_type: "TEXT".to_string(),
                encryption_required: true,
                encryption_algorithm: Some("AES-256-GCM".to_string()),
                retention_days: Some(365 * 5),
                special_requirements: vec!["Operational security".to_string()],
                description: "