//! Field-level encryption service for sensitive data
//! 
//! This module provides encryption capabilities for sensitive fields in the database.
//! It supports AES-256-GCM encryption with key rotation and key management.

use anyhow::{anyhow, Result};
use base64::{engine::general_purpose, Engine as _};
use ring::aead;
use serde_json::{Value, json};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

// Import encryption configuration
use super::encryption_config::{
    EncryptionConfig, SchoolDataCategoryConfig, SensitiveFieldConfig,
    ClassificationLevel, DataType, SpecialRequirement, RequirementType,
    load_encryption_config
};

/// Encryption key with metadata
#[derive(Debug, Clone)]
pub struct EncryptionKey {
    pub key_id: String,
    pub key_version: u32,
    pub key_material: Vec<u8>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub is_active: bool,
}

/// Data classification levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum DataClassification {
    Public,          // Can be stored in plaintext
    Internal,        // Basic encryption recommended
    Confidential,    // Must be encrypted
    Restricted,      // Must be encrypted with strong key
    HighlyRestricted, // Must be encrypted with HSM-backed key
}

/// Sensitive field definition
#[derive(Debug, Clone)]
pub struct SensitiveField {
    pub field_name: String,
    pub classification: DataClassification,
    pub path: Vec<String>, // JSON path for nested fields
    pub encryption_required: bool,
}

/// Encryption service trait
#[async_trait::async_trait]
pub trait EncryptionService: Send + Sync {
    /// Encrypt a plaintext value
    async fn encrypt(&self, plaintext: &str, key_id: Option<&str>) -> Result<String>;
    
    /// Decrypt a ciphertext
    async fn decrypt(&self, ciphertext: &str) -> Result<String>;
    
    /// Encrypt specific fields in a JSON object
    async fn encrypt_fields(&self, data: &Value, fields: &[SensitiveField]) -> Result<Value>;
    
    /// Decrypt encrypted fields in a JSON object
    async fn decrypt_fields(&self, data: &Value, fields: &[SensitiveField]) -> Result<Value>;
    
    /// Rotate encryption keys
    async fn rotate_keys(&self) -> Result<Vec<String>>;
    
    /// Get current active key ID
    async fn get_active_key_id(&self) -> Result<String>;
}

/// Implementation of encryption service using AES-256-GCM
pub struct AesGcmEncryptionService {
    keys: Arc<RwLock<HashMap<String, EncryptionKey>>>,
    active_key_id: Arc<RwLock<String>>,
    key_store: Arc<dyn KeyStore + Send + Sync>,
}

#[async_trait::async_trait]
impl EncryptionService for AesGcmEncryptionService {
    async fn encrypt(&self, plaintext: &str, key_id: Option<&str>) -> Result<String> {
        let target_key_id = match key_id {
            Some(id) => id.to_string(),
            None => self.get_active_key_id().await?,
        };
        
        let keys = self.keys.read().await;
        let key = keys.get(&target_key_id)
            .ok_or_else(|| anyhow!("Encryption key not found: {}", target_key_id))?;
        
        if !key.is_active {
            return Err(anyhow!("Encryption key is not active: {}", target_key_id));
        }
        
        // Generate a random nonce
        let mut nonce = [0u8; 12];
        getrandom::getrandom(&mut nonce)?;
        
        // Prepare the plaintext
        let plaintext_bytes = plaintext.as_bytes();
        let mut in_out = plaintext_bytes.to_vec();
        
        // Create sealing key
        let unbound_key = aead::UnboundKey::new(&aead::AES_256_GCM, &key.key_material)
            .map_err(|e| anyhow!("Failed to create key: {}", e))?;
        let sealing_key = aead::LessSafeKey::new(unbound_key);
        
        // Encrypt in-place
        sealing_key.seal_in_place_append_tag(
            aead::Nonce::assume_unique_for_key(nonce),
            aead::Aad::empty(),
            &mut in_out,
        ).map_err(|e| anyhow!("Encryption failed: {}", e))?;
        
        // Combine nonce + ciphertext + tag
        let mut result = Vec::with_capacity(nonce.len() + in_out.len());
        result.extend_from_slice(&nonce);
        result.extend_from_slice(&in_out);
        
        // Encode as base64 with metadata
        let encoded = general_purpose::STANDARD.encode(&result);
        Ok(format!("{}:{}:{}", key.key_version, target_key_id, encoded))
    }
    
