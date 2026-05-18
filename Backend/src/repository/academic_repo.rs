use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;
use rand;
use uuid;

pub struct PostgresAcademicRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::AcademicRepository for PostgresAcademicRepository {
    async fn add_class(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "INSERT INTO classes (id, school_id, name, total_students, total_teachers, total_periods, room_number, class_fees, sections, streams) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (school_id, id) DO UPDATE SET 
                name = EXCLUDED.name,
                total_students = EXCLUDED.total_students,
                total_teachers = EXCLUDED.total_teachers,
                total_periods = EXCLUDED.total_periods,
                room_number = EXCLUDED.room_number,
                class_fees = EXCLUDED.class_fees,
                sections = EXCLUDED.sections,
                streams = EXCLUDED.streams"
        )
        .bind(data["id"].as_str())
        .bind(school_id)
        .bind(data["className"].as_str().or(data["name"].as_str()))
        .bind(data["totalClassStudents"].as_i64().or(data["total_students"].as_i64()).unwrap_or(0))
        .bind(data["totalClassTeachers"].as_i64().or(data["total_teachers"].as_i64()).unwrap_or(0))
        .bind(data["totalPeriods"].as_i64().or(data["total_periods"].as_i64()).unwrap_or(0))
        .bind(data["roomNumber"].as_str().or(data["room_number"].as_str()))
        .bind(data["classFees"].as_f64().or(data["class_fees"].as_f64()).unwrap_or(0.0))
        .bind(data["sections"].clone())
        .bind(data["streams"].clone())
        .execute(&mut *conn)
        .await?;
        Ok(data)
    }

    async fn get_classes(&self, school_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT id, name FROM classes WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;
        Ok(rows
            .into_iter()
            .map(|r| {
                let name = r.get::<String, _>("name");
                let id = r.get::<String, _>("id");
                json!({
                    "id": id,
                    "name": name,
                })
            })
            .collect())
    }

    async fn get_class(&self, school_id: &str, class_id: &str) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM classes WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(class_id)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(row.map(|r| {
            let id = r.get::<String, _>("id");
            let name = r.get::<String, _>("name");
            json!({
                "id": id,
                "classId": id,
                "name": name,
                "className": name,
                "roomNumber": r.get::<Option<String>, _>("room_number"),
                "sectionSize": r.get::<i32, _>("section_size"),
            })
        }))
    }

    async fn get_class_by_name(&self, school_id: &str, name: &str) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM classes WHERE school_id = $1 AND name = $2")
            .bind(school_id)
            .bind(name)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(row.map(|r| {
            let id = r.get::<String, _>("id");
            let name = r.get::<String, _>("name");
            json!({
                "id": id,
                "classId": id,
                "name": name,
                "className": name,
                "sectionSize": r.get::<i32, _>("section_size"),
            })
        }))
    }

    async fn update_class(&self, school_id: &str, class_id: &str, data: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("UPDATE classes SET name = COALESCE($1, name), room_number = COALESCE($2, room_number) WHERE school_id = $3 AND id = $4")
            .bind(data["className"].as_str())
            .bind(data["roomNumber"].as_str())
            .bind(school_id).bind(class_id).execute(&mut *conn).await?;
        Ok(())
    }

    async fn update_class_aggregates(&self, school_id: &str, class_id: &str, aggregates: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("UPDATE classes SET total_students = $1, total_teachers = $2, total_periods = $3, class_fees = $4 WHERE school_id = $5 AND id = $6")
            .bind(aggregates["totalStudents"].as_i64())
            .bind(aggregates["totalTeachers"].as_i64())
            .bind(aggregates["totalPeriods"].as_i64())
            .bind(aggregates["classFees"].as_f64())
            .bind(school_id).bind(class_id).execute(&mut *conn).await?;
        Ok(())
    }

    async fn get_class_students_count(&self, school_id: &str, class_name: &str) -> Result<i64, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT COUNT(*) FROM students WHERE school_id = $1 AND class_name = $2")
                .bind(school_id)
                .bind(class_name)
                .fetch_one(&mut *conn)
                .await?;
        Ok(row.get(0))
    }

    async fn add_subject(&self, school_id: &str, mut data: Value) -> Result<Value, AppError> {
        let subject_id = if let Some(id) = data["subjectId"].as_str() {
            id.to_string()
        } else {
            let id = self.generate_subject_id(data["subjectName"].as_str().unwrap_or("SUBJ")).await?;
            data["subjectId"] = json!(id);
            id
        };

        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO subjects (id, school_id, name, class_id, class_name, fees, is_compulsory, category, fee_type, fee_interval, schedule_type, schedule_data) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
                     ON CONFLICT (school_id, id) DO UPDATE SET 
                        name = EXCLUDED.name, 
                        class_id = EXCLUDED.class_id, 
                        class_name = EXCLUDED.class_name, 
                        fees = EXCLUDED.fees,
                        is_compulsory = EXCLUDED.is_compulsory,
                        category = EXCLUDED.category,
                        fee_type = EXCLUDED.fee_type,
                        fee_interval = EXCLUDED.fee_interval,
                        schedule_type = EXCLUDED.schedule_type,
                        schedule_data = EXCLUDED.schedule_data")
            .bind(&subject_id)
            .bind(school_id)
            .bind(data["subjectName"].as_str().or(data["name"].as_str()))
            .bind(data["classId"].as_str())
            .bind(data["className"].as_str())
            .bind(data["subjectFees"].as_f64().or(data["fees"].as_f64()))
            .bind(data["isCompulsory"].as_bool().unwrap_or(true))
            .bind(data["category"].as_str())
            .bind(data["feeType"].as_str().unwrap_or("monthly"))
            .bind(data["feeInterval"].as_i64().unwrap_or(1) as i32)
            .bind(data["scheduleType"].as_str().unwrap_or("daily"))
            .bind(data["scheduleData"].clone())
            .execute(&mut *conn).await?;
        Ok(data)
    }

    async fn generate_subject_id(&self, subject_name: &str) -> Result<String, AppError> {
        let clean = subject_name.replace(' ', "");
        let prefix = clean[..std::cmp::min(4, clean.len())].to_uppercase();
        let random = rand::random::<u32>() % 90000 + 10000;
        Ok(format!("{}{:05}", prefix, random))
    }

    async fn get_subjects(&self, school_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT * FROM subjects WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;
        Ok(rows.into_iter().map(|r| json!({
            "id": r.get::<String, _>("id"),
            "subjectId": r.get::<String, _>("id"),
            "name": r.get::<String, _>("name"),
            "subjectName": r.get::<String, _>("name"),
            "classId": r.get::<Option<String>, _>("class_id"),
            "className": r.get::<Option<String>, _>("class_name"),
            "fees": r.get::<f64, _>("fees"),
            "subjectFees": r.get::<f64, _>("fees"),
            "isCompulsory": r.get::<Option<bool>, _>("is_compulsory").unwrap_or(true),
            "category": r.get::<Option<String>, _>("category"),
            "feeType": r.get::<Option<String>, _>("fee_type").unwrap_or_else(|| "monthly".to_string()),
            "feeInterval": r.get::<Option<i32>, _>("fee_interval").unwrap_or(1),
            "scheduleType": r.get::<Option<String>, _>("schedule_type").unwrap_or_else(|| "daily".to_string()),
            "scheduleData": r.get::<Option<Value>, _>("schedule_data").unwrap_or(json!([])),
        })).collect())
    }

    async fn add_exam(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let quarter = data["quarter"].as_str();
        let status = data["status"].as_str().unwrap_or("DRAFT");
        let exam_type = data["examType"].as_str().unwrap_or("MAIN");
        
        let row = sqlx::query(
            "INSERT INTO exams (school_id, name, quarter, start_date, end_date, status, exam_type) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             ON CONFLICT (school_id, name) DO UPDATE SET 
                start_date = EXCLUDED.start_date, 
                end_date = EXCLUDED.end_date, 
                quarter = EXCLUDED.quarter, 
                status = EXCLUDED.status,
                exam_type = EXCLUDED.exam_type
             RETURNING id"
        )
        .bind(school_id)
        .bind(data["name"].as_str())
        .bind(quarter)
        .bind(data["startDate"].as_str().map(|d| d.parse::<chrono::NaiveDate>().unwrap_or_else(|_| chrono::Utc::now().date_naive())))
        .bind(data["endDate"].as_str().map(|d| d.parse::<chrono::NaiveDate>().unwrap_or_else(|_| chrono::Utc::now().date_naive())))
        .bind(status)
        .bind(exam_type)
        .fetch_one(&mut *conn).await?;
        
        let mut res = data.clone();
        res["id"] = json!(row.get::<i32, _>("id"));
        Ok(res)
    }

    async fn get_exams(&self, school_id: &str, _student_id: Option<&str>) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT * FROM exams WHERE school_id = $1 ORDER BY created_at DESC")
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;
        Ok(rows.into_iter().map(|r| json!({
            "id": r.get::<i32, _>("id"), 
            "name": r.get::<String, _>("name"),
            "quarter": r.try_get::<Option<String>, _>("quarter").unwrap_or(None),
            "startDate": r.get::<Option<chrono::NaiveDate>, _>("start_date").map(|d| d.to_string()),
            "endDate": r.get::<Option<chrono::NaiveDate>, _>("end_date").map(|d| d.to_string()),
            "status": r.try_get::<Option<String>, _>("status").unwrap_or(Some("DRAFT".to_string())),
            "examType": r.try_get::<Option<String>, _>("exam_type").unwrap_or(Some("MAIN".to_string())),
        })).collect())
    }

    async fn add_student_exam(&self, school_id: &str, student_id: &str, data: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO audit_logs (school_id, target_type, target_id, action, data) VALUES ($1, 'exam', $2, 'submit_marks', $3)")
            .bind(school_id).bind(student_id).bind(data).execute(&mut *conn).await?;
        Ok(())
    }

    async fn add_topic(&self, data: Value) -> Result<Value, AppError> {
        sqlx::query("INSERT INTO topics (subject_id, name, description) VALUES ($1, $2, $3)")
            .bind(data["subjectId"].as_str())
            .bind(data["name"].as_str())
            .bind(data["description"].as_str())
            .execute(&self.client.pool)
            .await?;
        Ok(data)
    }

    async fn get_topics(&self) -> Result<JsonList, AppError> {
        let rows = sqlx::query("SELECT * FROM topics")
            .fetch_all(&self.client.pool)
            .await?;
        Ok(rows.into_iter().map(|r| json!({"id": r.get::<i32, _>("id"), "name": r.get::<String, _>("name")})).collect())
    }

    async fn add_period(&self, school_id: &str, class_id: &str, data: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO class_periods (school_id, class_id, name, start_time, end_time, teacher_id, subject_id) VALUES ($1, $2, $3, $4, $5, $6, $7)")
            .bind(school_id)
            .bind(class_id)
            .bind(data["name"].as_str())
            .bind(data["startTime"].as_str().map(|s| s.parse::<chrono::NaiveTime>().unwrap_or_else(|_| chrono::NaiveTime::from_hms_opt(0, 0, 0).unwrap())))
            .bind(data["endTime"].as_str().map(|s| s.parse::<chrono::NaiveTime>().unwrap_or_else(|_| chrono::NaiveTime::from_hms_opt(0, 0, 0).unwrap())))
            .bind(data["teacherId"].as_str())
            .bind(data["subjectId"].as_str())
            .execute(&mut *conn).await?;
        Ok(())
    }

    async fn get_periods_count(&self, school_id: &str, class_id: &str) -> Result<i64, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT COUNT(*) FROM class_periods WHERE school_id = $1 AND class_id = $2")
            .bind(school_id).bind(class_id).fetch_one(&mut *conn).await?;
        Ok(row.get(0))
    }

    async fn add_stream(&self, school_id: &str, class_id: &str, data: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO class_streams (school_id, class_id, name, data) VALUES ($1, $2, $3, $4)")
            .bind(school_id).bind(class_id).bind(data["name"].as_str()).bind(&data).execute(&mut *conn).await?;
        Ok(())
    }

    async fn delete_class(&self, school_id: &str, class_id: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM classes WHERE school_id = $1 AND id = $2")
            .bind(school_id).bind(class_id).execute(&mut *conn).await?;
        Ok(())
    }

    async fn get_subject(&self, school_id: &str, subject_id: &str) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM subjects WHERE school_id = $1 AND id = $2")
            .bind(school_id).bind(subject_id).fetch_optional(&mut *conn).await?;
        Ok(row.map(|r| json!({
            "id": r.get::<String, _>("id"),
            "name": r.get::<String, _>("name"),
            "classId": r.get::<Option<String>, _>("class_id"),
            "className": r.get::<Option<String>, _>("class_name"),
            "subjectFees": r.get::<f64, _>("fees"),
            "isCompulsory": r.get::<bool, _>("is_compulsory"),
            "category": r.get::<Option<String>, _>("category"),
            "feeType": r.get::<String, _>("fee_type"),
            "feeInterval": r.get::<i32, _>("fee_interval"),
            "scheduleType": r.get::<String, _>("schedule_type"),
            "scheduleData": r.get::<Value, _>("schedule_data")
        })))
    }

    async fn update_subject(&self, school_id: &str, subject_id: &str, data: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("UPDATE subjects SET name = COALESCE($3, name), fees = COALESCE($4, fees) WHERE school_id = $1 AND id = $2")
            .bind(school_id).bind(subject_id).bind(data["subjectName"].as_str()).bind(data["subjectFees"].as_f64()).execute(&mut *conn).await?;
        Ok(())
    }

    async fn delete_subject(&self, school_id: &str, subject_id: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM subjects WHERE school_id = $1 AND id = $2")
            .bind(school_id).bind(subject_id).execute(&mut *conn).await?;
        Ok(())
    }

    async fn get_exam(&self, school_id: &str, exam_id: &str) -> Result<Option<Value>, AppError> {
        let id_i32 = exam_id.parse::<i32>().unwrap_or(0);
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM exams WHERE school_id = $1 AND id = $2")
            .bind(school_id).bind(id_i32).fetch_optional(&mut *conn).await?;
        Ok(row.map(|r| json!({
            "id": r.get::<i32, _>("id"), 
            "name": r.get::<String, _>("name"),
            "quarter": r.try_get::<Option<String>, _>("quarter").unwrap_or(None),
            "startDate": r.get::<Option<chrono::NaiveDate>, _>("start_date").map(|d| d.to_string()),
            "endDate": r.get::<Option<chrono::NaiveDate>, _>("end_date").map(|d| d.to_string()),
            "status": r.try_get::<Option<String>, _>("status").unwrap_or(Some("DRAFT".to_string())),
        })))
    }

    async fn update_exam(&self, school_id: &str, exam_id: &str, data: Value) -> Result<(), AppError> {
        let id_i32 = exam_id.parse::<i32>().unwrap_or(0);
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("UPDATE exams SET name = $3, start_date = $4, end_date = $5, quarter = COALESCE($6, quarter), status = COALESCE($7, status) WHERE school_id = $1 AND id = $2")
            .bind(school_id).bind(id_i32).bind(data["name"].as_str())
            .bind(data["startDate"].as_str().map(|d| d.parse::<chrono::NaiveDate>().unwrap_or_else(|_| chrono::Utc::now().date_naive())))
            .bind(data["endDate"].as_str().map(|d| d.parse::<chrono::NaiveDate>().unwrap_or_else(|_| chrono::Utc::now().date_naive())))
            .bind(data["quarter"].as_str())
            .bind(data["status"].as_str())
            .execute(&mut *conn).await?;
        Ok(())
    }

    async fn delete_exam(&self, school_id: &str, exam_id: &str) -> Result<(), AppError> {
        let id_i32 = exam_id.parse::<i32>().unwrap_or(0);
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM exams WHERE school_id = $1 AND id = $2")
            .bind(school_id).bind(id_i32).execute(&mut *conn).await?;
        Ok(())
    }

    async fn add_exam_section(&self, school_id: &str, exam_id: i32, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let row = sqlx::query(
            "INSERT INTO exam_sections (school_id, exam_id, class_id, subject_id, syllabus, ai_generated_paper, questions, total_marks) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             ON CONFLICT (school_id, exam_id, class_id, subject_id) DO UPDATE SET 
                syllabus = EXCLUDED.syllabus,
                ai_generated_paper = EXCLUDED.ai_generated_paper,
                questions = EXCLUDED.questions,
                total_marks = EXCLUDED.total_marks
             RETURNING id"
        )
        .bind(school_id)
        .bind(exam_id)
        .bind(data["classId"].as_str().unwrap_or(""))
        .bind(data["subjectId"].as_str().unwrap_or(""))
        .bind(data.get("syllabus").cloned().unwrap_or(json!([])))
        .bind(data.get("aiGeneratedPaper").and_then(|v| v.as_bool()).unwrap_or(false))
        .bind(data.get("questions").cloned().unwrap_or(json!([])))
        .bind(data.get("totalMarks").and_then(|v| v.as_i64()).unwrap_or(0) as i32)
        .fetch_one(&mut *conn).await?;
        
        let mut response = data.clone();
        response["id"] = json!(row.get::<i32, _>("id"));
        Ok(response)
    }

    async fn get_exam_sections(&self, school_id: &str, exam_id: i32) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT * FROM exam_sections WHERE school_id = $1 AND exam_id = $2 ORDER BY created_at DESC")
            .bind(school_id)
            .bind(exam_id)
            .fetch_all(&mut *conn)
            .await?;
            
        Ok(rows.into_iter().map(|r| json!({
            "id": r.get::<i32, _>("id"),
            "examId": r.get::<i32, _>("exam_id"),
            "classId": r.get::<String, _>("class_id"),
            "subjectId": r.get::<String, _>("subject_id"),
            "syllabus": r.get::<Value, _>("syllabus"),
            "aiGeneratedPaper": r.get::<Option<bool>, _>("ai_generated_paper").unwrap_or(false),
            "questions": r.get::<Value, _>("questions"),
            "totalMarks": r.get::<Option<i32>, _>("total_marks").unwrap_or(0),
        })).collect())
    }

    async fn update_exam_section(&self, school_id: &str, section_id: i32, data: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "UPDATE exam_sections SET 
             syllabus = COALESCE($3, syllabus),
             ai_generated_paper = COALESCE($4, ai_generated_paper),
             questions = COALESCE($5, questions),
             total_marks = COALESCE($6, total_marks)
             WHERE school_id = $1 AND id = $2"
        )
        .bind(school_id)
        .bind(section_id)
        .bind(data.get("syllabus").cloned())
        .bind(data.get("aiGeneratedPaper").and_then(|v| v.as_bool()))
        .bind(data.get("questions").cloned())
        .bind(data.get("totalMarks").and_then(|v| v.as_i64()).map(|m| m as i32))
        .execute(&mut *conn).await?;
        
        Ok(())
    }

    async fn add_chapter(&self, school_id: &str, subject_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let name = data["name"].as_str().unwrap_or("Unnamed Chapter");
        let description = data["description"].as_str();
        let sequence_order = data["sequenceOrder"].as_i64().unwrap_or(1) as i32;
        let is_taught = data["isTaught"].as_bool().unwrap_or(false);
        let weightage = data["weightage"].as_i64().unwrap_or(1) as i32;

        let row = sqlx::query(
            "INSERT INTO chapters (school_id, subject_id, name, description, sequence_order, is_taught, weightage) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             ON CONFLICT (school_id, subject_id, name) DO UPDATE SET 
                description = EXCLUDED.description,
                sequence_order = EXCLUDED.sequence_order,
                is_taught = EXCLUDED.is_taught,
                weightage = EXCLUDED.weightage
             RETURNING id"
        )
        .bind(school_id)
        .bind(subject_id)
        .bind(name)
        .bind(description)
        .bind(sequence_order)
        .bind(is_taught)
        .bind(weightage)
        .fetch_one(&mut *conn).await?;

        let mut res = data.clone();
        res["id"] = json!(row.get::<i32, _>("id"));
        res["schoolId"] = json!(school_id);
        res["subjectId"] = json!(subject_id);
        Ok(res)
    }

    async fn get_chapters(&self, school_id: &str, subject_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT * FROM chapters WHERE school_id = $1 AND subject_id = $2 ORDER BY sequence_order ASC")
            .bind(school_id)
            .bind(subject_id)
            .fetch_all(&mut *conn)
            .await?;

        Ok(rows.into_iter().map(|r| json!({
            "id": r.get::<i32, _>("id"),
            "schoolId": r.get::<String, _>("school_id"),
            "subjectId": r.get::<String, _>("subject_id"),
            "name": r.get::<String, _>("name"),
            "description": r.get::<Option<String>, _>("description"),
            "sequenceOrder": r.get::<Option<i32>, _>("sequence_order").unwrap_or(1),
            "isTaught": r.get::<Option<bool>, _>("is_taught").unwrap_or(false),
            "weightage": r.get::<Option<i32>, _>("weightage").unwrap_or(1),
        })).collect())
    }

    async fn update_chapter(&self, school_id: &str, chapter_id: i32, data: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "UPDATE chapters SET 
             name = COALESCE($3, name),
             description = COALESCE($4, description),
             sequence_order = COALESCE($5, sequence_order),
             is_taught = COALESCE($6, is_taught),
             weightage = COALESCE($7, weightage)
             WHERE school_id = $1 AND id = $2"
        )
        .bind(school_id)
        .bind(chapter_id)
        .bind(data.get("name").and_then(|v| v.as_str()))
        .bind(data.get("description").and_then(|v| v.as_str()))
        .bind(data.get("sequenceOrder").and_then(|v| v.as_i64()).map(|v| v as i32))
        .bind(data.get("isTaught").and_then(|v| v.as_bool()))
        .bind(data.get("weightage").and_then(|v| v.as_i64()).map(|v| v as i32))
        .execute(&mut *conn).await?;

        Ok(())
    }

    // ---- Exam Checker Workflow ----

    async fn assign_exam_checker(&self, school_id: &str, exam_id: &str, checker_employee_id: &str) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let now = chrono::Utc::now();
        sqlx::query(
            "UPDATE exams SET checker_employee_id = $1, checker_assigned_at = $2 WHERE school_id = $3 AND id = $4::integer RETURNING id"
        )
        .bind(checker_employee_id)
        .bind(now)
        .bind(school_id)
        .bind(exam_id)
        .execute(&mut *conn)
        .await?;
        Ok(json!({
            "examId": exam_id,
            "checkerEmployeeId": checker_employee_id,
            "assignedAt": now.to_rfc3339()
        }))
    }

    async fn get_checker_exams(&self, school_id: &str, checker_employee_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT e.*, es.subject_id, es.class_id FROM exams e LEFT JOIN exam_sections es ON e.id = es.exam_id AND es.school_id = e.school_id WHERE e.school_id = $1 AND e.checker_employee_id = $2 AND e.results_published = FALSE ORDER BY e.created_at ASC")
            .bind(school_id)
            .bind(checker_employee_id)
            .fetch_all(&mut *conn)
            .await?;
        Ok(rows.into_iter().map(|r| json!({
            "id": r.get::<i32, _>("id"),
            "name": r.get::<String, _>("name"),
            "quarter": r.get::<Option<String>, _>("quarter"),
            "status": r.get::<String, _>("status"),
            "examType": r.get::<Option<String>, _>("exam_type"),
            "startDate": r.get::<Option<String>, _>("start_date").map(|d| d.to_string()),
            "endDate": r.get::<Option<String>, _>("end_date").map(|d| d.to_string()),
            "subjectId": r.get::<Option<String>, _>("subject_id"),
            "classId": r.get::<Option<String>, _>("class_id"),
            "checkerAssignedAt": r.get::<Option<String>, _>("checker_assigned_at").map(|d| d.to_string()),
            "strictnessLevel": r.get::<Option<String>, _>("strictness_level").unwrap_or_else(|| "medium".to_string()),
        })).collect())
    }

    async fn get_exam_submissions(&self, school_id: &str, exam_id: &str, status: Option<&str>) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = if let Some(s) = status {
            sqlx::query("SELECT ss.*, agr.overall_score, agr.grade, agr.feedback, agr.criteria_scores, agr.confidence_score
                FROM student_submissions ss
                LEFT JOIN ai_grading_results agr ON ss.submission_id = agr.submission_id
                WHERE ss.school_id = $1 AND ss.exam_id = $2 AND ss.status = $3
                ORDER BY ss.student_id")
                .bind(school_id).bind(exam_id).bind(s)
                .fetch_all(&mut *conn).await?
        } else {
            sqlx::query("SELECT ss.*, agr.overall_score, agr.grade, agr.feedback, agr.criteria_scores, agr.confidence_score
                FROM student_submissions ss
                LEFT JOIN ai_grading_results agr ON ss.submission_id = agr.submission_id
                WHERE ss.school_id = $1 AND ss.exam_id = $2
                ORDER BY ss.student_id")
                .bind(school_id).bind(exam_id)
                .fetch_all(&mut *conn).await?
        };
        Ok(rows.into_iter().map(|r| {
            let sub_id: uuid::Uuid = r.get("submission_id");
            json!({
                "submissionId": sub_id.to_string(),
                "studentId": r.get::<String, _>("student_id"),
                "status": r.get::<String, _>("status"),
                "submissionType": r.get::<String, _>("submission_type"),
                "checkedBy": r.get::<Option<String>, _>("checked_by"),
                "checkedAt": r.get::<Option<String>, _>("checked_at").map(|d| d.to_string()),
                "overallScore": r.get::<Option<bigdecimal::BigDecimal>, _>("overall_score").map(|d| d.to_string()),
                "grade": r.get::<Option<String>, _>("grade"),
                "feedback": r.get::<Option<String>, _>("feedback"),
                "imageMetadata": r.get::<Option<Value>, _>("image_metadata"),
            })
        }).collect())
    }

    async fn update_submission_checker(&self, school_id: &str, submission_id: &str, checker_id: &str, checked_at: &str, data: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let sid = uuid::Uuid::parse_str(submission_id)?;

        // Update student_submissions status
        sqlx::query("UPDATE student_submissions SET status = 'checker_reviewed', checked_by = $1, checked_at = $2 WHERE school_id = $3 AND submission_id = $4")
            .bind(checker_id).bind(checked_at).bind(school_id).bind(sid)
            .execute(&mut *conn).await?;

        // Update ai_grading_results with checker review data
        let checker_notes = data["checkerNotes"].as_str();
        let adjusted_score = data["adjustedScore"].as_f64();
        sqlx::query(
            "UPDATE ai_grading_results SET reviewed_by_checker = TRUE, checker_id = $1, checker_notes = $2, \
             teacher_adjusted_score = COALESCE($3, teacher_adjusted_score), strictness_used = $4 \
             WHERE school_id = $5 AND submission_id = $6"
        )
        .bind(checker_id)
        .bind(checker_notes)
        .bind(adjusted_score)
        .bind(data["strictnessUsed"].as_str())
        .bind(school_id)
        .bind(sid)
        .execute(&mut *conn).await?;

        Ok(())
    }

    async fn update_exam_grading_approval(&self, school_id: &str, submission_id: &str, teacher_id: &str, data: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let sid = uuid::Uuid::parse_str(submission_id)?;
        let approved = data["teacherApproved"].as_bool().unwrap_or(true);
        let new_status = if approved { "teacher_approved" } else { "teacher_rejected" };
        let teacher_notes = data["teacherNotes"].as_str();
        let adjusted_score = data["adjustedScore"].as_f64();

        // Update submission status
        sqlx::query("UPDATE student_submissions SET status = $1 WHERE school_id = $2 AND submission_id = $3")
            .bind(new_status).bind(school_id).bind(sid)
            .execute(&mut *conn).await?;

        // Update grading results
        sqlx::query(
            "UPDATE ai_grading_results SET teacher_approved = $1, teacher_id = $2, teacher_notes = $3, \
             teacher_adjusted_score = COALESCE($4, teacher_adjusted_score), is_finalized = $5 \
             WHERE school_id = $6 AND submission_id = $7"
        )
        .bind(approved)
        .bind(teacher_id)
        .bind(teacher_notes)
        .bind(adjusted_score)
        .bind(approved) // finalized only when approved
        .bind(school_id)
        .bind(sid)
        .execute(&mut *conn).await?;

        Ok(())
    }

    async fn publish_exam_results(&self, school_id: &str, exam_id: &str, admin_id: &str) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE exams SET results_published = TRUE, results_published_at = $1, approved_by = $2, approved_at = $1 WHERE school_id = $3 AND id = $4::integer"
        )
        .bind(&now).bind(admin_id).bind(school_id).bind(exam_id)
        .execute(&mut *conn).await?;

        Ok(json!({
            "examId": exam_id,
            "resultsPublished": true,
            "publishedAt": now
        }))
    }
}
