//! Encryption configuration for comprehensive school data protection
//!
//! This module defines configuration structures and constants for field-level encryption,
//! key management, and data classification across all school operational data categories.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Encryption algorithm configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptionAlgorithmConfig {
    /// Algorithm name (e.g., "AES-256-GCM")
    pub name: String,
    
    /// Key size in bits
    pub key_size: u32,
    
    /// Initialization vector size in bytes
    pub iv_size: u32,
    
    /// Authentication tag size in bytes (for AEAD algorithms)
    pub tag_size: Option<u32>,
    
    /// Is this algorithm approved for use
    pub approved: bool,
    
    /// Performance characteristics
    pub performance_rating: PerformanceRating,
}

/// Performance rating for encryption algorithms
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PerformanceRating {
    High,
    Medium,
    Low,
}

/// Key management configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyManagementConfig {
    /// Key rotation interval in days
    pub rotation_interval_days: u32,
    
    /// Maximum key lifetime in days
    pub max_key_lifetime_days: u32,
    
    /// Key storage backend (database, kms, hsm)
    pub storage_backend: KeyStorageBackend,
    
    /// Key encryption key (KEK) configuration
    pub kek_config: Option<KekConfig>,
    
    /// Key backup policy
    pub backup_policy: KeyBackupPolicy,
}

/// Key storage backend type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum KeyStorageBackend {
    /// Store keys in database (encrypted)
    Database,
    
    /// Use cloud KMS (AWS KMS, Google Cloud KMS, Azure Key Vault)
    CloudKms {
        provider: CloudKmsProvider,
        region: String,
        key_arn: Option<String>,
    },
    
    /// Hardware Security Module
    Hsm {
        vendor: String,
        slot: Option<u32>,
    },
}

/// Cloud KMS provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CloudKmsProvider {
    AwsKms,
    GoogleCloudKms,
    AzureKeyVault,
}

/// Key Encryption Key (KEK) configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KekConfig {
    /// KEK identifier
    pub kek_id: String,
    
    /// KEK storage location
    pub storage: KeyStorageBackend,
    
    /// KEK rotation policy
    pub rotation_policy: RotationPolicy,
}

/// Key rotation policy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RotationPolicy {
    /// Automatic rotation enabled
    pub automatic: bool,
    
    /// Rotation schedule (cron expression)
    pub schedule: Option<String>,
    
    /// Manual rotation required
    pub manual_approval: bool,
}

/// Key backup policy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyBackupPolicy {
    /// Backup enabled
    pub enabled: bool,
    
    /// Backup frequency (daily, weekly, monthly)
    pub frequency: BackupFrequency,
    
    /// Number of backup copies to retain
    pub retention_count: u32,
    
    /// Backup storage location
    pub storage_location: String,
    
    /// Backup encryption required
    pub encryption_required: bool,
}

/// Backup frequency
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BackupFrequency {
    Daily,
    Weekly,
    Monthly,
}

/// Data classification configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataClassificationConfig {
    /// Classification levels and their requirements
    pub levels: HashMap<ClassificationLevel, LevelRequirements>,
    
    /// Default classification for unclassified data
    pub default_level: ClassificationLevel,
    
    /// Automatic classification rules
    pub auto_classification_rules: Vec<ClassificationRule>,
}

/// Data classification level
#[derive(Debug, Clone, Serialize, Deserialize, Hash, Eq, PartialEq)]
pub enum ClassificationLevel {
    Public,
    Internal,
    Confidential,
    Restricted,
    HighlyRestricted,
}

/// Requirements for each classification level
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LevelRequirements {
    /// Encryption required
    pub encryption_required: bool,
    
    /// Minimum encryption algorithm
    pub min_algorithm: String,
    
    /// Access logging required
    pub access_logging: bool,
    
    /// Audit trail required
    pub audit_trail: bool,
    
    /// Retention period in days
    pub retention_days: Option<u32>,
    
    /// Data residency requirements
    pub data_residency: Vec<String>,
}

/// Automatic classification rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassificationRule {
    /// Pattern to match (regex, field name, etc.)
    pub pattern: String,
    
    /// Pattern type
    pub pattern_type: PatternType,
    
    /// Classification level to apply
    pub classification: ClassificationLevel,
    
    /// Priority (higher = more specific)
    pub priority: u32,
}

/// Pattern type for classification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PatternType {
    FieldName,
    DataType,
    Regex,
    JsonPath,
}

