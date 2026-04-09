use crate::repository::Repositories;
use anyhow::{anyhow, Result};
use reqwest::Client;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PredictionEngine {
    pub repos: Arc<Repositories>,
    pub http_client: Client,
}

impl PredictionEngine {
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

    pub async fn generate_weekly_tasks_for_employee(&self, school_id: &str, employee_id: &str) -> Result<Value> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        // 0. Fetch Employee Role/Category
        let emp_query = "SELECT category FROM employees WHERE school_id = $1 AND id = $2";
        let category: String = sqlx::query(emp_query)
            .bind(school_id).bind(employee_id)
            .fetch_one(&mut *conn).await
            .map(|r| r.get("category"))
            .unwrap_or_else(|_| "Unknown".to_string());
            
        let is_teacher = category.to_lowercase().contains("teach") || category.to_lowercase().contains("faculty");
        
        // 1. Fetch ALL Responsibilities and assigned Spaces for this employee (Remove employee_type limitation)
        let resp_query = "
            SELECT er.responsibility_id, r.name as subject_name, r.data as r_data, s.name as space_name 
            FROM employee_responsibilities er
            JOIN responsibilities r ON er.responsibility_id = r.responsibility_id
            LEFT JOIN spaces s ON r.space_id = s.space_id
            WHERE er.school_id = $1 AND er.employee_id = $2
        ";
        let responsibilities = sqlx::query(resp_query)
            .bind(school_id).bind(employee_id)
            .fetch_all(&mut *conn).await.unwrap_or_default();
        
        let mut context_str = String::new();
        for row in responsibilities {
            let subj: String = row.try_get("subject_name").unwrap_or_default();
            let space: String = row.try_get("space_name").unwrap_or_default();
            context_str.push_str(&format!("Responsibility: {} (Location: {})\n", subj, space));
        }
        
        // 2. Fetch Pending Topics (academic_components) ONLY IF TEACHER
        let mut pending_topics = String::new();
        if is_teacher {
            let topics_query = "
                SELECT class_name, subject_name, chapter_name, component_name 
                FROM academic_components 
                WHERE school_id = $1 AND component_type = 'topic' AND status->>'completed' IS DISTINCT FROM 'true'
                LIMIT 20
            ";
            let topics = sqlx::query(topics_query)
                .bind(school_id)
                .fetch_all(&mut *conn).await.unwrap_or_default();
            
            for row in topics {
                let cls: String = row.try_get("class_name").unwrap_or_default();
                let sub: String = row.try_get("subject_name").unwrap_or_default();
                let chap: String = row.try_get("chapter_name").unwrap_or_default();
                let top: String = row.try_get("component_name").unwrap_or_default();
                pending_topics.push_str(&format!("Class: {}, Subject: {}, Chapter: {}, Topic: {}\n", cls, sub, chap, top));
            }
        }
        
        // 3. Fetch Next 7 Days Holidays
        let holiday_query = "
            SELECT date, status FROM attendance 
            WHERE school_id = $1 AND role = 'holiday' 
            AND date >= CURRENT_DATE AND date <= (CURRENT_DATE + INTERVAL '7 days')
        ";
        let holidays = sqlx::query(holiday_query)
            .bind(school_id)
            .fetch_all(&mut *conn).await.unwrap_or_default();
        
        let mut upcoming_holidays = String::new();
        for row in holidays {
            let date: chrono::NaiveDate = row.try_get("date").unwrap();
            let reason: String = row.try_get("status").unwrap_or_default();
            upcoming_holidays.push_str(&format!("{} ({})\n", date, reason));
        }
        
        // 4. Generate Conditional Prompt
        let prompt = if is_teacher {
            format!(
                "You are Vidhyam AI Task Scheduler.\n\
                Teacher has these subjects: {}\n\
                Pending Topics across classes: {}\n\
                Upcoming holidays (do not schedule tasks here): {}\n\
                Schedule 1-2 pending topics per day for the next 7 working days.\n\
                Call 'schedule_tasks' tool with a list of tasks. Provide date, task name, related entity (topic name), and priority.",
                context_str, pending_topics, upcoming_holidays
            )
        } else {
            format!(
                "You are Vidhyam AI Operational Scheduler.\n\
                Employee Role: '{}'\n\
                Employee has these broad duties: {}\n\
                Upcoming holidays (do not schedule heavy tasks here): {}\n\
                Generate a structured, day-by-day operational agenda for the next 7 working days, breaking down their broad duties into specific actionable daily tasks.\n\
                Call 'schedule_tasks' tool with a list of tasks. Provide date, task name, related entity (duty), and priority.",
                category, context_str, upcoming_holidays
            )
        };
        
