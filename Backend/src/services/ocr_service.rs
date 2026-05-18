use crate::error::{AppError, AppResult};
use crate::logic::ai::providers::{registry::ProviderRegistry, GenerateOptions};
use serde_json::{json, Value};
use std::sync::Arc;

pub struct OcrService {
    registry: Arc<ProviderRegistry>,
    http_client: reqwest::Client,
}

impl OcrService {
    pub fn new(registry: Arc<ProviderRegistry>) -> Self {
        Self {
            registry,
            http_client: reqwest::Client::new(),
        }
    }

    pub async fn extract_from_document(
        &self,
        school_id: &str,
        file_url: &str,
        doc_type: &str,
    ) -> AppResult<Value> {
        let provider = self
            .registry
            .get_school_provider(school_id)
            .await?
            .ok_or_else(|| AppError::Internal("No AI provider configured for this school".to_string()))?;

        let field_descriptions = field_descriptions_for_type(doc_type);

        let prompt = format!(
            r#"You are analyzing an Indian government document image.

Document type: {doc_type}

Extract the following fields from the document image. Return ONLY a valid JSON object with these keys:
{field_descriptions}

Rules:
1. Return ONLY the JSON object, no explanation or markdown
2. For any field not found, set value to null
3. Clean up values (trim whitespace, fix formatting)
4. For Aadhaar numbers, return in format XXXX-XXXX-XXXX
5. For names, use proper capitalization
6. For dates, use YYYY-MM-DD format"#,
            doc_type = doc_type,
            field_descriptions = field_descriptions
        );

        let result = if provider.get_type() == "google_gemini" {
            let mut result = self.call_gemini_vision(&prompt, file_url).await?;
            result["docType"] = json!(doc_type);
            result
        } else {
            let mut options = GenerateOptions::default();
            options.max_tokens = Some(1024);
            options.temperature = Some(0.1);
            let response = provider.generate_text(&prompt, &options).await?;
            let extracted = parse_llm_response(&response.text)?;
            json!({
                "docType": doc_type,
                "extractedFields": extracted,
                "rawLength": response.text.len()
            })
        };

        Ok(result)
    }

    async fn call_gemini_vision(
        &self,
        prompt: &str,
        file_url: &str,
    ) -> AppResult<Value> {
        let api_key = std::env::var("GEMINI_API_KEY").unwrap_or_default();
        if api_key.is_empty() {
            return Err(AppError::Internal(
                "GEMINI_API_KEY environment variable not set".to_string(),
            ));
        }

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={}",
            api_key
        );

        let mime_type = guess_mime_type(file_url);

        let request_body = json!({
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"file_data": {"mime_type": mime_type, "file_uri": file_url}}
                ]
            }],
            "generationConfig": {
                "maxOutputTokens": 1024,
                "temperature": 0.1
            }
        });

        let response = self.http_client
            .post(&url)
            .json(&request_body)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Gemini vision request failed: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!(
                "Gemini vision API error ({}): {}",
                status, error_text
            )));
        }

        let resp_json: Value = response.json().await.map_err(|e| {
            AppError::Internal(format!("Failed to parse Gemini response: {}", e))
        })?;

        let text = extract_text_from_gemini(&resp_json)?;
        let extracted = parse_llm_response(&text)?;

        Ok(json!({
            "extractedFields": extracted,
            "rawLength": text.len()
        }))
    }

    pub async fn extract_batch(
        &self,
        school_id: &str,
        docs: &[(String, String)],
    ) -> AppResult<Value> {
        let mut merged = json!({});
        let mut documents = Vec::new();

        for (file_url, doc_type) in docs {
            let result = self.extract_from_document(school_id, file_url, doc_type).await?;
            if let Some(fields) = result["extractedFields"].as_object() {
                for (k, v) in fields {
                    if !v.is_null() && merged.get(k).map_or(true, |existing| existing.is_null()) {
                        merged[k] = v.clone();
                    }
                }
            }
            documents.push(result);
        }

        Ok(json!({
            "mergedFields": merged,
            "documents": documents
        }))
    }
}

fn field_descriptions_for_type(doc_type: &str) -> &str {
    match doc_type {
        "aadhaar" => r#""name", "dob" (YYYY-MM-DD), "gender", "aadhaarNumber" (XXXX-XXXX-XXXX format), "address""#,
        "pan" => r#""name", "panNumber" (e.g. ABCDE1234F), "dob" (YYYY-MM-DD)"#,
        "tc" => r#""name", "fatherName", "motherName", "dob" (YYYY-MM-DD), "prevSchool", "tcNumber""#,
        "marksheet" => r#""name", "fatherName", "motherName", "school", "grade", "year""#,
        "birth_certificate" => r#""name", "dob" (YYYY-MM-DD), "fatherName", "motherName", "gender""#,
        _ => r#""name", "dob" (YYYY-MM-DD)"#,
    }
}

fn guess_mime_type(file_url: &str) -> &str {
    let lower = file_url.to_lowercase();
    if lower.ends_with(".pdf") {
        "application/pdf"
    } else if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".webp") {
        "image/webp"
    } else if lower.ends_with(".gif") {
        "image/gif"
    } else {
        "image/jpeg"
    }
}

fn parse_llm_response(text: &str) -> AppResult<Value> {
    let cleaned = text
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    serde_json::from_str(cleaned).map_err(|e| {
        AppError::Internal(format!("Failed to parse LLM extraction response: {}", e))
    })
}

fn extract_text_from_gemini(resp_json: &Value) -> AppResult<String> {
    let candidates = resp_json["candidates"]
        .as_array()
        .ok_or_else(|| AppError::Internal("No candidates in Gemini response".to_string()))?;

    let candidate = candidates.first().ok_or_else(|| {
        AppError::Internal("Empty candidates array".to_string())
    })?;

    let parts = candidate["content"]["parts"]
        .as_array()
        .ok_or_else(|| AppError::Internal("No parts in Gemini response".to_string()))?;

    let text = parts
        .iter()
        .filter_map(|part| part["text"].as_str())
        .collect::<Vec<&str>>()
        .join("");

    if text.is_empty() {
        return Err(AppError::Internal(
            "Empty text in Gemini response".to_string(),
        ));
    }

    Ok(text)
}