/// School data category configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchoolDataCategoryConfig {
    /// Category name
    pub category_name: String,
    
    /// Description
    pub description: String,
    
    /// Default classification level
    pub default_classification: ClassificationLevel,
    
    /// Sensitive fields within this category
    pub sensitive_fields: Vec<SensitiveFieldConfig>,
    
    /// Special handling requirements
    pub special_requirements: Vec<SpecialRequirement>,
}

/// Sensitive field configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SensitiveFieldConfig {
    /// Field name
    pub field_name: String,
    
    /// JSON path for nested fields
    pub json_path: Option<String>,
    
    /// Data type
    pub data_type: DataType,
    
    /// Classification level
    pub classification: ClassificationLevel,
    
    /// Encryption algorithm override
    pub algorithm_override: Option<String>,
    
    /// Key ID override
    pub key_id_override: Option<String>,
}

/// Data type enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DataType {
    String,
    Number,
    Boolean,
    Date,
    DateTime,
    Json,
    Binary,
}

/// Special requirements for data handling
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpecialRequirement {
    /// Requirement type
    pub requirement_type: RequirementType,
    
    /// Requirement details
    pub details: String,
    
    /// Is this requirement mandatory
    pub mandatory: bool,
}

/// Requirement type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RequirementType {
    DataResidency,
    ConsentRequired,
    ParentalConsent,
    LegalHold,
    DataMinimization,
    RightToErasure,
    DataPortability,
    EducationalPurposeOnly,
}

/// Comprehensive encryption configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptionConfig {
    /// Algorithm configuration
    pub algorithm: EncryptionAlgorithmConfig,
    
    /// Key management configuration
    pub key_management: KeyManagementConfig,
    
    /// Data classification configuration
    pub data_classification: DataClassificationConfig,
    
    /// School data categories configuration
    pub school_data_categories: Vec<SchoolDataCategoryConfig>,
    
    /// Performance settings
    pub performance: PerformanceConfig,
    
    /// Compliance settings
    pub compliance: ComplianceConfig,
}

/// Performance configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceConfig {
    /// Enable caching of encrypted values
    pub enable_caching: bool,
    
    /// Cache TTL in seconds
    pub cache_ttl_seconds: u64,
    
    /// Batch encryption size
    pub batch_size: usize,
    
    /// Parallel processing enabled
    pub parallel_processing: bool,
    
    /// Compression before encryption
    pub enable_compression: bool,
}

/// Compliance configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceConfig {
    /// DPDPA 2023 compliance settings
    pub dpdpa_2023: DpdpaConfig,
    
    /// GDPR compliance settings
    pub gdpr: GdprConfig,
    
    /// ISO 27001 compliance settings
    pub iso_27001: Iso27001Config,
    
    /// Educational data protection standards
    pub educational_standards: EducationalStandardsConfig,
}

/// DPDPA 2023 configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DpdpaConfig {
    /// Data principal rights enabled
    pub data_principal_rights: bool,
    
    /// Consent management enabled
    pub consent_management: bool,
    
    /// Data protection officer contact
    pub dpo_contact: Option<String>,
    
    /// Breach notification timeline (hours)
    pub breach_notification_hours: u32,
}

/// GDPR configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GdprConfig {
    /// Data subject rights enabled
    pub data_subject_rights: bool,
    
    /// Lawful basis for processing
    pub lawful_basis: Vec<LawfulBasis>,
    
    /// Data protection impact assessment required
    pub dpia_required: bool,
    
    /// EU representative required
    pub eu_representative: Option<String>,
}

/// Lawful basis for GDPR processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LawfulBasis {
    Consent,
    Contract,
    LegalObligation,
    VitalInterests,
    PublicTask,
    LegitimateInterests,
}

/// ISO 27001 configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Iso27001Config {
    /// Information security management system enabled
    pub isms_enabled: bool,
    
    /// Risk assessment frequency (months)
    pub risk_assessment_frequency: u32,
    
    /// Security controls implemented
    pub security_controls: Vec<String>,
    
    /// Audit schedule
    pub audit_schedule: String,
}

/// Educational standards configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EducationalStandardsConfig {
    /// Student privacy protection enabled
    pub student_privacy: bool,
    
    /// Parental consent required
    pub parental_consent: bool,
    
    /// Data retention for academic records (years)
    pub academic_records_retention_years: u32,
    
    /// Data sharing restrictions
    pub data_sharing_restrictions: Vec<DataSharingRestriction>,
}

