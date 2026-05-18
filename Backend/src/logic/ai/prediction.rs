use crate::logic::ai::utils;
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
        
        let api_key = utils::fetch_api_key(&self.repos).await?;
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
        let api_key = utils::fetch_api_key(&self.repos).await?;
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
        
        let template = payload["template"].as_str()
            .or_else(|| payload["template_type"].as_str())
            .unwrap_or("");
        let total_marks = payload["totalMarks"].as_i64()
            .or_else(|| payload["total_marks"].as_i64())
            .unwrap_or(0);

        let (template_prompt, num_questions_str) = match (template, total_marks) {
            (_, 30) | ("Nursery", _) => (
                "The exam must strictly follow the Nursery pattern for a total of 30 marks: \
                - Exactly 10 MCQ questions (each 1 mark) \
                - Exactly 5 Match the following questions (each 2 marks) \
                - Exactly 5 Oral or Tracing questions (each 2 marks). \
                Each question object MUST have a type of 'MCQ', 'Match', or 'Oral'/'Trace' and include a \"marks\" integer field with the correct weight.",
                "Exactly 20 questions matching the Nursery schema specified above"
            ),
            (_, 50) | ("Primary", _) => (
                "The exam must strictly follow the Primary pattern for a total of 50 marks: \
                - Exactly 15 MCQ questions (each 1 mark) \
                - Exactly 10 Short Answer questions (each 2 marks) \
                - Exactly 3 Long Answer questions (each 5 marks). \
                Each question object MUST have a type of 'MCQ', 'Short', or 'Long' and include a \"marks\" integer field with the correct weight.",
                "Exactly 28 questions matching the Primary schema specified above"
            ),
            (_, 70) | ("Secondary", _) => (
                "The exam must strictly follow the Secondary pattern for a total of 70 marks: \
                - Exactly 20 MCQ questions (each 1 mark) \
                - Exactly 15 Short Answer questions (each 2 marks) \
                - Exactly 4 Long Answer questions (each 5 marks). \
                Each question object MUST have a type of 'MCQ', 'Short', or 'Long' and include a \"marks\" integer field with the correct weight.",
                "Exactly 39 questions matching the Secondary schema specified above"
            ),
            (t, _) if t.eq_ignore_ascii_case("Nursery") => (
                "The exam must strictly follow the Nursery pattern for a total of 30 marks: \
                - Exactly 10 MCQ questions (each 1 mark) \
                - Exactly 5 Match the following questions (each 2 marks) \
                - Exactly 5 Oral or Tracing questions (each 2 marks). \
                Each question object MUST have a type of 'MCQ', 'Match', or 'Oral'/'Trace' and include a \"marks\" integer field with the correct weight.",
                "Exactly 20 questions matching the Nursery schema specified above"
            ),
            (t, _) if t.eq_ignore_ascii_case("Primary") => (
                "The exam must strictly follow the Primary pattern for a total of 50 marks: \
                - Exactly 15 MCQ questions (each 1 mark) \
                - Exactly 10 Short Answer questions (each 2 marks) \
                - Exactly 3 Long Answer questions (each 5 marks). \
                Each question object MUST have a type of 'MCQ', 'Short', or 'Long' and include a \"marks\" integer field with the correct weight.",
                "Exactly 28 questions matching the Primary schema specified above"
            ),
            (t, _) if t.eq_ignore_ascii_case("Secondary") => (
                "The exam must strictly follow the Secondary pattern for a total of 70 marks: \
                - Exactly 20 MCQ questions (each 1 mark) \
                - Exactly 15 Short Answer questions (each 2 marks) \
                - Exactly 4 Long Answer questions (each 5 marks). \
                Each question object MUST have a type of 'MCQ', 'Short', or 'Long' and include a \"marks\" integer field with the correct weight.",
                "Exactly 39 questions matching the Secondary schema specified above"
            ),
            _ => (
                "Design a balanced mix of MCQ (1 mark), Short Answer (2 marks), and Long Answer (5 marks) questions. \
                Each question object MUST include a \"marks\" integer field with the correct weight.",
                "5 excellent questions"
            )
        };
        
        let prompt = format!(
            "You are Vidhyam AI.
            Design a professional school exam for class level: '{}' and Subject: '{}'.
            Difficulty level: '{}'.
            Desired format: '{}' (e.g. MCQ, Short Answer, Long Answer, or Mixed).
            {}
            Generate a JSON array using tool 'save_exam'. The array MUST have objects exactly matching:
            {{ \"type\": \"MCQ\" | \"Short\" | \"Long\" | \"Match\" | \"Oral\" | \"Trace\", \"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"] (only for MCQ), \"answer\": \"...\", \"marks\": i32 }}
            Provide {}.",
            class_id, subject, difficulty, format, template_prompt, num_questions_str
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
                                        "answer": { "type": "string" },
                                        "marks": { "type": "integer" }
                                    },
                                    "required": ["type", "question", "answer", "marks"]
                                } 
                            } 
                        }, 
                        "required": ["questions"] 
                    } 
                }
            ]
        }]);
        
        let contents = vec![json!({ "role": "user", "parts": [{ "text": prompt }] })];
        let api_key = utils::fetch_api_key(&self.repos).await?;
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

    pub async fn regenerate_exam_question(&self, school_id: &str, payload: &Value) -> Result<Value> {
        let section_id = payload["examSectionId"].as_i64()
            .or_else(|| payload["sectionId"].as_i64())
            .ok_or_else(|| anyhow!("examSectionId is required"))? as i32;
        let question_index = payload["questionIndex"].as_i64()
            .ok_or_else(|| anyhow!("questionIndex is required"))? as usize;

        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        // 1. Fetch current questions
        let row = sqlx::query("SELECT questions FROM exam_sections WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(section_id)
            .fetch_optional(&mut *conn)
            .await?;

        let row = row.ok_or_else(|| anyhow!("Exam section not found"))?;
        let mut questions_val: Value = row.get("questions");
        let questions_arr = questions_val.as_array_mut()
            .ok_or_else(|| anyhow!("Questions field is not a JSON array"))?;

        if question_index >= questions_arr.len() {
            return Err(anyhow!("Question index out of bounds"));
        }

        // 2. Extract original question details
        let original_q = &questions_arr[question_index];
        let q_type = original_q["type"].as_str().unwrap_or("MCQ");
        let q_marks = original_q["marks"].as_i64().unwrap_or(1);
        let q_text = original_q["question"].as_str().unwrap_or("");

        let topic = payload["topic"].as_str().unwrap_or("");
        let difficulty = payload["difficulty"].as_str().unwrap_or("Medium");
        let class_id = payload["classId"].as_str().unwrap_or("");
        let subject = payload["subject"].as_str().unwrap_or("");

        // 3. Draft Gemini prompt for single question regeneration
        let prompt = format!(
            "You are a professional school examiner.
            Regenerate exactly ONE question to replace an existing one.
            Target Question Type: '{}'
            Target Marks: {}
            Topic/Context: '{}'
            Subject: '{}'
            Class Level: '{}'
            Difficulty: '{}'
            Original question to replace (do not generate a duplicate of this): '{}'

            Generate a single question object using the tool 'save_single_question'. The object MUST exactly match:
            {{ \"type\": \"{}\", \"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"] (only if MCQ), \"answer\": \"...\", \"marks\": {} }}",
            q_type, q_marks, topic, subject, class_id, difficulty, q_text, q_type, q_marks
        );

        let tools = json!([{
            "function_declarations": [
                { 
                    "name": "save_single_question", 
                    "description": "Save the single regenerated question.", 
                    "parameters": { 
                        "type": "object", 
                        "properties": { 
                            "question": { 
                                "type": "object",
                                "properties": {
                                    "type": { "type": "string" },
                                    "question": { "type": "string" },
                                    "options": { "type": "array", "items": { "type": "string"} },
                                    "answer": { "type": "string" },
                                    "marks": { "type": "integer" }
                                },
                                "required": ["type", "question", "answer", "marks"]
                            }
                        }, 
                        "required": ["question"] 
                    } 
                }
            ]
        }]);

        let contents = vec![json!({ "role": "user", "parts": [{ "text": prompt }] })];
        let api_key = utils::fetch_api_key(&self.repos).await?;
        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={}", api_key);
        let body = json!({ "contents": contents, "tools": tools, "system_instruction": { "parts": [{ "text": "Draft a single academic question." }] } });
        
        let res: Value = self.http_client.post(&url).json(&body).send().await?.json().await?;
        
        let mut new_question = json!(null);
        if let Some(candidates) = res["candidates"].as_array() {
            if let Some(content) = candidates.first().and_then(|c| c.get("content")) {
                if let Some(parts) = content["parts"].as_array() {
                    for part in parts {
                        if let Some(call) = part.get("functionCall") {
                            if call["name"].as_str() == Some("save_single_question") {
                                if let Some(q) = call["args"]["question"].as_object() {
                                    new_question = Value::Object(q.clone());
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        if new_question.is_null() {
            return Err(anyhow!("AI failed to generate a valid replacement question"));
        }

        // 4. Update the questions array
        questions_arr[question_index] = new_question.clone();

        // 5. Save back to the database
        sqlx::query("UPDATE exam_sections SET questions = $1 WHERE school_id = $2 AND id = $3")
            .bind(&questions_val)
            .bind(school_id)
            .bind(section_id)
            .execute(&mut *conn)
            .await?;

        Ok(json!({
            "success": true,
            "regeneratedQuestion": new_question,
            "questions": questions_val
        }))
    }

    pub async fn grade_test_submission(&self, school_id: &str, payload: &Value) -> Result<Value> {
        let student_id = payload["studentId"].as_str().ok_or_else(|| anyhow!("studentId is required"))?;
        let exam_id_str = payload["examId"].as_str().ok_or_else(|| anyhow!("examId is required"))?;
        let submission_type = payload["submissionType"].as_str().unwrap_or("exam");
        let is_omr = payload["isOmr"].as_bool().unwrap_or(false);
        let student_answers = payload["answers"].as_array().ok_or_else(|| anyhow!("answers array is required"))?;

        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;

        // 1. Fetch exam section questions + strictness level
        let exam_id_i32 = exam_id_str.parse::<i32>().unwrap_or(0);
        let strictness = payload["strictness"].as_str().unwrap_or("medium");
        let section_row = sqlx::query(
            "SELECT es.questions, es.total_marks, COALESCE(e.strictness_level, 'medium') as strictness \
             FROM exam_sections es \
             JOIN exams e ON e.id = es.exam_id AND e.school_id = es.school_id \
             WHERE es.school_id = $1 AND es.exam_id = $2"
        )
            .bind(school_id)
            .bind(exam_id_i32)
            .fetch_optional(&mut *conn)
            .await?;

        let (questions_val, total_marks, exam_strictness) = match section_row {
            Some(row) => {
                let q: Value = row.get("questions");
                let m: Option<i32> = row.get("total_marks");
                let s: String = row.get("strictness");
                (q, m.unwrap_or(100), s)
            }
            None => return Err(anyhow!("Exam section questions not found for exam_id {}", exam_id_str)),
        };
        let effective_strictness = if strictness == "exam_default" { &exam_strictness } else { strictness };

        let questions_arr = questions_val.as_array()
            .ok_or_else(|| anyhow!("Exam section questions are not a JSON array"))?;

        let mut final_score = 0.0;
        let mut criteria_scores = json!([]);
        let mut overall_feedback = String::new();

        if is_omr {
            // OMR Auto-Grading (Deterministic scoring)
            let mut correct_count = 0;
            let mut grading_details = vec![];

            for (idx, q) in questions_arr.iter().enumerate() {
                let q_type = q["type"].as_str().unwrap_or("MCQ");
                let max_q_marks = q["marks"].as_i64().unwrap_or(1) as f64;
                let correct_ans = q["answer"].as_str().unwrap_or("").trim();
                
                // Find student's answer for this index
                let student_ans_opt = student_answers.iter().find(|ans| {
                    ans["questionIndex"].as_i64() == Some(idx as i64)
                }).and_then(|ans| ans["answerText"].as_str());

                let student_ans = student_ans_opt.unwrap_or("").trim();
                let is_correct = student_ans.eq_ignore_ascii_case(correct_ans);

                let scored_marks = if is_correct {
                    correct_count += 1;
                    max_q_marks
                } else {
                    0.0
                };

                final_score += scored_marks;

                grading_details.push(json!({
                    "question_index": idx,
                    "type": q_type,
                    "max_marks": max_q_marks,
                    "score": scored_marks,
                    "correct_answer": correct_ans,
                    "student_answer": student_ans,
                    "feedback": if is_correct { "Correct answer" } else { "Incorrect answer" }
                }));
            }

            criteria_scores = Value::Array(grading_details);
            overall_feedback = format!("OMR Auto-Graded successfully. Correct: {}/{} questions.", correct_count, questions_arr.len());
        } else {
            // AI Dynamic Grading using Gemini for text/essay questions
            let mut questions_prompt = String::new();
            for (idx, q) in questions_arr.iter().enumerate() {
                let q_text = q["question"].as_str().unwrap_or("");
                let q_type = q["type"].as_str().unwrap_or("");
                let correct_ans = q["answer"].as_str().unwrap_or("");
                let q_marks = q["marks"].as_i64().unwrap_or(1);
                questions_prompt.push_str(&format!(
                    "Question {}: (Type: {}, Max Marks: {})\nText: {}\nCorrect Answer Key: {}\n\n",
                    idx, q_type, q_marks, q_text, correct_ans
                ));
            }

            let mut student_prompt = String::new();
            for ans in student_answers {
                let idx = ans["questionIndex"].as_i64().unwrap_or(0);
                let text = ans["answerText"].as_str().unwrap_or("");
                student_prompt.push_str(&format!("Student Response for Question {}: '{}'\n", idx, text));
            }

            let strictness_guide = match effective_strictness {
                "hard" => "Be very strict and critical. Deduct marks for minor errors, incomplete reasoning, or imprecise wording. Only award full marks for perfectly correct answers.",
                "low" => "Be lenient. Award partial marks generously for partially correct answers. Focus on whether the student understood the core concept.",
                _ => "Be balanced and fair. Award marks proportionally. Consider partial correctness and reasonable approaches even if the final answer is wrong.",
            };
            let prompt = format!(
                "You are an expert academic grader.
                Grade this student's exam submission fairly based on the questions and answer key provided.

                Strictness Level: {} — {}

                EXAM QUESTIONS AND KEY:
                {}

                STUDENT SUBMISSIONS:
                {}

                Grade each response. Provide a partial or full score based on max marks, brief qualitative feedback explaining the score, and overall qualitative feedback.
                Use the tool 'save_grading' to submit the scores.",
                effective_strictness, strictness_guide, questions_prompt, student_prompt
            );

            let tools = json!([{
                "function_declarations": [
                    { 
                        "name": "save_grading", 
                        "description": "Save AI grading results.", 
                        "parameters": { 
                            "type": "object", 
                            "properties": { 
                                "overall_score": { "type": "number", "description": "Sum of all scores across graded questions" },
                                "feedback": { "type": "string", "description": "Overall feedback for the exam" },
                                "criteria_scores": { 
                                    "type": "array", 
                                    "items": { 
                                        "type": "object",
                                        "properties": {
                                            "question_index": { "type": "integer" },
                                            "score": { "type": "number" },
                                            "feedback": { "type": "string" }
                                        },
                                        "required": ["question_index", "score", "feedback"]
                                    } 
                                } 
                            }, 
                            "required": ["overall_score", "feedback", "criteria_scores"] 
                        } 
                    }
                ]
            }]);

            let contents = vec![json!({ "role": "user", "parts": [{ "text": prompt }] })];
            let api_key = utils::fetch_api_key(&self.repos).await?;
            let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={}", api_key);
            let body = json!({ "contents": contents, "tools": tools, "system_instruction": { "parts": [{ "text": "Grade academic exams accurately." }] } });
            
            let res: Value = self.http_client.post(&url).json(&body).send().await?.json().await?;
            
            if let Some(candidates) = res["candidates"].as_array() {
                if let Some(content) = candidates.first().and_then(|c| c.get("content")) {
                    if let Some(parts) = content["parts"].as_array() {
                        for part in parts {
                            if let Some(call) = part.get("functionCall") {
                                if call["name"].as_str() == Some("save_grading") {
                                    let args = &call["args"];
                                    final_score = args["overall_score"].as_f64().unwrap_or(0.0);
                                    overall_feedback = args["feedback"].as_str().unwrap_or("").to_string();
                                    criteria_scores = args["criteria_scores"].clone();
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Calculate Grade (A, B, C, D, F)
        let max_total_marks = if total_marks > 0 { total_marks as f64 } else { 100.0 };
        let percentage = (final_score / max_total_marks) * 100.0;
        let grade = if percentage >= 90.0 {
            "A".to_string()
        } else if percentage >= 80.0 {
            "B".to_string()
        } else if percentage >= 70.0 {
            "C".to_string()
        } else if percentage >= 60.0 {
            "D".to_string()
        } else {
            "F".to_string()
        };

        // 3. Save submission & grading results to Postgres
        let answers_json_str = serde_json::to_string(&payload["answers"])?;

        // 3a. Save to student_submissions (status = 'ai_graded' so checker can pick it up)
        let submission_row = sqlx::query(
            "INSERT INTO student_submissions (school_id, student_id, exam_id, submission_type, content, status) \
             VALUES ($1, $2, $3, $4, $5, 'ai_graded') RETURNING submission_id"
        )
        .bind(school_id)
        .bind(student_id)
        .bind(exam_id_str)
        .bind(submission_type)
        .bind(&answers_json_str)
        .fetch_one(&mut *conn)
        .await?;

        let submission_id: uuid::Uuid = submission_row.get("submission_id");

        // 3b. Save to ai_grading_results
        sqlx::query(
            "INSERT INTO ai_grading_results (submission_id, school_id, overall_score, grade, criteria_scores, feedback, confidence_score, grading_provider, grading_model, strictness_used) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Gemini', 'gemini-1.5-pro', $8)"
        )
        .bind(submission_id)
        .bind(school_id)
        .bind(final_score)
        .bind(&grade)
        .bind(&criteria_scores)
        .bind(&overall_feedback)
        .bind(95.0)
        .bind(effective_strictness)
        .execute(&mut *conn)
        .await?;

        Ok(json!({
            "success": true,
            "submissionId": submission_id,
            "overallScore": final_score,
            "grade": grade,
            "feedback": overall_feedback,
            "criteriaScores": criteria_scores
        }))
    }
}

