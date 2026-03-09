use serde_json::{json, Value};
use crate::repository::Repositories;
use std::sync::Arc;
use anyhow::{Result, anyhow};
use reqwest::Client;
use base64::Engine;

pub struct AiOrchestrator {
    repos: Arc<Repositories>,
    http_client: Client,
    api_key: String,
}

impl AiOrchestrator {
    pub fn new(repos: Arc<Repositories>) -> Self {
        let api_key = std::env::var("GEMINI_API_KEY").unwrap_or_default();
        Self {
            repos,
            http_client: Client::new(),
            api_key,
        }
    }

    pub async fn process_query(&self, school_id: &str, query: &str) -> Result<Value> {
        if self.api_key.is_empty() {
            return Err(anyhow!("GEMINI_API_KEY not set in environment"));
        }

        // 1. Prepare Tools
        let tools = json!([{
            "function_declarations": [
                {
                    "name": "get_school_stats",
                    "description": "Gets total counts of students, employees, and classes for the school.",
                    "parameters": { "type": "object", "properties": {} }
                },
                {
                    "name": "get_attendance_summary",
                    "description": "Gets attendance counts (present, absent, leave) for a specific date (YYYY-MM-DD).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "date": { "type": "string", "description": "YYYY-MM-DD format" }
                        },
                        "required": ["date"]
                    }
                },
                {
                    "name": "get_pending_fees_report",
                    "description": "Lists students with pending fees. Can optionally filter by how many months overdue.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "months_overdue": { "type": "integer", "description": "Number of months overdue" }
                        }
                    }
                },
                {
                    "name": "get_fee_financial_summary",
                    "description": "Gets total expected, collected, and pending amounts for school fees.",
                    "parameters": { "type": "object", "properties": {} }
                },
                {
                    "name": "query_staff_analytics",
                    "description": "Gets breakdown of staff by type and status.",
                    "parameters": { "type": "object", "properties": {} }
                },
                {
                    "name": "generate_pdf_report",
                    "description": "Generates a PDF download with a given title and data objects.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "title": { "type": "string" },
                            "data_summary": { "type": "string", "description": "A short summary to include in text if needed" }
                        },
                        "required": ["title"]
                    }
                }
            ]
        }]);

        // 2. Initial Prompt to Gemini
        let system_instruction = format!(
            "You are Vidhyam AI Assistant. You help school administrators manage their school (School ID: {}). \
            Use the provided tools to fetch real-time data. Always be polite and helpful. \
            If a user asks for a list or report, fetch the data first, then offer to generate a PDF, or automatically call generate_pdf_report if they specifically asked for a PDF.", 
            school_id
        );

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={}", 
            self.api_key
        );

        let mut current_messages = vec![
            json!({"role": "user", "parts": [{"text": query}]})
        ];

        // --- Loop for tool calling (Max 3 turns) ---
        for _ in 0..3 {
            let response = self.http_client.post(&url)
                .json(&json!({
                    "contents": current_messages,
                    "system_instruction": { "parts": [{ "text": system_instruction }] },
                    "tools": tools
                }))
                .send().await?;

            let resp_json: Value = response.json().await?;
            let candidates = &resp_json["candidates"];
            if let Some(candidate) = candidates.get(0) {
                let parts = &candidate["content"]["parts"];
                
                // Check if Gemini wants to call a tool
                let mut tool_calls = Vec::new();
                for part in parts.as_array().unwrap_or(&vec![]) {
                    if let Some(call) = part.get("functionCall") {
                        tool_calls.push(call.clone());
                    }
                }

                if tool_calls.is_empty() {
                    // No more tool calls, return final text
                    let final_text = parts.get(0).and_then(|p| p["text"].as_str()).unwrap_or("I'm sorry, I couldn't process that.");
                    return Ok(json!({ "answer": final_text, "type": "text" }));
                }

                // Add Gemini's tool call to history
                current_messages.push(candidate["content"].clone());

                // Execute tools
                let mut tool_results = Vec::new();
                let mut pdf_data = None;

                for call in tool_calls {
                    let name = call["name"].as_str().unwrap_or("");
                    let args = &call["args"];
                    
                    let result: Value = match name {
                        "get_school_stats" => self.repos.analytics.get_school_stats(school_id).await.unwrap_or(json!({"error": "Failed"})),
                        "get_attendance_summary" => {
                            let date = args["date"].as_str().unwrap_or("");
                            self.repos.analytics.get_attendance_summary(school_id, date).await.unwrap_or(json!({"error": "Failed"}))
                        },
                        "get_pending_fees_report" => {
                            let months = args["months_overdue"].as_i64().unwrap_or(0) as i32;
                            let data = self.repos.analytics.get_pending_fees_by_period(school_id, months).await.unwrap_or(vec![]);
                            pdf_data = Some(json!(data)); // Save for PDF generation if needed
                            json!(data)
                        },
                        "get_fee_financial_summary" => self.repos.analytics.get_fee_summary(school_id).await.unwrap_or(json!({"error": "Failed"})),
                        "query_staff_analytics" => self.repos.analytics.query_staff_analytics(school_id).await.unwrap_or(json!({"error": "Failed"})),
                        "generate_pdf_report" => {
                            // If we have data from a previous tool call in this turn, use it. 
                            // Otherwise, it might be harder without memory, but we'll try to find any data in results.
                            let title = args["title"].as_str().unwrap_or("Report");
                            let data_to_print = pdf_data.clone().unwrap_or(json!({"info": "Report generated by AI"}));
                            
                            match crate::logic::pdf_generator::PdfGenerator::generate_report(title, &data_to_print) {
                                Ok(buf) => {
                                    let b64 = base64::engine::general_purpose::STANDARD.encode(buf);
                                    json!({ "success": true, "pdf_base64": b64 })
                                },
                                Err(e) => json!({ "error": e.to_string() })
                            }
                        },
                        _ => json!({"error": "Tool not found"})
                    };

                    tool_results.push(json!({
                        "functionResponse": {
                            "name": name,
                            "response": { "content": result }
                        }
                    }));
                }

                // Append tool results to history
                current_messages.push(json!({
                    "role": "function", // In Gemini v1beta, multi-turn tool use requires specific role/parts mapping
                    "parts": tool_results
                }));
            } else {
                return Err(anyhow!("Gemini returned no candidates: {:?}", resp_json));
            }
        }

        Err(anyhow!("Max turns exceeded in AI loop"))
    }
}