        let tools = json!([{
            "function_declarations": [
                { 
                    "name": "schedule_tasks", 
                    "description": "Save generated tasks to database.", 
                    "parameters": { 
                        "type": "object", 
                        "properties": { 
                            "tasks": { 
                                "type": "array", 
                                "items": { 
                                    "type": "object",
                                    "properties": {
                                        "date": { "type": "string", "description": "YYYY-MM-DD" },
                                        "task_name": { "type": "string" },
                                        "entity_type": { "type": "string", "description": "e.g., 'topic'" },
                                        "entity_id": { "type": "string", "description": "Name of topic" },
                                        "priority": { "type": "string", "description": "High/Medium/Low" }
                                    }
                                } 
                            } 
                        }, 
                        "required": ["tasks"] 
                    } 
                }
            ]
        }]);
        
        let contents = vec![json!({ "role": "user", "parts": [{ "text": prompt }] })];
        
        let api_key = self.fetch_api_key().await?;
        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={}", api_key);
        let body = json!({
            "contents": contents,
            "tools": tools,
            "system_instruction": { "parts": [{ "text": "Plan efficiently. Only output tool call." }] }
        });
        
        let res: Value = self.http_client.post(&url).json(&body).send().await?.json().await?;
        
        let mut created_tasks = vec![];
        if let Some(candidates) = res["candidates"].as_array() {
            if let Some(content) = candidates.first().and_then(|c| c.get("content")) {
                if let Some(parts) = content["parts"].as_array() {
                    for part in parts {
                        if let Some(call) = part.get("functionCall") {
                            if call["name"].as_str() == Some("schedule_tasks") {
                                if let Some(tasks) = call["args"]["tasks"].as_array() {
                                    for t in tasks {
                                        // Save to DB
                                        let deadline_str = t["date"].as_str().unwrap_or("").to_string() + "T23:59:59Z";
                                        let task_payload = json!({
                                            "user_type": "employee",
                                            "parent_id": employee_id,
                                            "task_name": t["task_name"].as_str().unwrap_or(""),
                                            "priority": t["priority"].as_str().unwrap_or("Medium"),
                                            "entity_type": t["entity_type"].as_str().unwrap_or("topic"),
                                            "entity_id": t["entity_id"].as_str().unwrap_or(""),
                                            "is_ai_generated": true,
                                            "deadline": deadline_str
                                        });
                                        
                                        if let Ok(inserted) = self.repos.task.add_task(school_id, task_payload).await {
                                            created_tasks.push(inserted);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        Ok(json!({ "success": true, "tasks_created": created_tasks.len(), "tasks": created_tasks }))
    }

    pub async fn reorganize_tasks(&self, school_id: &str, employee_id: &str) -> Result<Value> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        // 1. Fetch pending past-deadline AI tasks
        let past_tasks_query = "
            SELECT task_id, task_name, deadline 
            FROM tasks 
            WHERE school_id = $1 AND parent_id = $2 AND status != 'completed' AND deadline < CURRENT_TIMESTAMP AND is_ai_generated = true
        ";
        let past_tasks = sqlx::query(past_tasks_query)
            .bind(school_id).bind(employee_id)
            .fetch_all(&mut *conn).await.unwrap_or_default();
        
        if past_tasks.is_empty() {
            return Ok(json!({ "success": true, "message": "No pending tasks to reorganize." }));
        }
        
        let mut tasks_str = String::new();
        for row in &past_tasks {
            let tname: String = row.try_get("task_name").unwrap_or_default();
            tasks_str.push_str(&format!("Task: {}\n", tname));
        }
        
        // 2. Fetch future holidays
        let holiday_query = "
            SELECT date, status FROM attendance 
            WHERE school_id = $1 AND role = 'holiday' 
            AND date >= CURRENT_DATE AND date <= (CURRENT_DATE + INTERVAL '14 days')
        ";
        let holidays = sqlx::query(holiday_query)
            .bind(school_id)
            .fetch_all(&mut *conn).await.unwrap_or_default();
        
        let mut upcoming_holidays = String::new();
        for row in holidays {
            let date: chrono::NaiveDate = row.try_get("date").unwrap();
            let reason: String = row.try_get("status").unwrap_or_default();
            upcoming_holidays.push_str(&format!("{} ({})\n", date, reason));
        }
        
        let prompt = format!(
            "Teacher has missed these tasks: {}\n\
            Upcoming holidays: {}\n\
            Reschedule these tasks starting from tomorrow.\n\
            Call 'reorganize_tool' with new dates for these tasks.",
            tasks_str, upcoming_holidays
        );
        
        let tools = json!([{
            "function_declarations": [
                { 
                    "name": "reorganize_tool", 
                    "description": "Update deadlines for tasks.", 
                    "parameters": { 
                        "type": "object", 
                        "properties": { 
                            "updates": { 
                                "type": "array", 
                                "items": { 
                                    "type": "object",
                                    "properties": {
                                        "task_name": { "type": "string" },
                                        "new_date": { "type": "string", "description": "YYYY-MM-DD" }
                                    }
                                } 
                            } 
                        }, 
                        "required": ["updates"] 
                    } 
                }
            ]
        }]);
        
        let contents = vec![json!({ "role": "user", "parts": [{ "text": prompt }] })];
        let api_key = self.fetch_api_key().await?;
        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={}", api_key);
        let body = json!({ "contents": contents, "tools": tools, "system_instruction": { "parts": [{ "text": "Plan efficiently." }] } });
        
        let res: Value = self.http_client.post(&url).json(&body).send().await?.json().await?;
        
        let mut updated_count = 0;
        if let Some(candidates) = res["candidates"].as_array() {
            if let Some(content) = candidates.first().and_then(|c| c.get("content")) {
                if let Some(parts) = content["parts"].as_array() {
                    for part in parts {
                        if let Some(call) = part.get("functionCall") {
                            if call["name"].as_str() == Some("reorganize_tool") {
                                if let Some(updates) = call["args"]["updates"].as_array() {
                                    for u in updates {
                                        let tname = u["task_name"].as_str().unwrap_or("");
                                        let new_date = u["new_date"].as_str().unwrap_or("").to_string() + "T23:59:59Z";
                                        if let Ok(ts) = chrono::DateTime::parse_from_rfc3339(&new_date) {
                                            let _ = sqlx::query("UPDATE tasks SET deadline = $1, status = 'pending' WHERE school_id = $2 AND parent_id = $3 AND task_name = $4 AND is_ai_generated = true")
                                                .bind(ts.with_timezone(&chrono::Utc))
                                                .bind(school_id).bind(employee_id).bind(tname)
                                                .execute(&mut *conn).await;
                                            updated_count += 1;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        Ok(json!({ "success": true, "message": format!("Reorganized {} tasks", updated_count) }))
    }

    pub async fn generate_exam_questions(&self, school_id: &str, payload: &Value) -> Result<Value> {
        let class_id = payload["classId"].as_str().unwrap_or("");
        let subject = payload["subject"].as_str().unwrap_or("");
        let difficulty = payload["difficulty"].as_str().unwrap_or("Medium");
        let format = payload["format"].as_str().unwrap_or("Mixed");
        
        let mut _conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let prompt = format!(
            "You are Vidhyam AI.
            Design a professional school exam for class level: '{}' and Subject: '{}'.
            Difficulty level: '{}'.
            Desired format: '{}' (e.g. MCQ, Short Answer, Long Answer, or Mixed).
            Generate a JSON array using tool 'save_exam'. The array MUST have objects exactly matching:
            {{ \"type\": \"MCQ\" | \"Short\" | \"Long\", \"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"] (only for MCQ), \"answer\": \"...\" }}
            Provide 5 excellent questions.",
            class_id, subject, difficulty, format
        );
        
        let tools = json!([{
            "function_declarations": [
                { 
                    "name": "save_exam", 
                    "description": "Save generated exam questions.", 
                    "parameters": { 
                        "type": "object", 
                        "properties": { 
                            "questions": { 
                                "type": "array", 
                                "items": { 
                                    "type": "object",
                                    "properties": {
                                        "type": { "type": "string" },
                                        "question": { "type": "string" },
                                        "options": { "type": "array", "items": { "type": "string"} },
                                        "answer": { "type": "string" }
                                    }
                                } 
                            } 
                        }, 
                        "required": ["questions"] 
                    } 
                }
            ]
        }]);
        
        let contents = vec![json!({ "role": "user", "parts": [{ "text": prompt }] })];
        let api_key = self.fetch_api_key().await?;
        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={}", api_key);
        let body = json!({ "contents": contents, "tools": tools, "system_instruction": { "parts": [{ "text": "Draft academic exam questions." }] } });
        
        let res: Value = self.http_client.post(&url).json(&body).send().await?.json().await?;
        
        if let Some(candidates) = res["candidates"].as_array() {
            if let Some(content) = candidates.first().and_then(|c| c.get("content")) {
                if let Some(parts) = content["parts"].as_array() {
                    for part in parts {
                        if let Some(call) = part.get("functionCall") {
                            if call["name"].as_str() == Some("save_exam") {
                                if let Some(questions) = call["args"]["questions"].as_array() {
                                    return Ok(json!({ "success": true, "data": questions }));
                                }
                            }
                        }
                    }
                }
            }
        }
        
        Ok(json!({ "success": true, "data": [] }))
    }
}
