use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use chrono::Datelike;
use serde_json::{json, Value};
use sqlx::Row;
use std::error::Error;
use std::sync::Arc;

// --- Auth Repository ---
pub struct PostgresAuthRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl AuthRepository for PostgresAuthRepository {
    async fn create_school(&self, data: Value) -> Result<(), Box<dyn Error + Send + Sync>> {
        let school_data = json!({
            "schoolCode": data["schoolCode"],
            "schoolAddress": data["schoolAddress"],
            "classLevel": data["classLevel"],
            "affiliatedBoard": data["affiliatedBoard"]
        });
        sqlx::query("INSERT INTO schools (school_id, school_name, data) VALUES ($1, $2, $3)")
            .bind(data["id"].as_str())
            .bind(data["schoolName"].as_str())
            .bind(school_data)
            .execute(&self.client.pool).await?;
        Ok(())
    }

    async fn get_auth_by_id(
        &self,
        id: &str,
    ) -> Result<Option<Value>, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query("SELECT * FROM auth WHERE school_id = $1")
            .bind(id)
            .fetch_optional(&self.client.pool)
            .await?;
        Ok(row.map(|r| json!({"schoolId": r.get::<String, _>("school_id"), "password": r.get::<String, _>("password"), "securityAnswerHash": r.get::<Option<String>, _>("security_answer_hash")})))
    }

    async fn update_auth(&self, id: &str, data: Value) -> Result<(), Box<dyn Error + Send + Sync>> {
        if let Some(pass) = data["password"].as_str() {
            sqlx::query("INSERT INTO auth (school_id, password) VALUES ($1, $2) ON CONFLICT (school_id) DO UPDATE SET password = $2")
                .bind(id).bind(pass).execute(&self.client.pool).await?;
        }
        if let Some(q) = data["securityQuestion"].as_str() {
            sqlx::query("UPDATE auth SET security_question = $1, security_answer_hash = $2 WHERE school_id = $3")
                .bind(q).bind(data["securityAnswerHash"].as_str()).bind(id).execute(&self.client.pool).await?;
        }
        Ok(())
    }

    async fn save_token(
        &self,
        token_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO tokens (token_id, school_id, user_type, status, expires_at) VALUES ($1, $2, $3, $4, $5)")
            .bind(token_id)
            .bind(data["schoolId"].as_str())
            .bind(data["userType"].as_str().unwrap_or("school-admin"))
            .bind(data["status"].as_str().unwrap_or("valid"))
            .bind(
                chrono::DateTime::parse_from_rfc3339(data["expiresAt"].as_str().unwrap())?
                    .with_timezone(&chrono::Utc),
            )
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn get_token(
        &self,
        token_id: &str,
    ) -> Result<Option<Value>, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query("SELECT * FROM tokens WHERE token_id = $1 AND status = 'valid'")
            .bind(token_id)
            .fetch_optional(&self.client.pool)
            .await?;
        Ok(row.map(|r| json!({"tokenId": r.get::<String, _>("token_id"), "schoolId": r.get::<String, _>("school_id")})))
    }

    async fn delete_token(&self, token_id: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("DELETE FROM tokens WHERE token_id = $1")
            .bind(token_id)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn revoke_token(&self, token_id: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("UPDATE tokens SET status = 'revoked', revoked_at = NOW() WHERE token_id = $1")
            .bind(token_id)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn cleanup_expired_tokens(&self) -> Result<usize, Box<dyn Error + Send + Sync>> {
        let res = sqlx::query("DELETE FROM tokens WHERE expires_at < NOW()")
            .execute(&self.client.pool)
            .await?;
        Ok(res.rows_affected() as usize)
    }

    async fn add_auth_log(
        &self,
        id: &str,
        action: &str,
        details: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO auth_logs (school_id, action, details) VALUES ($1, $2, $3)")
            .bind(id)
            .bind(action)
            .bind(details)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn change_school_id(
        &self,
        old_id: &str,
        new_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        // Multi-table update for parity
        sqlx::query("UPDATE schools SET id = $1 WHERE id = $2")
            .bind(new_id)
            .bind(old_id)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn generate_school_code(&self) -> Result<String, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query("SELECT nextval('school_code_seq')")
            .fetch_one(&self.client.pool)
            .await?;
        let next_val: i64 = row.get(0);
        Ok(format!("S{:06}", next_val))
    }
}

// --- Student Repository ---
pub struct PostgresStudentRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl StudentRepository for PostgresStudentRepository {
    async fn add_student(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO students (student_id, school_id, class_name, name, roll_number, section) VALUES ($1, $2, $3, $4, $5, $6)")
            .bind(data["studentId"].as_str())
            .bind(school_id)
            .bind(data["className"].as_str())
            .bind(data["name"].as_str())
            .bind(data["rollNumber"].as_i64())
            .bind(data["section"].as_str())
            .execute(&self.client.pool).await?;
        Ok(data)
    }

    async fn get_students(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query("SELECT * FROM students WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&self.client.pool)
            .await?;
        Ok(rows.into_iter().map(|r| json!({"studentId": r.get::<String, _>("student_id"), "name": r.get::<Option<String>, _>("name"), "className": r.get::<Option<String>, _>("class_name"), "rollNumber": r.get::<Option<i32>, _>("roll_number")})).collect())
    }

    async fn get_student(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Option<Value>, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query("SELECT * FROM students WHERE school_id = $1 AND student_id = $2")
            .bind(school_id)
            .bind(student_id)
            .fetch_optional(&self.client.pool)
            .await?;
        Ok(row.map(|r| json!({"studentId": r.get::<String, _>("student_id"), "name": r.get::<Option<String>, _>("name"), "className": r.get::<Option<String>, _>("class_name"), "rollNumber": r.get::<Option<i32>, _>("roll_number")})))
    }

    async fn update_student(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("UPDATE students SET name = COALESCE($1, name), roll_number = COALESCE($2, roll_number) WHERE school_id = $3 AND student_id = $4")
            .bind(data["name"].as_str())
            .bind(data["rollNumber"].as_i64())
            .bind(school_id).bind(student_id).execute(&self.client.pool).await?;
        Ok(())
    }

    async fn delete_student(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("DELETE FROM students WHERE school_id = $1 AND student_id = $2")
            .bind(school_id)
            .bind(student_id)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn get_next_roll_number(
        &self,
        school_id: &str,
        class_name: &str,
    ) -> Result<i32, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query("SELECT COALESCE(MAX(roll_number), 0) + 1 FROM students WHERE school_id = $1 AND class_name = $2").bind(school_id).bind(class_name).fetch_one(&self.client.pool).await?;
        Ok(row.get(0))
    }

    async fn generate_student_id(&self) -> Result<String, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query("SELECT nextval('student_id_seq')")
            .fetch_one(&self.client.pool)
            .await?;
        let next_val: i64 = row.get(0);
        Ok(format!("S{:06}", next_val))
    }
}

// --- Academic Repository ---
pub struct PostgresAcademicRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl AcademicRepository for PostgresAcademicRepository {
    async fn add_class(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        sqlx::query(
            "INSERT INTO classes (id, school_id, name, total_students, total_teachers, total_periods, room_number, class_fees, sections, streams) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (school_id, id) DO NOTHING"
        )
        .bind(data["id"].as_str())
        .bind(school_id)
        .bind(data["className"].as_str())
        .bind(data["totalClassStudents"].as_i64().unwrap_or(0))
        .bind(data["totalClassTeachers"].as_i64().unwrap_or(0))
        .bind(data["totalPeriods"].as_i64().unwrap_or(0))
        .bind(data["roomNumber"].as_str().or(data["className"].as_str()))
        .bind(data["classFees"].as_f64().unwrap_or(0.0))
        .bind(data["sections"].clone())
        .bind(data["streams"].clone())
        .execute(&self.client.pool)
        .await?;
        Ok(data)
    }

    async fn get_classes(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query("SELECT * FROM classes WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&self.client.pool)
            .await?;
        Ok(rows
            .into_iter()
            .map(|r| {
                let name = r.get::<String, _>("name");
                let id = r.get::<String, _>("id");
                let sections: Value = r.get::<Value, _>("sections");
                let streams: Value = r.get::<Value, _>("streams");
                json!({
                    "id": id,
                    "classId": id,
                    "name": name,
                    "className": name,
                    "class_name": name,
                    "totalStudents": r.get::<i32, _>("total_students"),
                    "total_students": r.get::<i32, _>("total_students"),
                    "totalTeachers": r.get::<i32, _>("total_teachers"),
                    "total_teachers": r.get::<i32, _>("total_teachers"),
                    "totalPeriods": r.get::<i32, _>("total_periods"),
                    "total_periods": r.get::<i32, _>("total_periods"),
                    "roomNumber": r.get::<Option<String>, _>("room_number"),
                    "room_number": r.get::<Option<String>, _>("room_number"),
                    "classFees": r.get::<f64, _>("class_fees"),
                    "class_fees": r.get::<f64, _>("class_fees"),
                    "sections": sections,
                    "streams": streams,
                })
            })
            .collect())
    }

    async fn get_class(
        &self,
        school_id: &str,
        class_id: &str,
    ) -> Result<Option<Value>, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query("SELECT * FROM classes WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(class_id)
            .fetch_optional(&self.client.pool)
            .await?;
        Ok(
            row.map(
                |r| json!({"id": r.get::<String, _>("id"), "name": r.get::<String, _>("name")}),
            ),
        )
    }

    async fn update_class(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("UPDATE classes SET name = COALESCE($1, name), room_number = COALESCE($2, room_number) WHERE school_id = $3 AND id = $4")
            .bind(data["className"].as_str())
            .bind(data["roomNumber"].as_str())
            .bind(school_id).bind(class_id).execute(&self.client.pool).await?;
        Ok(())
    }

    async fn update_class_aggregates(
        &self,
        school_id: &str,
        class_id: &str,
        aggregates: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("UPDATE classes SET total_students = $1, total_teachers = $2, total_periods = $3, class_fees = $4 WHERE school_id = $5 AND id = $6")
            .bind(aggregates["totalStudents"].as_i64())
            .bind(aggregates["totalTeachers"].as_i64())
            .bind(aggregates["totalPeriods"].as_i64())
            .bind(aggregates["classFees"].as_f64())
            .bind(school_id).bind(class_id).execute(&self.client.pool).await?;
        Ok(())
    }

    async fn get_class_students_count(
        &self,
        school_id: &str,
        class_name: &str,
    ) -> Result<i64, Box<dyn Error + Send + Sync>> {
        let row =
            sqlx::query("SELECT COUNT(*) FROM students WHERE school_id = $1 AND class_name = $2")
                .bind(school_id)
                .bind(class_name)
                .fetch_one(&self.client.pool)
                .await?;
        Ok(row.get(0))
    }

    async fn add_period(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO class_periods (school_id, class_id, name, start_time, end_time, teacher_id, subject_id) VALUES ($1, $2, $3, $4, $5, $6, $7)")
            .bind(school_id)
            .bind(class_id)
            .bind(data["name"].as_str())
            .bind(data["startTime"].as_str().map(|s| s.parse::<chrono::NaiveTime>().unwrap_or_else(|_| chrono::NaiveTime::from_hms_opt(0, 0, 0).unwrap())))
            .bind(data["endTime"].as_str().map(|s| s.parse::<chrono::NaiveTime>().unwrap_or_else(|_| chrono::NaiveTime::from_hms_opt(0, 0, 0).unwrap())))
            .bind(data["teacherId"].as_str())
            .bind(data["subjectId"].as_str())
            .execute(&self.client.pool).await?;
        Ok(())
    }

    async fn get_periods_count(
        &self,
        school_id: &str,
        class_id: &str,
    ) -> Result<i64, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query(
            "SELECT COUNT(*) FROM class_periods WHERE school_id = $1 AND class_id = $2",
        )
        .bind(school_id)
        .bind(class_id)
        .fetch_one(&self.client.pool)
        .await?;
        Ok(row.get(0))
    }

    async fn add_subject(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO subjects (id, school_id, name, class_id, class_name, fees) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (school_id, id) DO NOTHING")
            .bind(data["subjectId"].as_str())
            .bind(school_id)
            .bind(data["subjectName"].as_str())
            .bind(data["classId"].as_str())
            .bind(data["className"].as_str())
            .bind(data["subjectFees"].as_f64())
            .execute(&self.client.pool).await?;
        Ok(data)
    }

    async fn get_subjects(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query("SELECT * FROM subjects WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&self.client.pool)
            .await?;
        Ok(rows
            .into_iter()
            .map(|r| {
                let id = r.get::<String, _>("id");
                let name = r.get::<String, _>("name");
                let class_id = r.get::<String, _>("class_id");
                let class_name = r.get::<String, _>("class_name");
                let fees = r.get::<f64, _>("fees");
                json!({
                    "id": id,
                    "subjectId": id,
                    "subject_id": id,
                    "name": name,
                    "subjectName": name,
                    "subject_name": name,
                    "classId": class_id,
                    "class_id": class_id,
                    "className": class_name,
                    "class_name": class_name,
                    "fees": fees,
                    "subjectFees": fees,
                    "subject_fees": fees,
                })
            })
            .collect())
    }

    async fn add_exam(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO exams (school_id, name, start_date, end_date) VALUES ($1, $2, $3, $4) ON CONFLICT (school_id, name) DO UPDATE SET start_date = EXCLUDED.start_date")
            .bind(school_id)
            .bind(data["name"].as_str())
            .bind(data["startDate"].as_str().map(|d| d.parse::<chrono::NaiveDate>().unwrap_or_else(|_| chrono::Utc::now().date_naive())))
            .bind(data["endDate"].as_str().map(|d| d.parse::<chrono::NaiveDate>().unwrap_or_else(|_| chrono::Utc::now().date_naive())))
            .execute(&self.client.pool).await?;
        Ok(data)
    }
    async fn get_exams(&self, school_id: &str) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query("SELECT * FROM exams WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&self.client.pool)
            .await?;
        Ok(rows
            .into_iter()
            .map(|r| json!({"id": r.get::<i32, _>("id"), "name": r.get::<String, _>("name")}))
            .collect())
    }
    async fn add_student_exam(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO audit_logs (school_id, target_type, target_id, action, data) VALUES ($1, 'exam', $2, 'submit_marks', $3)")
            .bind(school_id).bind(student_id).bind(data).execute(&self.client.pool).await?;
        Ok(())
    }
    async fn add_topic(&self, data: Value) -> Result<Value, Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO topics (subject_id, name, description) VALUES ($1, $2, $3)")
            .bind(data["subjectId"].as_str())
            .bind(data["name"].as_str())
            .bind(data["description"].as_str())
            .execute(&self.client.pool)
            .await?;
        Ok(data)
    }
    async fn get_topics(&self) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query("SELECT * FROM topics")
            .fetch_all(&self.client.pool)
            .await?;
        Ok(rows
            .into_iter()
            .map(|r| json!({"id": r.get::<i32, _>("id"), "name": r.get::<String, _>("name")}))
            .collect())
    }
    async fn add_stream(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let name = data["name"].as_str().unwrap_or("");
        sqlx::query(
            "INSERT INTO class_streams (school_id, class_id, name, data) VALUES ($1, $2, $3, $4)",
        )
        .bind(school_id)
        .bind(class_id)
        .bind(name)
        .bind(&data)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }
}

// --- Employee Repository ---
pub struct PostgresEmployeeRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl EmployeeRepository for PostgresEmployeeRepository {
    async fn add_employee(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO employees (employee_id, school_id, name, type, base_salary) VALUES ($1, $2, $3, $4, $5)")
            .bind(data["employeeId"].as_str())
            .bind(school_id)
            .bind(data["name"].as_str())
            .bind(data["type"].as_str())
            .bind(data["baseSalary"].as_f64())
            .execute(&self.client.pool).await?;
        Ok(data)
    }

    async fn get_employees(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query("SELECT employee_id, name, type, base_salary::FLOAT as base_salary FROM employees WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&self.client.pool)
            .await?;
        Ok(rows
            .into_iter()
            .map(|r| {
                json!({
                    "employeeId": r.get::<String, _>("employee_id"),
                    "name": r.get::<Option<String>, _>("name"),
                    "type": r.get::<Option<String>, _>("type"),
                    "baseSalary": r.get::<Option<f64>, _>("base_salary")
                })
            })
            .collect())
    }

    async fn get_employee(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<Option<Value>, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query("SELECT employee_id, school_id, name, type, base_salary::FLOAT as base_salary, bonus::FLOAT as bonus, increment_percent::FLOAT as increment_percent, advance_balance::FLOAT as advance_balance FROM employees WHERE school_id = $1 AND employee_id = $2")
            .bind(school_id)
            .bind(employee_id)
            .fetch_optional(&self.client.pool)
            .await?;
        Ok(row.map(|r| json!({"employeeId": r.get::<String, _>("employee_id"), "name": r.get::<Option<String>, _>("name")})))
    }

    async fn update_employee(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("UPDATE employees SET name = COALESCE($1, name), base_salary = COALESCE($2, base_salary) WHERE school_id = $3 AND employee_id = $4")
            .bind(data["name"].as_str())
            .bind(data["baseSalary"].as_f64())
            .bind(school_id).bind(employee_id).execute(&self.client.pool).await?;
        Ok(())
    }

    async fn delete_employee(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("DELETE FROM employees WHERE school_id = $1 AND employee_id = $2")
            .bind(school_id)
            .bind(employee_id)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn generate_employee_id(&self) -> Result<String, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query("SELECT nextval('employee_id_seq')")
            .fetch_one(&self.client.pool)
            .await?;
        let next_val: i64 = row.get(0);
        Ok(format!("EMP{:04}", next_val))
    }
}

// --- Resource Repository ---
pub struct PostgresResourceRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl ResourceRepository for PostgresResourceRepository {
    async fn add_space(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query(
            "INSERT INTO spaces (id, school_id, name) VALUES ($1, $2, $3) ON CONFLICT (school_id, id) DO NOTHING",
        )
        .bind(data["id"].as_str())
        .bind(school_id)
        .bind(data["name"].as_str())
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }

    async fn add_item(
        &self,
        school_id: &str,
        space_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO items (id, school_id, space_id, name, room_number, class_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (school_id, space_id, id) DO NOTHING")
            .bind(data["id"].as_str())
            .bind(school_id)
            .bind(space_id)
            .bind(data["itemName"].as_str())
            .bind(data["roomNumber"].as_str())
            .bind(data["classId"].as_str())
            .execute(&self.client.pool).await?;
        Ok(())
    }

    async fn add_material(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO materials (id, school_id, name, quantity, unit_price) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (school_id, id) DO UPDATE SET quantity = materials.quantity + EXCLUDED.quantity")
            .bind(data["materialName"].as_str().map(|s| s.to_lowercase()))
            .bind(school_id)
            .bind(data["materialName"].as_str())
            .bind(data["quantity"].as_i64())
            .bind(data["unitPrice"].as_f64())
            .execute(&self.client.pool).await?;
        Ok(())
    }

    async fn get_material(
        &self,
        school_id: &str,
        material_id: &str,
    ) -> Result<Option<Value>, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query("SELECT * FROM materials WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(material_id)
            .fetch_optional(&self.client.pool)
            .await?;
        Ok(
            row.map(
                |r| json!({"id": r.get::<String, _>("id"), "name": r.get::<String, _>("name")}),
            ),
        )
    }

    async fn update_material(
        &self,
        school_id: &str,
        material_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("UPDATE materials SET quantity = COALESCE($1, quantity) WHERE school_id = $2 AND id = $3")
            .bind(data["quantity"].as_i64())
            .bind(school_id).bind(material_id).execute(&self.client.pool).await?;
        Ok(())
    }

    async fn add_material_location(
        &self,
        school_id: &str,
        material_id: &str,
        space_id: &str,
        item_id: &str,
        quantity: i32,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO material_locations (school_id, material_id, space_id, item_id, quantity) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (school_id, material_id, space_id, item_id) DO UPDATE SET quantity = material_locations.quantity + EXCLUDED.quantity")
            .bind(school_id).bind(material_id).bind(space_id).bind(item_id).bind(quantity).execute(&self.client.pool).await?;
        Ok(())
    }

    async fn add_material_history(
        &self,
        school_id: &str,
        material_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO audit_logs (school_id, target_type, target_id, action, data) VALUES ($1, $2, $3, $4, $5)")
            .bind(school_id).bind("material").bind(material_id).bind(action).bind(data).execute(&self.client.pool).await?;
        Ok(())
    }

    async fn add_announcement(
        &self,
        school_id: &str,
        target_type: &str,
        user_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO announcements (school_id, target_type, user_id, title, content) VALUES ($1, $2, $3, $4, $5)")
            .bind(school_id)
            .bind(target_type)
            .bind(user_id)
            .bind(data["title"].as_str())
            .bind(data["content"].as_str())
            .execute(&self.client.pool).await?;
        Ok(data)
    }

    async fn get_announcements(
        &self,
        school_id: &str,
        target_type: &str,
        user_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query("SELECT * FROM announcements WHERE school_id = $1 AND target_type = $2 AND (user_id = $3 OR user_id IS NULL)")
            .bind(school_id)
            .bind(target_type)
            .bind(user_id)
            .fetch_all(&self.client.pool)
            .await?;
        Ok(rows.into_iter().map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title"), "content": r.get::<String, _>("content")})).collect())
    }
    async fn add_event_summary(
        &self,
        _school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        Ok(data)
    }
    async fn get_materials(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query("SELECT id, name, quantity, unit_price::FLOAT as unit_price, extra_unit, need_unit FROM materials WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&self.client.pool)
            .await?;
        Ok(rows
            .into_iter()
            .map(|r| {
                json!({
                    "id": r.get::<String, _>("id"),
                    "materialName": r.get::<String, _>("name"),
                    "quantity": r.get::<i32, _>("quantity"),
                    "unitPrice": r.get::<Option<f64>, _>("unit_price"),
                    "extraUnit": r.get::<i32, _>("extra_unit"),
                    "needUnit": r.get::<i32, _>("need_unit")
                })
            })
            .collect())
    }
    async fn get_spaces(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        // 1. Fetch all spaces
        let space_rows = sqlx::query("SELECT * FROM spaces WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&self.client.pool)
            .await?;

        // 2. Fetch all items for this school to nest them
        let item_rows = sqlx::query("SELECT * FROM items WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&self.client.pool)
            .await?;

        // 3. Group items by space_id
        let mut items_map: std::collections::HashMap<String, Vec<Value>> =
            std::collections::HashMap::new();
        for r in item_rows {
            let space_id = r.get::<String, _>("space_id");
            let item = json!({
                "id": r.get::<String, _>("id"),
                "name": r.get::<String, _>("name"),
                "itemName": r.get::<String, _>("name"),
                "roomNumber": r.get::<Option<String>, _>("room_number"),
                "classId": r.get::<Option<String>, _>("class_id"),
            });
            items_map.entry(space_id).or_default().push(item);
        }

        // 4. Construct final JSON
        Ok(space_rows
            .into_iter()
            .map(|r| {
                let id = r.get::<String, _>("id");
                let name = r.get::<String, _>("name");
                let items = items_map.get(&id).cloned().unwrap_or_default();
                json!({
                    "id": id,
                    "name": name,
                    "spaceName": name,
                    "items": items,
                    "inventory": items, // fallback for different frontend naming
                })
            })
            .collect())
    }
}

// --- Operations Repository ---
pub struct PostgresOperationsRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl OperationsRepository for PostgresOperationsRepository {
    async fn mark_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO attendance (school_id, role, user_id, date, status, in_time, out_time, total_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (school_id, user_id, date) DO UPDATE SET status = EXCLUDED.status, in_time = EXCLUDED.in_time, out_time = EXCLUDED.out_time, total_time = EXCLUDED.total_time")
            .bind(school_id)
            .bind(role)
            .bind(user_id)
            .bind(date.parse::<chrono::NaiveDate>()?)
            .bind(data["status"].as_str())
            .bind(data["inTime"].as_str().map(|t| chrono::DateTime::parse_from_rfc3339(t).unwrap().with_timezone(&chrono::Utc)))
            .bind(data["outTime"].as_str().map(|t| chrono::DateTime::parse_from_rfc3339(t).unwrap().with_timezone(&chrono::Utc)))
            .bind(data["totalTime"].as_str())
            .execute(&self.client.pool).await?;
        Ok(())
    }

    async fn get_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query(
            "SELECT * FROM attendance WHERE school_id = $1 AND role = $2 AND user_id = $3",
        )
        .bind(school_id)
        .bind(role)
        .bind(user_id)
        .fetch_all(&self.client.pool)
        .await?;
        Ok(rows
            .into_iter()
            .map(|r| {
                let date = r.get::<chrono::NaiveDate, _>("date");
                json!({
                    "date": date.to_string(),
                    "status": r.get::<String, _>("status"),
                    "month": date.month(),
                    "year": date.year(),
                    "inTime": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("in_time"),
                    "outTime": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("out_time"),
                    "totalTime": r.get::<Option<String>, _>("total_time")
                })
            })
            .collect())
    }
    async fn add_attendance_history(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO audit_logs (school_id, target_type, target_id, action, data) VALUES ($1, 'attendance', $2, $3, $4)")
            .bind(school_id)
            .bind(user_id)
            .bind(action)
            .bind(data)
            .execute(&self.client.pool).await?;
        Ok(())
    }
    async fn add_school_fee(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let fees_id = format!("F{}", chrono::Utc::now().timestamp_millis());
        sqlx::query("INSERT INTO fees (id, school_id, fees_name, fees_reason, fees_period, fees_amount) VALUES ($1, $2, $3, $4, $5, $6)")
            .bind(&fees_id)
            .bind(school_id)
            .bind(data["feesName"].as_str().unwrap_or("Unnamed Fee"))
            .bind(data["feesReason"].as_str().unwrap_or(""))
            .bind(data["feesPeriod"].as_str().unwrap_or("One Time"))
            .bind(data["feesAmount"].as_f64().unwrap_or(0.0))
            .execute(&self.client.pool)
            .await?;

        let mut ret = data.clone();
        ret["id"] = json!(fees_id);
        ret["createdAt"] = json!(chrono::Utc::now().to_rfc3339());
        Ok(ret)
    }

    async fn get_school_fees(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query(
            "SELECT id, fees_name, fees_reason, fees_period, fees_amount::FLOAT as fees_amount, created_at FROM fees WHERE school_id = $1 ORDER BY created_at DESC",
        )
        .bind(school_id)
        .fetch_all(&self.client.pool)
        .await?;

        Ok(rows.into_iter().map(|r| json!({
            "id": r.get::<String, _>("id"),
            "feesName": r.get::<String, _>("fees_name"),
            "feesReason": r.get::<Option<String>, _>("fees_reason"),
            "feesPeriod": r.get::<Option<String>, _>("fees_period"),
            "feesAmount": r.get::<f64, _>("fees_amount"),
            "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339()
        })).collect())
    }

    async fn get_pending_fees(
        &self,
        school_id: &str,
        min_percentage: f64,
        class_name: Option<String>,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let query_str = if class_name.is_some() {
            "SELECT sf.student_id, sf.total_fees::FLOAT as total_fees, sf.pending_amount::FLOAT as pending_amount, \
             s.name, s.class_name, s.section \
             FROM student_fees sf JOIN students s ON sf.student_id = s.student_id AND sf.school_id = s.school_id \
             WHERE sf.school_id = $1 AND s.class_name = $2 AND (sf.pending_amount / NULLIF(sf.total_fees, 0) * 100) >= $3"
        } else {
            "SELECT sf.student_id, sf.total_fees::FLOAT as total_fees, sf.pending_amount::FLOAT as pending_amount, \
             s.name, s.class_name, s.section \
             FROM student_fees sf JOIN students s ON sf.student_id = s.student_id AND sf.school_id = s.school_id \
             WHERE sf.school_id = $1 AND (sf.pending_amount / NULLIF(sf.total_fees, 0) * 100) >= $2"
        };

        // Since we can't conditionally execute bindings cleanly in one expression, we do:
        let rows = if let Some(ref c) = class_name {
            sqlx::query(query_str)
                .bind(school_id)
                .bind(c)
                .bind(min_percentage)
                .fetch_all(&self.client.pool)
                .await?
        } else {
            sqlx::query(query_str)
                .bind(school_id)
                .bind(min_percentage)
                .fetch_all(&self.client.pool)
                .await?
        };

        Ok(rows
            .into_iter()
            .map(|r| {
                json!({
                    "studentId": r.get::<String, _>("student_id"),
                    "studentName": r.get::<String, _>("name"),
                    "className": r.get::<String, _>("class_name"),
                    "section": r.get::<Option<String>, _>("section"),
                    "totalFees": r.get::<f64, _>("total_fees"),
                    "pendingAmount": r.get::<f64, _>("pending_amount"),
                })
            })
            .collect())
    }
    async fn add_student_fee(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO student_fees (student_id, school_id, total_fees, pending_amount) VALUES ($1, $2, $3, $3) ON CONFLICT (student_id) DO UPDATE SET total_fees = EXCLUDED.total_fees")
            .bind(student_id).bind(school_id).bind(data["amount"].as_f64()).execute(&self.client.pool).await?;
        Ok(())
    }
    async fn get_student_fee(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Option<Value>, Box<dyn Error + Send + Sync>> {
        let row =
            sqlx::query("SELECT student_id, total_fees::FLOAT as total_fees, pending_amount::FLOAT as pending_amount FROM student_fees WHERE school_id = $1 AND student_id = $2")
                .bind(school_id)
                .bind(student_id)
                .fetch_optional(&self.client.pool)
                .await?;
        Ok(row.map(|r| json!({"studentId": r.get::<String, _>("student_id"), "totalFees": r.get::<f64, _>("total_fees"), "pendingAmount": r.get::<f64, _>("pending_amount")})))
    }
    async fn update_student_fee(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query(
            "UPDATE student_fees SET total_fees = COALESCE($1, total_fees), discount = COALESCE($2, discount), pending_amount = COALESCE($3, pending_amount) WHERE school_id = $4 AND student_id = $5",
        )
        .bind(data["totalFees"].as_f64())
        .bind(data["discount"].as_f64())
        .bind(data["pendingAmount"].as_f64())
        .bind(school_id)
        .bind(student_id)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }
    async fn add_fee_history(
        &self,
        school_id: &str,
        fee_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO audit_logs (school_id, target_type, target_id, action, data) VALUES ($1, 'fee', $2, $3, $4)")
            .bind(school_id).bind(fee_id).bind(action).bind(data).execute(&self.client.pool).await?;
        Ok(())
    }
    async fn update_employee_salary_params(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("UPDATE employees SET base_salary = COALESCE($1, base_salary), bonus = COALESCE($2, bonus) WHERE school_id = $3 AND employee_id = $4")
            .bind(data["baseSalary"].as_f64()).bind(data["bonus"].as_f64()).bind(school_id).bind(employee_id).execute(&self.client.pool).await?;
        Ok(())
    }
    async fn add_employee_payment(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO audit_logs (school_id, target_type, target_id, action, data) VALUES ($1, 'payment', $2, 'pay', $3)")
            .bind(school_id).bind(employee_id).bind(data.clone()).execute(&self.client.pool).await?;
        Ok(data)
    }
    async fn add_payroll_salary(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO employee_salaries (employee_id, school_id, month, year, base_salary, status) VALUES ($1, $2, $3, $4, $5, $6)")
            .bind(employee_id).bind(school_id)
            .bind(data["month"].as_i64())
            .bind(data["year"].as_i64())
            .bind(data["baseSalary"].as_f64())
            .bind("generated")
            .execute(&self.client.pool).await?;
        Ok(())
    }
    async fn get_payroll_summary(
        &self,
        school_id: &str,
        employee_id: &str,
        _page: u32,
        _limit: u32,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query(
            "SELECT id, month, year, base_salary::FLOAT as base_salary, total_salary::FLOAT as total_salary, status FROM employee_salaries WHERE school_id = $1 AND employee_id = $2",
        )
        .bind(school_id)
        .bind(employee_id)
        .fetch_all(&self.client.pool)
        .await?;
        Ok(json!(rows
            .into_iter()
            .map(|r| json!({
                "id": r.get::<i32, _>("id"),
                "month": r.get::<i32, _>("month"),
                "year": r.get::<i32, _>("year"),
                "baseSalary": r.get::<Option<f64>, _>("base_salary"),
                "totalSalary": r.get::<Option<f64>, _>("total_salary"),
                "status": r.get::<String, _>("status")
            }))
            .collect::<Vec<_>>()))
    }
    async fn add_payment_history(
        &self,
        school_id: &str,
        employee_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO audit_logs (school_id, target_type, target_id, action, data) VALUES ($1, 'payroll_log', $2, $3, $4)")
            .bind(school_id).bind(employee_id).bind(action).bind(data).execute(&self.client.pool).await?;
        Ok(())
    }
}

// --- OCR Repository ---
#[cfg(feature = "ocr")]
pub struct PostgresOCRRepository {
    pub client: Arc<DbClient>,
    pub pipeline: Arc<crate::logic::ocr_pipeline::OcrPipeline>,
}

#[cfg(feature = "ocr")]
#[async_trait]
impl OCRRepository for PostgresOCRRepository {
    async fn process_ocr(
        &self,
        file_path: &str,
        _engine: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let result = self.pipeline.process_image(file_path).await?;
        Ok(result)
    }
    async fn save_ocr_result(
        &self,
        school_id: &str,
        result_data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO audit_logs (school_id, target_type, target_id, action, data) VALUES ($1, 'ocr', 'system', 'save_result', $2)")
            .bind(school_id).bind(result_data).execute(&self.client.pool).await?;
        Ok(())
    }
}

#[cfg(not(feature = "ocr"))]
pub struct PostgresOCRRepository {
    pub client: Arc<DbClient>,
    pub pipeline: Arc<crate::logic::ocr_pipeline::OcrPipeline>,
}

#[cfg(not(feature = "ocr"))]
#[async_trait]
impl OCRRepository for PostgresOCRRepository {
    async fn process_ocr(
        &self,
        file_path: &str,
        _engine: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let result = self.pipeline.process_image(file_path).await?;
        Ok(result)
    }
    async fn save_ocr_result(
        &self,
        _school_id: &str,
        _result_data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        Ok(())
    }
}

// --- Award Repository ---
pub struct PostgresAwardRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl AwardRepository for PostgresAwardRepository {
    async fn add_award(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO awards (school_id, student_id, award_name, description, date) VALUES ($1, $2, $3, $4, $5)")
            .bind(school_id)
            .bind(data["studentId"].as_str())
            .bind(data["awardName"].as_str())
            .bind(data["description"].as_str())
            .bind(data["date"].as_str().map(|d| d.parse::<chrono::NaiveDate>().unwrap_or_else(|_| chrono::Utc::now().date_naive())))
            .execute(&self.client.pool).await?;
        Ok(data)
    }

    async fn get_awards(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query("SELECT * FROM awards WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&self.client.pool)
            .await?;
        Ok(rows.into_iter().map(|r| json!({"id": r.get::<i32, _>("id"), "awardName": r.get::<String, _>("award_name")})).collect())
    }
}

// --- Complain Repository ---
pub struct PostgresComplainRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl ComplainRepository for PostgresComplainRepository {
    async fn add_complain(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO complains (school_id, student_id, title, description) VALUES ($1, $2, $3, $4)")
            .bind(school_id)
            .bind(data["studentId"].as_str())
            .bind(data["title"].as_str())
            .bind(data["description"].as_str())
            .execute(&self.client.pool).await?;
        Ok(data)
    }

    async fn get_complains(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query("SELECT * FROM complains WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&self.client.pool)
            .await?;
        Ok(rows
            .into_iter()
            .map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title")}))
            .collect())
    }
}

// --- Reminder Repository ---
pub struct PostgresReminderRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl ReminderRepository for PostgresReminderRepository {
    async fn add_reminder(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO reminders (school_id, title, description, remind_at) VALUES ($1, $2, $3, $4)")
            .bind(school_id)
            .bind(data["title"].as_str())
            .bind(data["description"].as_str())
            .bind(chrono::DateTime::parse_from_rfc3339(data["remindAt"].as_str().unwrap())?.with_timezone(&chrono::Utc))
            .execute(&self.client.pool).await?;
        Ok(data)
    }

    async fn get_reminders(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query("SELECT * FROM reminders WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&self.client.pool)
            .await?;
        Ok(rows
            .into_iter()
            .map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title")}))
            .collect())
    }
}

// --- DocumentBox Repository ---
pub struct PostgresDocumentBoxRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl DocumentBoxRepository for PostgresDocumentBoxRepository {
    async fn add_document(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO document_box (school_id, user_id, doc_type, file_url) VALUES ($1, $2, $3, $4)")
            .bind(school_id)
            .bind(data["userId"].as_str())
            .bind(data["docType"].as_str())
            .bind(data["fileUrl"].as_str())
            .execute(&self.client.pool).await?;
        Ok(data)
    }

    async fn get_documents(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query("SELECT * FROM document_box WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&self.client.pool)
            .await?;
        Ok(rows
            .into_iter()
            .map(
                |r| json!({"id": r.get::<i32, _>("id"), "docType": r.get::<String, _>("doc_type")}),
            )
            .collect())
    }
}

// --- School Repository ---
pub struct PostgresSchoolRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl SchoolRepository for PostgresSchoolRepository {
    async fn get_school(
        &self,
        school_id: &str,
    ) -> Result<Option<Value>, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query("SELECT * FROM schools WHERE id = $1")
            .bind(school_id)
            .fetch_optional(&self.client.pool)
            .await?;
        Ok(
            row.map(
                |r| json!({"id": r.get::<String, _>("id"), "name": r.get::<String, _>("name")}),
            ),
        )
    }
}

// --- Responsibility Repository ---
pub struct PostgresResponsibilityRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl ResponsibilityRepository for PostgresResponsibilityRepository {
    async fn get_responsibilities(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query(
            "SELECT * FROM audit_logs WHERE school_id = $1 AND target_type = 'responsibility'",
        )
        .bind(school_id)
        .fetch_all(&self.client.pool)
        .await?;
        Ok(rows
            .into_iter()
            .map(|r| json!({"id": r.get::<i32, _>("id"), "data": r.get::<Value, _>("data")}))
            .collect())
    }
}

// --- Task Repository ---
pub struct PostgresTaskRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl TaskRepository for PostgresTaskRepository {
    async fn get_tasks(&self, school_id: &str) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows =
            sqlx::query("SELECT * FROM audit_logs WHERE school_id = $1 AND target_type = 'task'")
                .bind(school_id)
                .fetch_all(&self.client.pool)
                .await?;
        Ok(rows
            .into_iter()
            .map(|r| json!({"id": r.get::<i32, _>("id"), "data": r.get::<Value, _>("data")}))
            .collect())
    }
}