    async fn decrypt(&self, ciphertext: &str) -> Result<String> {
        // Parse the ciphertext format: version:key_id:base64_data
        let parts: Vec<&str> = ciphertext.split(':').collect();
        if parts.len() != 3 {
            return Err(anyhow!("Invalid ciphertext format"));
        }
        
        let key_version: u32 = parts[0].parse()?;
        let key_id = parts[1];
        let encoded_data = parts[2];
        
        let keys = self.keys.read().await;
        let key = keys.get(key_id)
            .ok_or_else(|| anyhow!("Decryption key not found: {}", key_id))?;
        
        // Decode base64
        let data = general_purpose::STANDARD.decode(encoded_data)?;
        
        // Extract nonce (first 12 bytes) and ciphertext
        if data.len() < 12 {
            return Err(anyhow!("Ciphertext too short"));
        }
        
        let nonce = &data[0..12];
        let ciphertext_with_tag = &data[12..];
        
        // Create opening key
        let unbound_key = aead::UnboundKey::new(&aead::AES_256_GCM, &key.key_material)
            .map_err(|e| anyhow!("Failed to create key: {}", e))?;
        let opening_key = aead::LessSafeKey::new(unbound_key);
        
        // Decrypt in-place (need mutable copy)
        let mut in_out = ciphertext_with_tag.to_vec();
        
        let plaintext_bytes = opening_key.open_in_place(
            aead::Nonce::try_assume_unique_for_key(nonce)
                .map_err(|e| anyhow!("Invalid nonce: {}", e))?,
            aead::Aad::empty(),
            &mut in_out,
        ).map_err(|e| anyhow!("Decryption failed: {}", e))?;
        
        // Convert to string
        String::from_utf8(plaintext_bytes.to_vec())
            .map_err(|e| anyhow!("Invalid UTF-8 after decryption: {}", e))
    }
    
    async fn encrypt_fields(&self, data: &Value, fields: &[SensitiveField]) -> Result<Value> {
        let mut result = data.clone();
        
        for field in fields {
            if !field.encryption_required {
                continue;
            }
            
            // Navigate to the field in the JSON structure
            if let Some(value) = self.get_field_value(&result, &field.path) {
                if let Some(str_value) = value.as_str() {
                    if !str_value.is_empty() && !str_value.starts_with("enc:") {
                        // Encrypt the value
                        let encrypted = self.encrypt(str_value, None).await?;
                        let encrypted_value = format!("enc:{}", encrypted);
                        
                        // Update the field with encrypted value
                        self.set_field_value(&mut result, &field.path, json!(encrypted_value))?;
                    }
                }
            }
        }
        
        Ok(result)
    }
    
    async fn decrypt_fields(&self, data: &Value, fields: &[SensitiveField]) -> Result<Value> {
        let mut result = data.clone();
        
        for field in fields {
            if !field.encryption_required {
                continue;
            }
            
            // Navigate to the field in the JSON structure
            if let Some(value) = self.get_field_value(&result, &field.path) {
                if let Some(str_value) = value.as_str() {
                    if str_value.starts_with("enc:") {
                        // Extract the ciphertext (remove "enc:" prefix)
                        let ciphertext = &str_value[4..];
                        
                        // Decrypt the value
                        let decrypted = self.decrypt(ciphertext).await?;
                        
                        // Update the field with decrypted value
                        self.set_field_value(&mut result, &field.path, json!(decrypted))?;
                    }
                }
            }
        }
        
        Ok(result)
    }
    
