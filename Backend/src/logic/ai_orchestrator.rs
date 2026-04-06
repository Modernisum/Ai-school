use crate::repository::Repositories;
use anyhow::{anyhow, Result};
use reqwest::Client;
use serde_json::{json, Value};
use sqlx::Row;
use sqlx::Column;
use std::sync::Arc;

pub struct AiOrchestrator {
    repos: Arc<Repositories>,
    http_client: Client,
}

impl AiOrchestrator {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self {
            repos,
            http_client: Client::new(),
        }
    }

    async fn fetch_api_key(&self) -> Result<String> {
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
                Call the 'schedule_tasks' tool with a list of tasks. Provide the date, task name, related entity (topic name), and priority.",
                context_str, pending_topics, upcoming_holidays
            )
        } else {
            format!(
                "You are Vidhyam AI Operational Scheduler.\n\
                Employee Role: '{}'\n\
                Employee has these broad duties: {}\n\
                Upcoming holidays (do not schedule heavy tasks here): {}\n\
                Generate a structured, day-by-day operational agenda for the next 7 working days, breaking down their broad duties into specific actionable daily tasks.\n\
                Call the 'schedule_tasks' tool with a list of tasks. Provide the date, task name, related entity (duty), and priority.",
                category, context_str, upcoming_holidays
            )
        };

        let tools = json!([{
            "function_declarations": [
                { 
                    "name": "schedule_tasks", 
                    "description": "Save generated tasks to the database.", 
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
                                        "entity_id": { "type": "string", "description": "Name of the topic" },
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
            "system_instruction": { "parts": [{ "text": "Plan efficiently. Only output the tool call." }] }
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
            Call 'reorganize_tool' with the new dates for these tasks.",
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

        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let prompt = format!(
            "You are Vidhyam AI.
            Design a professional school exam for class level: '{}' and Subject: '{}'.
            Difficulty level: '{}'.
            Desired format: '{}' (e.g. MCQ, Short Answer, Long Answer, or Mixed).
            Generate a JSON array using the tool 'save_exam'. The array MUST have objects exactly matching:
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
