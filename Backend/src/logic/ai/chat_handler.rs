use crate::repository::Repositories;
use anyhow::{anyhow, Result};
use reqwest::Client;
use serde_json::{json, Value};
use sqlx::Row;
use sqlx::Column;
use std::sync::Arc;

pub struct ChatHandler {
    pub repos: Arc<Repositories>,
    pub http_client: Client,
}

impl ChatHandler {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self {
            repos,
            http_client: Client::new(),
        }
    }

    pub async fn fetch_api_key(&self) -> Result<String> {
        let row = sqlx::query("SELECT config_value FROM system_config WHERE config_key = 'GEMINI_API_KEY'")
            .fetch_optional(&self.repos.db_client.pool)
            .await?;
        
        match row {
            Some(r) => Ok(r.get::<String, _>("config_value")),
            None => Err(anyhow!("GEMINI_API_KEY not found in system_config. Please update settings.")),
        }
    }

    /// Helper to calculate Cosine Similarity between two arrays
    pub fn calculate_similarity(vec1: &[f32], vec2: &[f32]) -> f32 {
        if vec1.len() != vec2.len() || vec1.is_empty() {
            return 0.0;
        }
        let mut dot_product = 0.0;
        let mut norm_a = 0.0;
        let mut norm_b = 0.0;
        for (a, b) in vec1.iter().zip(vec2.iter()) {
            dot_product += a * b;
            norm_a += a * a;
            norm_b += b * b;
        }
        if norm_a == 0.0 || norm_b == 0.0 { return 0.0; }
        dot_product / (norm_a.sqrt() * norm_b.sqrt())
    }

    /// Helper to generate embeddings via Gemini Embeddings API
    pub async fn generate_embedding(&self, text: &str) -> Result<Vec<f32>> {
        let api_key = self.fetch_api_key().await?;
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={}",
            api_key
        );
        let response = self.http_client.post(&url).json(&json!({
            "model": "models/text-embedding-004",
            "content": { "parts": [{"text": text}] }
        })).send().await?;
        let resp_json: Value = response.json().await?;
        if let Some(arr) = resp_json["embedding"]["values"].as_array() {
            return Ok(arr.iter().filter_map(|v| v.as_f64().map(|f| f as f32)).collect());
        }
        Err(anyhow!("Failed to generate embedding: {:?}", resp_json))
    }

    pub async fn process_query(&self, school_id: &str, query: &str) -> Result<Value> {
        let api_key = self.fetch_api_key().await?;
        
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        // 1. Fetch Chat History
        let history_rows = sqlx::query("SELECT role, content FROM ai_chat_history WHERE school_id = $1 ORDER BY created_at DESC LIMIT 10")
            .bind(school_id).fetch_all(&mut *conn).await.unwrap_or_default();
        let mut contents = history_rows.into_iter().rev().map(|r| json!({
            "role": r.get::<String, _>("role"),
            "parts": [{ "text": r.get::<String, _>("content") }]
        })).collect::<Vec<_>>();
        
        // 2. Cache Hit Logic
        let query_embedding = self.generate_embedding(query).await?;
        let cache_rows = sqlx::query("SELECT generated_sql, question_embedding FROM ai_query_cache")
            .fetch_all(&mut *conn).await.unwrap_or_default();
        let mut best_match: Option<(f32, String)> = None;
        for row in cache_rows {
            let cached_emb: Vec<f32> = row.get("question_embedding");
            let sim = Self::calculate_similarity(&query_embedding, &cached_emb);
            if sim > 0.95 {
                if best_match.as_ref().map_or(true, |(s, _)| sim > *s) {
                    best_match = Some((sim, row.get("generated_sql")));
                }
            }
        }
        if let Some((_, sql)) = best_match {
            println!("Cache Hit: {}", sql);
            let records = sqlx::query(&sql).fetch_all(&mut *conn).await?;
            let mut results = vec![];
            for rec in records {
                let mut m = serde_json::Map::new();
                for col in rec.columns() {
                    m.insert(col.name().to_string(), json!(rec.get::<Option<String>, _>(col.ordinal())));
                }
                results.push(json!(m));
            }
            return Ok(json!({"success": true, "cached": true, "data": results}));
        }
        
        // 3. Save User Message
        let _ = sqlx::query("INSERT INTO ai_chat_history (school_id, user_id, role, content) VALUES ($1, 'default', 'user', $2)")
            .bind(school_id).bind(query).execute(&mut *conn).await;
        contents.push(json!({ "role": "user", "parts": [{ "text": query }] }));
        
        // 4. Tools and Gemini Loop
        let tools = json!([{
            "function_declarations": [
                { "name": "execute_sql", "description": "Run SELECT queries for school data.", "parameters": { "type": "object", "properties": { "sql": { "type": "string" } }, "required": ["sql"] } },
                { "name": "search_docs", "description": "Search school PDFs and circulars.", "parameters": { "type": "object", "properties": { "query": { "type": "string" } }, "required": ["query"] } },
                { "name": "generate_quiz", "description": "Create a quiz.", "parameters": { "type": "object", "properties": { "topic": { "type": "string" }, "questions": { "type": "array", "items": { "type": "string" } } } } },
                { "name": "generate_pdf", "description": "Export report to PDF.", "parameters": { "type": "object", "properties": { "title": { "type": "string" } }, "required": ["title"] } }
            ]
        }]);
        
        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={}", api_key);
        let mut turn = 0;
        let mut last_answer = json!({});
        
        while turn < 10 {
            let body = json!({
                "contents": contents,
                "tools": tools,
                "system_instruction": { "parts": [{ "text": format!("You are Vidhyam AI. Schema: students, employees, attendance, fees. School ID: {}. Use tools for data.", school_id) }] }
            });
            let res: Value = self.http_client.post(&url).json(&body).send().await?.json().await?;
            let content = res["candidates"][0]["content"].clone();
            if content.is_null() { break; }
            contents.push(content.clone());
            
            let mut tool_results = vec![];
            if let Some(parts) = content["parts"].as_array() {
                for part in parts {
                    if let Some(call) = part.get("functionCall") {
                        let name = call["name"].as_str().unwrap_or("");
                        let args = &call["args"];
                        let result_data = match name {
                            "execute_sql" => {
                                let sql = args["sql"].as_str().unwrap_or("");
                                if sql.to_uppercase().contains("INSERT") || sql.to_uppercase().contains("UPDATE") {
                                    json!({"error": "Read-only access."})
                                } else {
                                    match sqlx::query(sql).fetch_all(&mut *conn).await {
                                        Ok(recs) => {
                                            let _ = sqlx::query("INSERT INTO ai_query_cache (school_id, question_text, question_embedding, generated_sql) VALUES ($1, $2, $3, $4)")
                                                .bind(school_id).bind(query).bind(&query_embedding).bind(sql).execute(&mut *conn).await;
                                            let mut rvec = vec![];
                                            for r in recs {
                                                let mut m = serde_json::Map::new();
                                                for c in r.columns() { m.insert(c.name().to_string(), json!(r.get::<Option<String>, _>(c.ordinal()))); }
                                                rvec.push(json!(m));
                                            }
                                            json!(rvec)
                                        },
                                        Err(e) => json!({"error": e.to_string()})
                                    }
                                }
                            },
                            "search_docs" => {
                                let squery = args["query"].as_str().unwrap_or("");
                                let semb = self.generate_embedding(squery).await.unwrap_or_default();
                                let doc_rows = sqlx::query("SELECT content, embedding FROM document_embeddings").fetch_all(&mut *conn).await.unwrap_or_default();
                                let mut dmatches = vec![];
                                for dr in doc_rows {
                                    let sim = Self::calculate_similarity(&semb, &dr.get::<Vec<f32>, _>("embedding"));
                                    if sim > 0.7 { dmatches.push((sim, dr.get::<String, _>("content"))); }
                                }
                                dmatches.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap());
                                json!({ "excerpts": dmatches.into_iter().take(5).map(|m| m.1).collect::<Vec<_>>() })
                            },
                            "generate_quiz" | "generate_pdf" => json!({"success": true, "url": "/temp/report.pdf"}),
                            _ => json!({"error": "Unknown tool"})
                        };
                        tool_results.push(json!({ "functionResponse": { "name": name, "response": { "result": result_data } } }));
                    }
                }
            }
            
            if tool_results.is_empty() {
                last_answer = content.clone();
                let ans_text = content["parts"][0]["text"].as_str().unwrap_or("");
                let _ = sqlx::query("INSERT INTO ai_chat_history (school_id, user_id, role, content) VALUES ($1, 'default', 'model', $2)")
                    .bind(school_id).bind(ans_text).execute(&mut *conn).await;
                break;
            }
            contents.push(json!({ "role": "function", "parts": tool_results }));
            turn += 1;
        }
        Ok(last_answer)
    }
}
