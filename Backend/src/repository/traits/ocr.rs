use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait OCRRepository: Send + Sync {
    async fn process_ocr(&self, file_path: &str, engine: &str) -> Result<Value, AppError>;

    async fn save_ocr_result(&self, school_id: &str, result_data: Value) -> Result<(), AppError>;
}