/// Data sharing restriction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSharingRestriction {
    /// Restriction type
    pub restriction_type: RestrictionType,
    
    /// Description
    pub description: String,
    
    /// Applicable data categories
    pub applicable_categories: Vec<String>,
}

/// Restriction type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RestrictionType {
    NoThirdPartySharing,
    ParentalConsentRequired,
    EducationalPurposeOnly,
    AnonymizationRequired,
    AggregationRequired,
}

/// Default encryption configuration
impl Default for EncryptionConfig {
    fn default() -> Self {
        Self {
            algorithm: EncryptionAlgorithmConfig {
                name: "AES-256-GCM".to_string(),
                key_size: 256,
                iv_size: 12,
                tag_size: Some(16),
                approved: true,
                performance_rating: PerformanceRating::High,
            },
            
            key_management: KeyManagementConfig {
                rotation_interval_days: 90,
                max_key_lifetime_days: 365,
                storage_backend: KeyStorageBackend::Database,
                kek_config: None,
                backup_policy: KeyBackupPolicy {
                    enabled: true,
                    frequency: BackupFrequency::Daily,
                    retention_count: 7,
                    storage_location: "secure_backup_location".to_string(),
                    encryption_required: true,
                },
            },
            
            data_classification: {
                let mut levels = HashMap::new();
                levels.insert(
                    ClassificationLevel::Public,
                    LevelRequirements {
                        encryption_required: false,
                        min_algorithm: "none".to_string(),
                        access_logging: false,
                        audit_trail: false,
                        retention_days: None,
                        data_residency: vec![],
                    },
                );
                levels.insert(
                    ClassificationLevel::Internal,
                    LevelRequirements {
                        encryption_required: false,
                        min_algorithm: "AES-128".to_string(),
                        access_logging: true,
                        audit_trail: false,
                        retention_days: Some(365),
                        data_residency: vec!["in-country".to_string()],
                    },
                );
                levels.insert(
                    ClassificationLevel::Confidential,
                    LevelRequirements {
                        encryption_required: true,
                        min_algorithm: "AES-256-GCM".to_string(),
                        access_logging: true,
                        audit_trail: true,
                        retention_days: Some(1095), // 3 years
                        data_residency: vec!["in-country".to_string()],
                    },
                );
                levels.insert(
                    ClassificationLevel::Restricted,
                    LevelRequirements {
                        encryption_required: true,
                        min_algorithm: "AES-256-GCM".to_string(),
                        access_logging: true,
                        audit_trail: true,
                        retention_days: Some(1825), // 5 years
                        data_residency: vec!["in-country".to_string(), "no-cross-border".to_string()],
                    },
                );
                levels.insert(
                    ClassificationLevel::HighlyRestricted,
                    LevelRequirements {
                        encryption_required: true,
                        min_algorithm: "AES-256-GCM-HSM".to_string(),
                        access_logging: true,
                        audit_trail: true,
                        retention_days: Some(3650), // 10 years
                        data_residency: vec!["in-country".to_string(), "no-cross-border".to_string(), "specific-region".to_string()],
                    },
                );
                
                DataClassificationConfig {
                    levels,
                    default_level: ClassificationLevel::Internal,
                    auto_classification_rules: vec![
                        ClassificationRule {
                            pattern: r"(?i)aadhaar|pan|passport|ssn".to_string(),
                            pattern_type: PatternType::Regex,
                            classification: ClassificationLevel::HighlyRestricted,
                            priority: 100,
                        },
                        ClassificationRule {
                            pattern: r"(?i)medical|health|diagnosis|treatment".to_string(),
                            pattern_type: PatternType::Regex,
                            classification: ClassificationLevel::HighlyRestricted,
                            priority: 90,
                        },
                        ClassificationRule {
                            pattern: r"(?i)salary|bank|account|credit.*card".to_string(),
                            pattern_type: PatternType::Regex,
                            classification: ClassificationLevel::Restricted,
                            priority: 80,
                        },
                        ClassificationRule {
                            pattern: r"(?i)phone|email|address|contact".to_string(),
                            pattern_type: PatternType::Regex,
                            classification: ClassificationLevel::Confidential,
                            priority: 70,
                        },
                    ],
                }
            },
            
            school_data_categories: vec![
                SchoolDataCategoryConfig {
                    category_name: "Student Data".to_string(),
                    description: "Personal, academic, and demographic information about students".to_string(),
                    default_classification: ClassificationLevel::Confidential,
                    sensitive_fields: vec![
                        SensitiveFieldConfig {
                            field_name: "aadhaar_number".to_string(),
                            json_path: None,
                            data_type: DataType::String,
                            classification: ClassificationLevel::HighlyRestricted,
                            algorithm_override: Some("AES-256-GCM-HSM".to_string()),
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "medical_records".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::HighlyRestricted,
                            algorithm_override: Some("AES-256-GCM".to_string()),
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "contact_information".to_string(),
                            json_path: Some("contact".to_string()),
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Confidential,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "academic_records".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Confidential,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "attendance_records".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Internal,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                    ],
                    special_requirements: vec![
                        SpecialRequirement {
                            requirement_type: RequirementType::ParentalConsent,
                            details: "Parental consent required for students under 18".to_string(),
                            mandatory: true,
                        },
                        SpecialRequirement {
                            requirement_type: RequirementType::DataResidency,
                            details: "Must be stored within India".to_string(),
                            mandatory: true,
                        },
                        SpecialRequirement {
                            requirement_type: RequirementType::DataMinimization,
                            details: "Collect only necessary data for educational purposes".to_string(),
                            mandatory: true,
                        },
                    ],
                },
                SchoolDataCategoryConfig {
                    category_name: "Employee Data".to_string(),
                    description: "Personal, employment, and financial information about staff".to_string(),
                    default_classification: ClassificationLevel::Confidential,
                    sensitive_fields: vec![
                        SensitiveFieldConfig {
                            field_name: "bank_details".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::HighlyRestricted,
                            algorithm_override: Some("AES-256-GCM".to_string()),
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "salary_information".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Restricted,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "qualification_certificates".to_string(),
                            json_path: None,
                            data_type: DataType::Binary,
                            classification: ClassificationLevel::Confidential,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "contact_information".to_string(),
                            json_path: Some("contact".to_string()),
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Confidential,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                    ],
                    special_requirements: vec![
                        SpecialRequirement {
                            requirement_type: RequirementType::ConsentRequired,
                            details: "Employee consent required for processing".to_string(),
                            mandatory: true,
                        },
                        SpecialRequirement {
                            requirement_type: RequirementType::LegalHold,
                            details: "Legal hold may be required for terminated employees".to_string(),
                            mandatory: false,
                        },
                    ],
                },
                SchoolDataCategoryConfig {
                    category_name: "Academic & Curriculum Data".to_string(),
                    description: "Timetables, exam results, curriculum, and teaching materials".to_string(),
                    default_classification: ClassificationLevel::Confidential,
                    sensitive_fields: vec![
                        SensitiveFieldConfig {
                            field_name: "examination_results".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Confidential,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "student_grades".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Confidential,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "question_papers".to_string(),
                            json_path: None,
                            data_type: DataType::Binary,
                            classification: ClassificationLevel::Restricted,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "answer_sheets".to_string(),
                            json_path: None,
                            data_type: DataType::Binary,
                            classification: ClassificationLevel::HighlyRestricted,
                            algorithm_override: Some("AES-256-GCM".to_string()),
                            key_id_override: None,
                        },
                    ],
                    special_requirements: vec![
                        SpecialRequirement {
                            requirement_type: RequirementType::EducationalPurposeOnly,
                            details: "Data can only be used for educational purposes".to_string(),
                            mandatory: true,
                        },
                        SpecialRequirement {
                            requirement_type: RequirementType::DataResidency,
                            details: "Academic records must be stored within the country".to_string(),
                            mandatory: true,
                        },
                    ],
                },
                SchoolDataCategoryConfig {
                    category_name: "Financial & Administrative Data".to_string(),
                    description: "Fee payments, payroll, expenses, and administrative records".to_string(),
                    default_classification: ClassificationLevel::Restricted,
                    sensitive_fields: vec![
                        SensitiveFieldConfig {
                            field_name: "fee_payment_records".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::HighlyRestricted,
                            algorithm_override: Some("AES-256-GCM".to_string()),
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "bank_transaction_details".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::HighlyRestricted,
                            algorithm_override: Some("AES-256-GCM-HSM".to_string()),
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "expense_reports".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Internal,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "budget_allocations".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Internal,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                    ],
                    special_requirements: vec![
                        SpecialRequirement {
                            requirement_type: RequirementType::DataResidency,
                            details: "Financial data must comply with local financial regulations".to_string(),
                            mandatory: true,
                        },
                        SpecialRequirement {
                            requirement_type: RequirementType::LegalHold,
                            details: "Financial records may be subject to audit holds".to_string(),
                            mandatory: true,
                        },
                    ],
                },
                SchoolDataCategoryConfig {
                    category_name: "Infrastructure & Operations Data".to_string(),
                    description: "Building management, transport, security, and maintenance records".to_string(),
                    default_classification: ClassificationLevel::Internal,
                    sensitive_fields: vec![
                        SensitiveFieldConfig {
                            field_name: "cctv_footage_metadata".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Confidential,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "security_access_logs".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Confidential,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "student_transport_routes".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Confidential,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "maintenance_records".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Internal,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                    ],
                    special_requirements: vec![
                        SpecialRequirement {
                            requirement_type: RequirementType::DataMinimization,
                            details: "Only collect necessary operational data".to_string(),
                            mandatory: true,
                        },
                        SpecialRequirement {
                            requirement_type: RequirementType::ConsentRequired,
                            details: "Consent required for biometric or surveillance data".to_string(),
                            mandatory: true,
                        },
                    ],
                },
                SchoolDataCategoryConfig {
                    category_name: "Communication & Documentation Data".to_string(),
                    description: "Official correspondence, policies, legal documents, and digital content".to_string(),
                    default_classification: ClassificationLevel::Confidential,
                    sensitive_fields: vec![
                        SensitiveFieldConfig {
                            field_name: "official_correspondence".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Confidential,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "policy_documents".to_string(),
                            json_path: None,
                            data_type: DataType::Binary,
                            classification: ClassificationLevel::Internal,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "legal_documents".to_string(),
                            json_path: None,
                            data_type: DataType::Binary,
                            classification: ClassificationLevel::HighlyRestricted,
                            algorithm_override: Some("AES-256-GCM".to_string()),
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "parent_communication".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Confidential,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                    ],
                    special_requirements: vec![
                        SpecialRequirement {
                            requirement_type: RequirementType::LegalHold,
                            details: "Legal documents may be subject to discovery holds".to_string(),
                            mandatory: true,
                        },
                        SpecialRequirement {
                            requirement_type: RequirementType::RightToErasure,
                            details: "Communication data may need to be deleted upon request".to_string(),
                            mandatory: true,
                        },
                    ],
                },
                SchoolDataCategoryConfig {
                    category_name: "Compliance & Legal Data".to_string(),
                    description: "Audit trails, regulatory documents, consent forms, and compliance records".to_string(),
                    default_classification: ClassificationLevel::HighlyRestricted,
                    sensitive_fields: vec![
                        SensitiveFieldConfig {
                            field_name: "audit_trails".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::HighlyRestricted,
                            algorithm_override: Some("AES-256-GCM-HSM".to_string()),
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "regulatory_documents".to_string(),
                            json_path: None,
                            data_type: DataType::Binary,
                            classification: ClassificationLevel::HighlyRestricted,
                            algorithm_override: Some("AES-256-GCM".to_string()),
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "consent_forms".to_string(),
                            json_path: None,
                            data_type: DataType::Binary,
                            classification: ClassificationLevel::Restricted,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                        SensitiveFieldConfig {
                            field_name: "compliance_reports".to_string(),
                            json_path: None,
                            data_type: DataType::Json,
                            classification: ClassificationLevel::Restricted,
                            algorithm_override: None,
                            key_id_override: None,
                        },
                    ],
                    special_requirements: vec![
                        SpecialRequirement {
                            requirement_type: RequirementType::LegalHold,
                            details: "Compliance data must be preserved for legal requirements".to_string(),
                            mandatory: true,
                        },
                        SpecialRequirement {
                            requirement_type: RequirementType::DataResidency,
                            details: "Must comply with jurisdiction-specific requirements".to_string(),
                            mandatory: true,
                        },
                    ],
                },
            ],
            
            performance: PerformanceConfig {
                enable_caching: true,
                cache_ttl_seconds: 300,
                batch_size: 100,
                parallel_processing: true,
                enable_compression: true,
            },
            
            compliance: ComplianceConfig {
                dpdpa_2023: DpdpaConfig {
                    data_principal_rights: true,
                    consent_management: true,
                    dpo_contact: Some("dpo@vidhyam.edu".to_string()),
                    breach_notification_hours: 72,
                },
                gdpr: GdprConfig {
                    data_subject_rights: true,
                    lawful_basis: vec![
                        LawfulBasis::Consent,
                        LawfulBasis::LegalObligation,
                        LawfulBasis::LegitimateInterests,
                    ],
                    dpia_required: true,
                    eu_representative: Some("gdpr-representative@vidhyam.eu".to_string()),
                },
                iso_27001: Iso27001Config {
                    isms_enabled: true,
                    risk_assessment_frequency: 12,
                    security_controls: vec![
                        "A.10.1 Cryptography".to_string(),
                        "A.13.2 Information transfer".to_string(),
                        "A.18.1 Compliance with legal and contractual requirements".to_string(),
                    ],
                    audit_schedule: "Quarterly".to_string(),
                },
                educational_standards: EducationalStandardsConfig {
                    student_privacy: true,
                    parental_consent: true,
                    academic_records_retention_years: 10,
                    data_sharing_restrictions: vec![
                        DataSharingRestriction {
                            restriction_type: RestrictionType::ParentalConsentRequired,
                            description: "Student data sharing requires parental consent".to_string(),
                            applicable_categories: vec!["Student Data".to_string()],
                        },
                        DataSharingRestriction {
                            restriction_type: RestrictionType::EducationalPurposeOnly,
                            description: "Data can only be used for educational purposes".to_string(),
                            applicable_categories: vec!["Academic & Curriculum Data".to_string()],
                        },
                        DataSharingRestriction {
                            restriction_type: RestrictionType::NoThirdPartySharing,
                            description: "No sharing with third parties without explicit consent".to_string(),
                            applicable_categories: vec!["Student Data".to_string(), "Employee Data".to_string()],
                        },
                    ],
                },
            },
        }
    }
}

/// Helper function to load encryption configuration from environment
pub fn load_encryption_config() -> Result<EncryptionConfig, Box<dyn std::error::Error>> {
    // In a real implementation, this would load from config file or environment variables
    // For now, return the default configuration
    Ok(EncryptionConfig::default())
}

/// Helper function to validate encryption configuration
pub fn validate_config(config: &EncryptionConfig) -> Result<(), Vec<String>> {
    let mut errors = Vec::new();
    
    // Validate algorithm configuration
    if config.algorithm.key_size < 128 {
        errors.push("Encryption key size must be at least 128 bits".to_string());
    }
    
    if config.algorithm.name.is_empty() {
        errors.push("Encryption algorithm name cannot be empty".to_string());
    }
    
    // Validate key management configuration
    if config.key_management.rotation_interval_days == 0 {
        errors.push("Key rotation interval must be greater than 0".to_string());
    }
    
    if config.key_management.max_key_lifetime_days < config.key_management.rotation_interval_days {
        errors.push("Maximum key lifetime must be greater than rotation interval".to_string());
    }
    
    // Validate data classification levels
    if !config.data_classification.levels.contains_key(&config.data_classification.default_level) {
        errors.push("Default classification level must be defined in levels".to_string());
    }
    
    // Validate school data categories
    for category in &config.school_data_categories {
        if category.category_name.is_empty() {
            errors.push(format!("School data category name cannot be empty"));
        }
        
        for field in &category.sensitive_fields {
            if field.field_name.is_empty() {
                errors.push(format!("Field name cannot be empty in category {}", category.category_name));
            }
        }
    }
    
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

/// Get configuration for a specific school data category
pub fn get_category_config<'a>(config: &'a EncryptionConfig, category_name: &str) -> Option<&'a SchoolDataCategoryConfig> {
    config.school_data_categories
        .iter()
        .find(|category| category.category_name == category_name)
}

/// Get sensitive fields for a specific category
pub fn get_sensitive_fields_for_category<'a>(config: &'a EncryptionConfig, category_name: &str) -> Vec<&'a SensitiveFieldConfig> {
    config.school_data_categories
        .iter()
        .filter(|category| category.category_name == category_name)
        .flat_map(|category| category.sensitive_fields.iter())
        .collect()
}

/// Check if a field requires encryption based on classification
pub fn field_requires_encryption(classification: &ClassificationLevel, config: &EncryptionConfig) -> bool {
    config.data_classification.levels
        .get(classification)
        .map(|requirements| requirements.encryption_required)
        .unwrap_or(false)
}

/// Get minimum algorithm for a classification level
pub fn get_min_algorithm_for_classification(classification: &ClassificationLevel, config: &EncryptionConfig) -> String {
    config.data_classification.levels
        .get(classification)
        .map(|requirements| requirements.min_algorithm.clone())
        .unwrap_or_else(|| "AES-256-GCM".to_string())
}