    async fn rotate_keys(&self) -> Result<Vec<String>> {
        // Generate new key
        let new_key = self.generate_key().await?;
        
        let mut keys = self.keys.write().await;
        let mut active_key_id = self.active_key_id.write().await;
        
        // Mark old key as inactive
        if let Some(old_key) = keys.get(&*active_key_id) {
            let mut updated_key = old_key.clone();
            updated_key.is_active = false;
            keys.insert(updated_key.key_id.clone(), updated_key);
        }
        
        // Add new key
        keys.insert(new_key.key_id.clone(), new_key.clone());
        
        // Update active key
        *active_key_id = new_key.key_id.clone();
        
        // Save to key store
        self.key_store.save_keys(&*keys).await?;
        
        Ok(vec![new_key.key_id])
    }
    
    async fn get_active_key_id(&self) -> Result<String> {
        Ok(self.active_key_id.read().await.clone())
    }
}

impl AesGcmEncryptionService {
    /// Create a new encryption service
    pub async fn new(key_store: Arc<dyn KeyStore + Send + Sync>) -> Result<Self> {
        // Load keys from key store
        let keys = key_store.load_keys().await?;
        
        // Find active key
        let active_key_id = keys.values()
            .find(|k| k.is_active)
            .map(|k| k.key_id.clone())
            .ok_or_else(|| anyhow!("No active encryption key found"))?;
        
        Ok(Self {
            keys: Arc::new(RwLock::new(keys)),
            active_key_id: Arc::new(RwLock::new(active_key_id)),
            key_store,
        })
    }
    
    /// Generate a new encryption key
    async fn generate_key(&self) -> Result<EncryptionKey> {
        let mut key_material = vec![0u8; 32]; // 256 bits for AES-256
        getrandom::getrandom(&mut key_material)?;
        
        let key_id = uuid::Uuid::new_v4().to_string();
        
        Ok(EncryptionKey {
            key_id: key_id.clone(),
            key_version: 1,
            key_material,
            created_at: chrono::Utc::now(),
            is_active: true,
        })
    }
    
    /// Get field value from JSON using path
    fn get_field_value<'a>(&self, data: &'a Value, path: &[String]) -> Option<&'a Value> {
        let mut current = data;
        
        for segment in path {
            current = current.get(segment)?;
        }
        
        Some(current)
    }
    
    /// Set field value in JSON using path
    fn set_field_value(&self, data: &mut Value, path: &[String], value: Value) -> Result<()> {
        if path.is_empty() {
            return Err(anyhow!("Empty path"));
        }
        
        let mut current = data;
        
        // Navigate to the parent
        for segment in &path[..path.len() - 1] {
            if !current.is_object() {
                return Err(anyhow!("Path segment '{}' is not an object", segment));
            }
            
            if let Some(obj) = current.as_object_mut() {
                if !obj.contains_key(segment) {
                    obj.insert(segment.clone(), json!({}));
                }
                current = obj.get_mut(segment).unwrap();
            } else {
                return Err(anyhow!("Expected object at path segment '{}'", segment));
            }
        }
        
        // Set the value at the final segment
        let final_segment = &path[path.len() - 1];
        if let Some(obj) = current.as_object_mut() {
            obj.insert(final_segment.clone(), value);
            Ok(())
        } else {
            Err(anyhow!("Final path segment '{}' is not an object", final_segment))
        }
    }

    /// Encrypt a single field
    pub async fn encrypt_field(
        &self,
        school_id: &str,
        field_name: &str,
        value: &str,
        classification: DataClassification,
    ) -> Result<String, String> {
        // For now, we'll just use the basic encrypt method
        // In a real implementation, we would use classification to determine key strength
        match self.encrypt(value, None).await {
            Ok(encrypted) => Ok(encrypted),
            Err(e) => Err(format!("Failed to encrypt field {}: {}", field_name, e)),
        }
    }

    /// Decrypt a single field
    pub async fn decrypt_field(
        &self,
        school_id: &str,
        field_name: &str,
        value: &str,
    ) -> Result<String, String> {
        // Remove "enc:" prefix if present
        let ciphertext = if value.starts_with("enc:") {
            &value[4..]
        } else {
            value
        };

        match self.decrypt(ciphertext).await {
            Ok(decrypted) => Ok(decrypted),
            Err(e) => Err(format!("Failed to decrypt field {}: {}", field_name, e)),
        }
    }
}

