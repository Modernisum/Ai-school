use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;
use rand;

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
        sqlx::query("INSERT INTO exams (school_id, name, start_date, end_date) VALUES ($1, $2, $3, $4) ON CONFLICT (school_id, name) DO UPDATE SET start_date = EXCLUDED.start_date")
            .bind(school_id)
            .bind(data["name"].as_str())
            .bind(data["startDate"].as_str().map(|d| d.parse::<chrono::NaiveDate>().unwrap_or_else(|_| chrono::Utc::now().date_naive())))
            .bind(data["endDate"].as_str().map(|d| d.parse::<chrono::NaiveDate>().unwrap_or_else(|_| chrono::Utc::now().date_naive())))
            .execute(&mut *conn).await?;
        Ok(data)
    }

    async fn get_exams(&self, school_id: &str, _student_id: Option<&str>) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT * FROM exams WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;
        Ok(rows.into_iter().map(|r| json!({"id": r.get::<i32, _>("id"), "name": r.get::<String, _>("name")})).collect())
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
        Ok(row.map(|r| json!({"id": r.get::<i32, _>("id"), "name": r.get::<String, _>("name")})))
    }

    async fn update_exam(&self, school_id: &str, exam_id: &str, data: Value) -> Result<(), AppError> {
        let id_i32 = exam_id.parse::<i32>().unwrap_or(0);
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("UPDATE exams SET name = $3, start_date = $4, end_date = $5 WHERE school_id = $1 AND id = $2")
            .bind(school_id).bind(id_i32).bind(data["name"].as_str())
            .bind(data["startDate"].as_str().map(|d| d.parse::<chrono::NaiveDate>().unwrap_or_else(|_| chrono::Utc::now().date_naive())))
            .bind(data["endDate"].as_str().map(|d| d.parse::<chrono::NaiveDate>().unwrap_or_else(|_| chrono::Utc::now().date_naive())))
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
}