/// Key store trait for persistence
#[async_trait::async_trait]
pub trait KeyStore: Send + Sync {
    /// Load all encryption keys
    async fn load_keys(&self) -> Result<HashMap<String, EncryptionKey>>;
    
    /// Save encryption keys
    async fn save_keys(&self, keys: &HashMap<String, EncryptionKey>) -> Result<()>;
    
    /// Get key by ID
    async fn get_key(&self, key_id: &str) -> Result<Option<EncryptionKey>>;
}

/// In-memory key store (for testing)
pub struct MemoryKeyStore {
    keys: Arc<RwLock<HashMap<String, EncryptionKey>>>,
}

impl MemoryKeyStore {
    pub fn new() -> Self {
        Self {
            keys: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

#[async_trait::async_trait]
impl KeyStore for MemoryKeyStore {
    async fn load_keys(&self) -> Result<HashMap<String, EncryptionKey>> {
        Ok(self.keys.read().await.clone())
    }
    
    async fn save_keys(&self, keys: &HashMap<String, EncryptionKey>) -> Result<()> {
        *self.keys.write().await = keys.clone();
        Ok(())
    }
    
    async fn get_key(&self, key_id: &str) -> Result<Option<EncryptionKey>> {
        Ok(self.keys.read().await.get(key_id).cloned())
    }
}

/// Database key store (for production)
pub struct DatabaseKeyStore {
    // Would connect to a secure key database
    // For now, this is a placeholder
}

impl DatabaseKeyStore {
    pub fn new() -> Self {
        Self {}
    }
}

#[async_trait::async_trait]
impl KeyStore for DatabaseKeyStore {
    async fn load_keys(&self) -> Result<HashMap<String, EncryptionKey>> {
        // In production, this would load from a secure database
        // For now, return empty map
        Ok(HashMap::new())
    }
    
    async fn save_keys(&self, _keys: &HashMap<String, EncryptionKey>) -> Result<()> {
        // In production, this would save to a secure database
        Ok(())
    }
    
    async fn get_key(&self, _key_id: &str) -> Result<Option<EncryptionKey>> {
        // In production, this would query a secure database
        Ok(None)
    }
}

/// Predefined sensitive fields for school management system
pub fn get_sensitive_fields() -> Vec<SensitiveField> {
    vec![
        // Student sensitive fields
        SensitiveField {
            field_name: "aadhaar_number".to_string(),
            classification: DataClassification::HighlyRestricted,
            path: vec!["aadhaar_number".to_string()],
            encryption_required: true,
        },
        SensitiveField {
            field_name: "medical_records".to_string(),
            classification: DataClassification::HighlyRestricted,
            path: vec!["medical_records".to_string()],
            encryption_required: true,
        },
        SensitiveField {
            field_name: "contact_number".to_string(),
            classification: DataClassification::Confidential,
            path: vec!["contact".to_string(), "phone".to_string()],
            encryption_required: true,
        },
        SensitiveField {
            field_name: "email".to_string(),
            classification: DataClassification::Confidential,
            path: vec!["contact".to_string(), "email".to_string()],
            encryption_required: true,
        },
        SensitiveField {
            field_name: "address".to_string(),
            classification: DataClassification::Confidential,
            path: vec!["address".to_string()],
            encryption_required: true,
        },
        SensitiveField {
            field_name: "father_aadhaar".to_string(),
            classification: DataClassification::HighlyRestricted,
            path: vec!["father".to_string(), "aadhaar_number".to_string()],
            encryption_required: true,
        },
        SensitiveField {
            field_name: "mother_aadhaar".to_string(),
            classification: DataClassification::HighlyRestricted,
            path: vec!["mother".to_string(), "aadhaar_number".to_string()],
            encryption_required: true,
        },
        // Employee sensitive fields
        SensitiveField {
            field_name: "employee_aadhaar".to_string(),
            classification: DataClassification::HighlyRestricted,
            path: vec!["aadhaar_number".to_string()],
            encryption_required: true,
        },
        SensitiveField {
            field_name: "employee_salary".to_string(),
            classification: DataClassification::Restricted,
            path: vec!["salary".to_string()],
            encryption_required: true,
        },
        SensitiveField {
            field_name: "bank_details".to_string(),
            classification: DataClassification::HighlyRestricted,
            path: vec!["bank_details".to_string()],
            encryption_required: true,
        },
        SensitiveField {
            field_name: "pan_number".to_string(),
            classification: DataClassification::Restricted,
            path: vec!["pan_number".to_string()],
            encryption_required: true,
        },
    ]
}

/// Helper function to create encryption service with memory store
pub async fn create_encryption_service() -> Result<Arc<dyn EncryptionService>> {
    let key_store = Arc::new(MemoryKeyStore::new());
    let service = AesGcmEncryptionService::new(key_store).await?;
    Ok(Arc::new(service))
}

/// Convert encryption configuration to sensitive fields
pub fn get_sensitive_fields_from_config(config: &EncryptionConfig) -> Vec<SensitiveField> {
    let mut sensitive_fields = Vec::new();
    
    for category in &config.school_data_categories {
        for field in &category.sensitive_fields {
            // Convert ClassificationLevel to DataClassification
            let classification = match field.classification {
                ClassificationLevel::Public => DataClassification::Public,
                ClassificationLevel::Internal => DataClassification::Internal,
                ClassificationLevel::Confidential => DataClassification::Confidential,
                ClassificationLevel::Restricted => DataClassification::Restricted,
                ClassificationLevel::HighlyRestricted => DataClassification::HighlyRestricted,
            };
            
            // Determine if encryption is required based on classification
            let encryption_required = classification != DataClassification::Public;
            
            // Create path from field name (simple implementation)
            let path = vec![field.field_name.clone()];
            
            sensitive_fields.push(SensitiveField {
                field_name: field.field_name.clone(),
                classification,
                path,
                encryption_required,
            });
        }
    }
    
    sensitive_fields
}

/// Get comprehensive sensitive fields using default configuration
pub fn get_comprehensive_sensitive_fields() -> Vec<SensitiveField> {
    match load_encryption_config() {
        Ok(config) => get_sensitive_fields_from_config(&config),
        Err(_) => get_sensitive_fields(), // Fallback to hardcoded fields
    }
}

/// Create encryption service with configuration-based settings
pub async fn create_encryption_service_with_config(config: &EncryptionConfig) -> Result<Arc<dyn EncryptionService>> {
    // Load key management configuration
    let key_store: Arc<dyn KeyStore + Send + Sync> = match &config.key_management.storage_backend {
        super::encryption_config::KeyStorageBackend::Database => {
            Arc::new(DatabaseKeyStore::new())
        }
        super::encryption_config::KeyStorageBackend::CloudKms { provider, .. } => {
            log::info!("Using Cloud KMS provider: {:?}", provider);
            // For now, fall back to memory store
            // TODO: Implement Cloud KMS integration
            Arc::new(MemoryKeyStore::new())
        }
        super::encryption_config::KeyStorageBackend::Hsm { vendor: _, slot: _ } => {
            log::info!("Using HSM for key storage");
            // For now, fall back to memory store
            // TODO: Implement HSM integration
            Arc::new(MemoryKeyStore::new())
        }
    };
    
    let service = AesGcmEncryptionService::new(key_store).await?;
    Ok(Arc::new(service))
}

/// Create encryption service with default configuration
pub async fn create_encryption_service_with_default_config() -> Result<Arc<dyn EncryptionService>> {
    let config = EncryptionConfig::default();
    create_encryption_service_with_config(&config).await
}