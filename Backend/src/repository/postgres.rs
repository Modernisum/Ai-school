use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use chrono::Datelike;
use bigdecimal::{FromPrimitive, ToPrimitive};
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
        sqlx::query(
            "INSERT INTO students (
                student_id, school_id, class_name, name, roll_number, section, status,
                dob, gender, father_name, mother_name, aadhaar_number,
                address_line1, address_city, address_state, address_pincode,
                tc_number, contact, alternative_contact, email,
                transport_enabled, transport_radius,
                additional_subjects, admission_date, room_number,
                enrolled_subjects, total_fees
            ) VALUES (
                $1,$2,$3,$4,$5,$6,'active',
                $7,$8,$9,$10,$11,
                $12,$13,$14,$15,
                $16,$17,$18,$19,
                $20,$21,
                $22,$23,$24,
                $25, $26
            )"
        )
        .bind(data["studentId"].as_str())
        .bind(school_id)
        .bind(data["className"].as_str())
        .bind(data["name"].as_str())
        .bind(data["rollNumber"].as_i64().map(|v| v as i32))
        .bind(data["section"].as_str())
        // extended fields
        .bind(data["dob"].as_str())
        .bind(data["gender"].as_str())
        .bind(data["fatherName"].as_str())
        .bind(data["motherName"].as_str())
        .bind(data["aadhaarNumber"].as_str())
        .bind(data["addressLine1"].as_str())
        .bind(data["addressCity"].as_str())
        .bind(data["addressState"].as_str())
        .bind(data["addressPincode"].as_str())
        .bind(data["tcNumber"].as_str())
        .bind(data["contact"].as_str())
        .bind(data["alternativeContact"].as_str())
        .bind(data["email"].as_str())
        .bind(data["transportEnabled"].as_bool().unwrap_or(false))
        .bind(data["transportRadius"].as_str())
        .bind(data["additionalSubjects"].as_str())
        .bind(data["admissionDate"].as_str())
        .bind(data["roomNumber"].as_str())
        .bind(data["enrolledSubjects"].clone())
        .bind(data["totalFees"].as_f64().unwrap_or(0.0))
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
        Ok(rows.into_iter().map(|r| {
            json!({
                "studentId": r.get::<String, _>("student_id"),
                "name": r.get::<Option<String>, _>("name"),
                "className": r.get::<Option<String>, _>("class_name"),
                "rollNumber": r.get::<Option<i32>, _>("roll_number"),
                "section": r.get::<Option<String>, _>("section"),
                "status": r.get::<String, _>("status"),
                "enrolledSubjects": r.get::<Option<Value>, _>("enrolled_subjects").unwrap_or(json!([])),
                "totalFees": r.get::<Option<bigdecimal::BigDecimal>, _>("total_fees").map(|d| d.to_string()).unwrap_or_else(|| "0.00".to_string()),
            })
        }).collect())
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
        Ok(row.map(|r| {
            json!({
                "studentId": r.get::<String, _>("student_id"),
                "name": r.get::<Option<String>, _>("name"),
                "className": r.get::<Option<String>, _>("class_name"),
                "rollNumber": r.get::<Option<i32>, _>("roll_number"),
                "section": r.get::<Option<String>, _>("section"),
                "status": r.get::<String, _>("status"),
                "dob": r.get::<Option<String>, _>("dob"),
                "gender": r.get::<Option<String>, _>("gender"),
                "fatherName": r.get::<Option<String>, _>("father_name"),
                "motherName": r.get::<Option<String>, _>("mother_name"),
                "aadhaarNumber": r.get::<Option<String>, _>("aadhaar_number"),
                "addressLine1": r.get::<Option<String>, _>("address_line1"),
                "addressCity": r.get::<Option<String>, _>("address_city"),
                "addressState": r.get::<Option<String>, _>("address_state"),
                "addressPincode": r.get::<Option<String>, _>("address_pincode"),
                "tcNumber": r.get::<Option<String>, _>("tc_number"),
                "contact": r.get::<Option<String>, _>("contact"),
                "alternativeContact": r.get::<Option<String>, _>("alternative_contact"),
                "email": r.get::<Option<String>, _>("email"),
                "transportEnabled": r.get::<Option<bool>, _>("transport_enabled").unwrap_or(false),
                "transportRadius": r.get::<Option<String>, _>("transport_radius"),
                "additionalSubjects": r.get::<Option<String>, _>("additional_subjects"),
                "admissionDate": r.get::<Option<String>, _>("admission_date"),
                "roomNumber": r.get::<Option<String>, _>("room_number"),
                "enrolledSubjects": r.get::<Option<Value>, _>("enrolled_subjects").unwrap_or(json!([])),
                "totalFees": r.get::<Option<bigdecimal::BigDecimal>, _>("total_fees").map(|d| d.to_string()).unwrap_or_else(|| "0.00".to_string()),
            })
        }))
    }

    async fn update_student(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query(
            "UPDATE students SET 
                name = COALESCE($1, name), 
                roll_number = COALESCE($2, roll_number),
                class_name = COALESCE($3, class_name),
                section = COALESCE($4, section),
                dob = COALESCE($5, dob),
                gender = COALESCE($6, gender),
                father_name = COALESCE($7, father_name),
                mother_name = COALESCE($8, mother_name),
                aadhaar_number = COALESCE($9, aadhaar_number),
                address_line1 = COALESCE($10, address_line1),
                address_city = COALESCE($11, address_city),
                address_state = COALESCE($12, address_state),
                address_pincode = COALESCE($13, address_pincode),
                tc_number = COALESCE($14, tc_number),
                contact = COALESCE($15, contact),
                alternative_contact = COALESCE($16, alternative_contact),
                email = COALESCE($17, email),
                transport_enabled = COALESCE($18, transport_enabled),
                transport_radius = COALESCE($19, transport_radius),
                additional_subjects = COALESCE($20, additional_subjects),
                admission_date = COALESCE($21, admission_date),
                room_number = COALESCE($22, room_number),
                enrolled_subjects = COALESCE($23, enrolled_subjects),
                total_fees = COALESCE($24, total_fees)
            WHERE school_id = $25 AND student_id = $26"
        )
        .bind(data["name"].as_str())
        .bind(data["rollNumber"].as_i64().map(|v| v as i32))
        .bind(data["className"].as_str())
        .bind(data["section"].as_str())
        .bind(data["dob"].as_str())
        .bind(data["gender"].as_str())
        .bind(data["fatherName"].as_str())
        .bind(data["motherName"].as_str())
        .bind(data["aadhaarNumber"].as_str())
        .bind(data["addressLine1"].as_str())
        .bind(data["addressCity"].as_str())
        .bind(data["addressState"].as_str())
        .bind(data["addressPincode"].as_str())
        .bind(data["tcNumber"].as_str())
        .bind(data["contact"].as_str())
        .bind(data["alternativeContact"].as_str())
        .bind(data["email"].as_str())
        .bind(data["transportEnabled"].as_bool())
        .bind(data["transportRadius"].as_str())
        .bind(data["additionalSubjects"].as_str())
        .bind(data["admissionDate"].as_str())
        .bind(data["roomNumber"].as_str())
        .bind(data["enrolledSubjects"].clone())
        .bind(data["totalFees"].as_f64())
        .bind(school_id)
        .bind(student_id)
        .execute(&self.client.pool)
        .await?;
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

    async fn generate_student_id(&self, school_id: &str) -> Result<String, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query("SELECT COALESCE(MAX(CAST(SUBSTRING(student_id FROM 2) AS INTEGER)), 0) + 1 FROM students WHERE school_id = $1 AND student_id ~ '^S[0-9]+$'")
            .bind(school_id)
            .fetch_one(&self.client.pool)
            .await?;
        let next_val: i32 = row.get(0);
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
        mut data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let subject_id = if let Some(id) = data["subjectId"].as_str() {
            id.to_string()
        } else {
            let id = self.generate_subject_id(data["subjectName"].as_str().unwrap_or("SUBJ")).await?;
            data["subjectId"] = json!(id);
            id
        };

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
            .bind(data["subjectName"].as_str())
            .bind(data["classId"].as_str())
            .bind(data["className"].as_str())
            .bind(data["subjectFees"].as_f64())
            .bind(data["isCompulsory"].as_bool().unwrap_or(true))
            .bind(data["category"].as_str())
            .bind(data["feeType"].as_str().unwrap_or("monthly"))
            .bind(data["feeInterval"].as_i64().unwrap_or(1) as i32)
            .bind(data["scheduleType"].as_str().unwrap_or("daily"))
            .bind(data["scheduleData"].clone())
            .execute(&self.client.pool).await?;
        Ok(data)
    }

    async fn generate_subject_id(
        &self,
        subject_name: &str,
    ) -> Result<String, Box<dyn Error + Send + Sync>> {
        let clean = subject_name.replace(' ', "");
        let prefix = clean[..std::cmp::min(4, clean.len())].to_uppercase();
        let random = rand::random::<u32>() % 1000;
        Ok(format!("{}{:03}", prefix, random))
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
                let is_compulsory = r.get::<Option<bool>, _>("is_compulsory").unwrap_or(true);
                let category = r.get::<Option<String>, _>("category");
                let fee_type = r.get::<Option<String>, _>("fee_type").unwrap_or_else(|| "monthly".to_string());
                let fee_interval = r.get::<Option<i32>, _>("fee_interval").unwrap_or(1);
                let schedule_type = r.get::<Option<String>, _>("schedule_type").unwrap_or_else(|| "daily".to_string());
                let schedule_data = r.get::<Option<Value>, _>("schedule_data").unwrap_or(json!([]));
                
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
                    "isCompulsory": is_compulsory,
                    "category": category,
                    "feeType": fee_type,
                    "feeInterval": fee_interval,
                    "scheduleType": schedule_type,
                    "scheduleData": schedule_data,
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
    ) -> Result<Value, AppError> {
        let employee_type = data["employeeType"].as_str()
            .or(data["type"].as_str())
            .unwrap_or("staff");
        
        let employee_id_str = data["employeeId"].as_str().unwrap_or("UNKNOWN");
        
        sqlx::query(
            "INSERT INTO employees (employee_id, school_id, employee_type, data)
             VALUES ($1, $2, $3, $4)"
        )
        .bind(employee_id_str)
        .bind(school_id)
        .bind(employee_type)
        .bind(&data)
        .execute(&self.client.pool).await?;

        // Save Experience
        if let Some(experience_arr) = data["experience"].as_array() {
            for exp in experience_arr {
                sqlx::query(
                    "INSERT INTO employee_experience (
                        school_id, employee_id, organization_name, location, position_profile_type,
                        post_type, join_month_year, end_date, is_current, achievement_description,
                        previous_employee_id, experience_letter_url
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"
                )
                .bind(school_id)
                .bind(employee_id_str)
                .bind(exp["organizationName"].as_str().unwrap_or(""))
                .bind(exp["location"].as_str())
                .bind(exp["positionProfileType"].as_str())
                .bind(exp["postType"].as_str())
                .bind(exp["joinMonthYear"].as_str())
                .bind(exp["endDate"].as_str())
                .bind(exp["isCurrent"].as_bool().unwrap_or(false))
                .bind(exp["achievementDescription"].as_str())
                .bind(exp["previousEmployeeId"].as_str())
                .bind(exp["experienceLetterUrl"].as_str())
                .execute(&self.client.pool).await?;
            }
        }

        // Save Education
        if let Some(education_arr) = data["education"].as_array() {
            for edu in education_arr {
                sqlx::query(
                    "INSERT INTO employee_education (
                        school_id, employee_id, education_level, institute_name, location,
                        stream_subject, pass_year, marks_details, medium, document_url
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"
                )
                .bind(school_id)
                .bind(employee_id_str)
                .bind(edu["educationLevel"].as_str().unwrap_or(""))
                .bind(edu["instituteName"].as_str().unwrap_or(""))
                .bind(edu["location"].as_str())
                .bind(edu["streamSubject"].as_str())
                .bind(edu["passYear"].as_str())
                .bind(edu["marksDetails"].as_str())
                .bind(edu["medium"].as_str())
                .bind(edu["documentUrl"].as_str())
                .execute(&self.client.pool).await?;
            }
        }

        Ok(data)
    }

    async fn get_employees(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError> {
        let rows = sqlx::query("SELECT employee_id, data FROM employees WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&self.client.pool)
            .await?;
            
        let mut employees = Vec::new();
        
        for row in rows {
            let employee_id: String = row.get("employee_id");
            let mut data: Value = row.get("data");
            
            // Fetch experience
            let exp_rows = sqlx::query("SELECT * FROM employee_experience WHERE school_id = $1 AND employee_id = $2")
                .bind(school_id)
                .bind(&employee_id)
                .fetch_all(&self.client.pool)
                .await?;
                
            let experience: Vec<Value> = exp_rows.into_iter().map(|r| json!({
                "id": r.get::<i32, _>("id"),
                "organizationName": r.get::<String, _>("organization_name"),
                "location": r.get::<Option<String>, _>("location"),
                "positionProfileType": r.get::<Option<String>, _>("position_profile_type"),
                "postType": r.get::<Option<String>, _>("post_type"),
                "joinMonthYear": r.get::<Option<String>, _>("join_month_year"),
                "endDate": r.get::<Option<String>, _>("end_date"),
                "isCurrent": r.get::<Option<bool>, _>("is_current"),
                "achievementDescription": r.get::<Option<String>, _>("achievement_description"),
                "previousEmployeeId": r.get::<Option<String>, _>("previous_employee_id"),
                "experienceLetterUrl": r.get::<Option<String>, _>("experience_letter_url")
            })).collect();
            
            // Fetch education
            let edu_rows = sqlx::query("SELECT * FROM employee_education WHERE school_id = $1 AND employee_id = $2")
                .bind(school_id)
                .bind(&employee_id)
                .fetch_all(&self.client.pool)
                .await?;
                
            let education: Vec<Value> = edu_rows.into_iter().map(|r| json!({
                "id": r.get::<i32, _>("id"),
                "educationLevel": r.get::<String, _>("education_level"),
                "instituteName": r.get::<String, _>("institute_name"),
                "location": r.get::<Option<String>, _>("location"),
                "streamSubject": r.get::<Option<String>, _>("stream_subject"),
                "passYear": r.get::<Option<String>, _>("pass_year"),
                "marksDetails": r.get::<Option<String>, _>("marks_details"),
                "medium": r.get::<Option<String>, _>("medium"),
                "documentUrl": r.get::<Option<String>, _>("document_url")
            })).collect();
            
            if let Some(obj) = data.as_object_mut() {
                if !experience.is_empty() {
                    obj.insert("experience".to_string(), json!(experience));
                }
                if !education.is_empty() {
                    obj.insert("education".to_string(), json!(education));
                }
            }
            
            employees.push(data);
        }
        
        Ok(employees)
    }

    async fn get_employee(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<Option<Value>, AppError> {
        let row = sqlx::query("SELECT data FROM employees WHERE school_id = $1 AND employee_id = $2")
            .bind(school_id)
            .bind(employee_id)
            .fetch_optional(&self.client.pool)
            .await?;
        
        if let Some(r) = row {
            let mut data: Value = r.get("data");
            
            // Fetch experience
            let exp_rows = sqlx::query("SELECT * FROM employee_experience WHERE school_id = $1 AND employee_id = $2")
                .bind(school_id)
                .bind(employee_id)
                .fetch_all(&self.client.pool)
                .await?;
                
            let experience: Vec<Value> = exp_rows.into_iter().map(|r| json!({
                "id": r.get::<i32, _>("id"),
                "organizationName": r.get::<String, _>("organization_name"),
                "location": r.get::<Option<String>, _>("location"),
                "positionProfileType": r.get::<Option<String>, _>("position_profile_type"),
                "postType": r.get::<Option<String>, _>("post_type"),
                "joinMonthYear": r.get::<Option<String>, _>("join_month_year"),
                "endDate": r.get::<Option<String>, _>("end_date"),
                "isCurrent": r.get::<Option<bool>, _>("is_current"),
                "achievementDescription": r.get::<Option<String>, _>("achievement_description"),
                "previousEmployeeId": r.get::<Option<String>, _>("previous_employee_id"),
                "experienceLetterUrl": r.get::<Option<String>, _>("experience_letter_url")
            })).collect();
            
            // Fetch education
            let edu_rows = sqlx::query("SELECT * FROM employee_education WHERE school_id = $1 AND employee_id = $2")
                .bind(school_id)
                .bind(employee_id)
                .fetch_all(&self.client.pool)
                .await?;
                
            let education: Vec<Value> = edu_rows.into_iter().map(|r| json!({
                "id": r.get::<i32, _>("id"),
                "educationLevel": r.get::<String, _>("education_level"),
                "instituteName": r.get::<String, _>("institute_name"),
                "location": r.get::<Option<String>, _>("location"),
                "streamSubject": r.get::<Option<String>, _>("stream_subject"),
                "passYear": r.get::<Option<String>, _>("pass_year"),
                "marksDetails": r.get::<Option<String>, _>("marks_details"),
                "medium": r.get::<Option<String>, _>("medium"),
                "documentUrl": r.get::<Option<String>, _>("document_url")
            })).collect();
            
            if let Some(obj) = data.as_object_mut() {
                if !experience.is_empty() {
                    obj.insert("experience".to_string(), json!(experience));
                }
                if !education.is_empty() {
                    obj.insert("education".to_string(), json!(education));
                }
            }
            Ok(Some(data))
        } else {
            Ok(None)
        }
    }

    async fn update_employee(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let employee_type = data["employeeType"].as_str().or(data["type"].as_str());
        
        if let Some(etype) = employee_type {
            sqlx::query(
                "UPDATE employees SET employee_type = $1, data = $2 
                 WHERE school_id = $3 AND employee_id = $4"
            )
            .bind(etype)
            .bind(&data)
            .bind(school_id)
            .bind(employee_id)
            .execute(&self.client.pool)
            .await?;
        } else {
            sqlx::query(
                "UPDATE employees SET data = $1 
                 WHERE school_id = $2 AND employee_id = $3"
            )
            .bind(&data)
            .bind(school_id)
            .bind(employee_id)
            .execute(&self.client.pool)
            .await?;
        }
        Ok(())
    }

    async fn delete_employee(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<(), AppError> {
        sqlx::query("DELETE FROM employees WHERE school_id = $1 AND employee_id = $2")
            .bind(school_id)
            .bind(employee_id)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn generate_employee_id(&self) -> Result<String, AppError> {
        let row = sqlx::query("SELECT nextval('employee_id_seq')")
            .fetch_one(&self.client.pool)
            .await?;
        let next_val: i64 = row.get(0);
        Ok(format!("E{:04}", next_val))
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
                let space_id_real = r.try_get::<String, _>("space_id").ok();
                let category = r.try_get::<String, _>("space_category").ok();
                let capacity = r.try_get::<i32, _>("capacity").ok();
                let items = items_map.get(&id).cloned().unwrap_or_default();
                json!({
                    "id": id,
                    "spaceId": space_id_real.unwrap_or_else(|| id.clone()),
                    "name": name,
                    "spaceName": name,
                    "spaceCategory": category,
                    "capacity": capacity,
                    "items": items,
                    "inventory": items, // fallback for different frontend naming
                })
            })
            .collect())
    }

    async fn create_space(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError> {
        let space_id = format!("SP{:03}", chrono::Utc::now().timestamp_millis() % 1000);
        let space_name = data["spaceName"].as_str().unwrap_or("Unnamed Space");
        let category = data["spaceCategory"].as_str().unwrap_or("classroom");
        let capacity = data["capacity"].as_i64().unwrap_or(0);
        let space_number = data["spaceNumber"].as_str();

        sqlx::query(
            "INSERT INTO spaces (space_id, school_id, space_name, space_category, space_number, capacity, data)
             VALUES ($1, $2, $3, $4, $5, $6, $7)"
        )
        .bind(&space_id)
        .bind(school_id)
        .bind(space_name)
        .bind(category)
        .bind(space_number)
        .bind(capacity as i32)
        .bind(&data)
        .execute(&self.client.pool)
        .await?;
        
        // Return constructed object
        let mut ret = data.clone();
        if let Some(obj) = ret.as_object_mut() {
            obj.insert("spaceId".to_string(), json!(space_id));
        }
        Ok(ret)
    }

    async fn get_space_details(
        &self,
        school_id: &str,
        space_id: &str,
    ) -> Result<Option<Value>, AppError> {
        let row = sqlx::query("SELECT * FROM spaces WHERE school_id = $1 AND space_id = $2")
            .bind(school_id)
            .bind(space_id)
            .fetch_optional(&self.client.pool)
            .await?;

        if let Some(r) = row {
            let mut data: Value = r.try_get("data").unwrap_or(json!({}));
            let id = r.get::<String, _>("id");
            let space_id_real = r.get::<String, _>("space_id");
            let name = r.get::<String, _>("space_name");
            
            // Fetch employees
            let emp_rows = sqlx::query("SELECT employee_id FROM space_employees WHERE school_id = $1 AND space_id = $2")
                .bind(school_id)
                .bind(&space_id_real)
                .fetch_all(&self.client.pool)
                .await?;
            let employees: Vec<String> = emp_rows.into_iter().map(|er| er.get("employee_id")).collect();

            // Fetch materials
            let mat_rows = sqlx::query("SELECT material_name, quantity, unit FROM space_materials WHERE school_id = $1 AND space_id = $2")
                .bind(school_id)
                .bind(&space_id_real)
                .fetch_all(&self.client.pool)
                .await?;
            let materials: Vec<Value> = mat_rows.into_iter().map(|mr| json!({
                "materialName": mr.get::<String, _>("material_name"),
                "quantity": mr.get::<i32, _>("quantity"),
                "unit": mr.get::<Option<String>, _>("unit")
            })).collect();

            if let Some(obj) = data.as_object_mut() {
                obj.insert("id".to_string(), json!(id));
                obj.insert("spaceId".to_string(), json!(space_id_real));
                obj.insert("spaceName".to_string(), json!(name));
                obj.insert("spaceCategory".to_string(), json!(r.get::<String, _>("space_category")));
                obj.insert("capacity".to_string(), json!(r.get::<i32, _>("capacity")));
                obj.insert("employees".to_string(), json!(employees));
                obj.insert("materials".to_string(), json!(materials));
            }
            Ok(Some(data))
        } else {
            Ok(None)
        }
    }

    async fn get_space_categories(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError> {
        let rows = sqlx::query("SELECT * FROM space_categories WHERE school_id = $1 OR is_default = TRUE")
            .bind(school_id)
            .fetch_all(&self.client.pool)
            .await?;
            
        Ok(rows.into_iter().map(|r| json!({
            "id": r.get::<i32, _>("id"),
            "name": r.get::<String, _>("name"),
            "isDefault": r.get::<bool, _>("is_default")
        })).collect())
    }

    async fn create_space_category(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError> {
        let name = data["name"].as_str().unwrap_or("");
        sqlx::query("INSERT INTO space_categories (school_id, name, is_default) VALUES ($1, $2, FALSE) ON CONFLICT DO NOTHING")
            .bind(school_id)
            .bind(name)
            .execute(&self.client.pool)
            .await?;
        Ok(data)
    }

    async fn assign_space_materials(
        &self,
        school_id: &str,
        space_id: &str,
        materials: Vec<Value>,
    ) -> Result<(), AppError> {
        for mat in materials {
            let name = mat["materialName"].as_str().unwrap_or("");
            let qty = mat["quantity"].as_i64().unwrap_or(0) as i32;
            let unit = mat["unit"].as_str();
            
            sqlx::query(
                "INSERT INTO space_materials (school_id, space_id, material_name, quantity, unit)
                 VALUES ($1, $2, $3, $4, $5)"
            )
            .bind(school_id)
            .bind(space_id)
            .bind(name)
            .bind(qty)
            .bind(unit)
            .execute(&self.client.pool)
            .await?;
        }
        Ok(())
    }

    async fn assign_space_employees(
        &self,
        school_id: &str,
        space_id: &str,
        employee_ids: Vec<String>,
    ) -> Result<(), AppError> {
        for emp_id in employee_ids {
            sqlx::query(
                "INSERT INTO space_employees (school_id, space_id, employee_id)
                 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING"
            )
            .bind(school_id)
            .bind(space_id)
            .bind(emp_id)
            .execute(&self.client.pool)
            .await?;
        }
        Ok(())
    }

    async fn remove_space_employee(
        &self,
        school_id: &str,
        space_id: &str,
        employee_id: &str,
    ) -> Result<(), AppError> {
        sqlx::query("DELETE FROM space_employees WHERE school_id = $1 AND space_id = $2 AND employee_id = $3")
            .bind(school_id)
            .bind(space_id)
            .bind(employee_id)
            .execute(&self.client.pool)
            .await?;
        Ok(())
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

    async fn delete_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query(
            "DELETE FROM attendance WHERE school_id = $1 AND role = $2 AND user_id = $3 AND date = $4",
        )
        .bind(school_id)
        .bind(role)
        .bind(user_id)
        .bind(date.parse::<chrono::NaiveDate>()?)
        .execute(&self.client.pool)
        .await?;
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

    // ---- Custom Fees ----

    async fn add_custom_fee(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let fee_id = format!("CF{}", chrono::Utc::now().timestamp_millis());
        let fee_name = data["feeName"].as_str().unwrap_or("Custom Fee");
        let fee_type = data["feeType"].as_str().unwrap_or("one_time");
        let amount = data["amount"].as_f64().unwrap_or(0.0);
        let scope = data["scope"].as_str().unwrap_or("school");
        let target_classes = data.get("targetClasses").cloned().unwrap_or(json!([]));
        let target_students = data.get("targetStudents").cloned().unwrap_or(json!([]));
        let due_date = data["dueDate"].as_str();
        let has_penalty = data["hasPenalty"].as_bool().unwrap_or(false);
        let penalty_per_day = data["penaltyPerDay"].as_f64().unwrap_or(0.0);
        let description = data["description"].as_str();

        sqlx::query(
            "INSERT INTO custom_fees (fee_id, school_id, fee_name, fee_type, amount, scope, target_classes, target_students, due_date, has_penalty, penalty_per_day, description)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$10,$11,$12)"
        )
        .bind(&fee_id)
        .bind(school_id)
        .bind(fee_name)
        .bind(fee_type)
        .bind(amount)
        .bind(scope)
        .bind(&target_classes)
        .bind(&target_students)
        .bind(due_date)
        .bind(has_penalty)
        .bind(penalty_per_day)
        .bind(description)
        .execute(&self.client.pool).await?;

        Ok(json!({"feeId": fee_id, "feeName": fee_name, "amount": amount}))
    }

    async fn get_custom_fees(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query("SELECT * FROM custom_fees WHERE school_id = $1 ORDER BY created_at DESC")
            .bind(school_id)
            .fetch_all(&self.client.pool).await?;
        Ok(rows.into_iter().map(|r| {
            json!({
                "feeId": r.get::<String, _>("fee_id"),
                "feeName": r.get::<String, _>("fee_name"),
                "feeType": r.get::<String, _>("fee_type"),
                "amount": r.get::<bigdecimal::BigDecimal, _>("amount").to_string(),
                "scope": r.get::<String, _>("scope"),
                "targetClasses": r.get::<Option<Value>, _>("target_classes").unwrap_or(json!([])),
                "targetStudents": r.get::<Option<Value>, _>("target_students").unwrap_or(json!([])),
                "dueDate": r.try_get::<chrono::NaiveDate, _>("due_date").ok().map(|d| d.to_string()),
                "hasPenalty": r.get::<bool, _>("has_penalty"),
                "penaltyPerDay": r.get::<bigdecimal::BigDecimal, _>("penalty_per_day").to_string(),
                "description": r.get::<Option<String>, _>("description"),
                "status": r.get::<String, _>("status"),
                "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339()
            })
        }).collect())
    }

    async fn delete_custom_fee(
        &self,
        school_id: &str,
        fee_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("DELETE FROM custom_fee_records WHERE school_id = $1 AND fee_id = $2")
            .bind(school_id).bind(fee_id).execute(&self.client.pool).await?;
        sqlx::query("DELETE FROM custom_fees WHERE school_id = $1 AND fee_id = $2")
            .bind(school_id).bind(fee_id).execute(&self.client.pool).await?;
        Ok(())
    }

    async fn apply_custom_fee(
        &self,
        school_id: &str,
        fee_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        // Fetch the custom fee definition
        let fee_row = sqlx::query("SELECT * FROM custom_fees WHERE school_id = $1 AND fee_id = $2")
            .bind(school_id).bind(fee_id)
            .fetch_optional(&self.client.pool).await?;
        let fee_row = fee_row.ok_or("Custom fee not found")?;

        let amount: bigdecimal::BigDecimal = fee_row.get("amount");
        let scope: String = fee_row.get("scope");
        let target_classes: Value = fee_row.get::<Option<Value>, _>("target_classes").unwrap_or(json!([]));
        let target_students: Value = fee_row.get::<Option<Value>, _>("target_students").unwrap_or(json!([]));

        // Figure out which students to target
        let student_ids: Vec<String> = match scope.as_str() {
            "student" => {
                target_students.as_array()
                    .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                    .unwrap_or_default()
            },
            "class" => {
                let class_names: Vec<String> = target_classes.as_array()
                    .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                    .unwrap_or_default();
                if class_names.is_empty() { vec![] } else {
                    let placeholders: Vec<String> = class_names.iter().enumerate().map(|(i, _)| format!("${}", i + 2)).collect();
                    let query_str = format!(
                        "SELECT student_id FROM students WHERE school_id = $1 AND class_name IN ({})",
                        placeholders.join(",")
                    );
                    let mut q = sqlx::query(&query_str).bind(school_id);
                    for name in &class_names {
                        q = q.bind(name);
                    }
                    let rows = q.fetch_all(&self.client.pool).await?;
                    rows.iter().map(|r| r.get::<String, _>("student_id")).collect()
                }
            },
            _ => {
                // school-wide
                let rows = sqlx::query("SELECT student_id FROM students WHERE school_id = $1")
                    .bind(school_id).fetch_all(&self.client.pool).await?;
                rows.iter().map(|r| r.get::<String, _>("student_id")).collect()
            }
        };

        let mut applied = 0i64;
        for sid in &student_ids {
            let res = sqlx::query(
                "INSERT INTO custom_fee_records (school_id, fee_id, student_id, amount, status)
                 VALUES ($1, $2, $3, $4, 'pending')
                 ON CONFLICT (school_id, fee_id, student_id) DO NOTHING"
            )
            .bind(school_id).bind(fee_id).bind(sid).bind(&amount)
            .execute(&self.client.pool).await?;
            applied += res.rows_affected() as i64;
        }

        Ok(json!({"applied": applied, "total": student_ids.len()}))
    }

    async fn get_student_custom_fees(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query(
            "SELECT r.*, f.fee_name, f.fee_type, f.due_date, f.has_penalty, f.penalty_per_day, f.description
             FROM custom_fee_records r
             JOIN custom_fees f ON r.fee_id = f.fee_id AND r.school_id = f.school_id
             WHERE r.school_id = $1 AND r.student_id = $2"
        )
        .bind(school_id).bind(student_id)
        .fetch_all(&self.client.pool).await?;

        Ok(rows.into_iter().map(|r| {
            let has_penalty = r.get::<bool, _>("has_penalty");
            let penalty_per_day: f64 = r.get::<bigdecimal::BigDecimal, _>("penalty_per_day").to_string().parse().unwrap_or(0.0);
            let due_date = r.try_get::<chrono::NaiveDate, _>("due_date").ok();
            let amount: f64 = r.get::<bigdecimal::BigDecimal, _>("amount").to_string().parse().unwrap_or(0.0);
            let paid: f64 = r.get::<bigdecimal::BigDecimal, _>("paid_amount").to_string().parse().unwrap_or(0.0);

            // Calculate accrued penalty
            let penalty = if has_penalty && penalty_per_day > 0.0 {
                if let Some(dd) = due_date {
                    let today = chrono::Utc::now().naive_utc().date();
                    let days_overdue = (today - dd).num_days().max(0);
                    days_overdue as f64 * penalty_per_day
                } else { 0.0 }
            } else { 0.0 };

            json!({
                "feeId": r.get::<String, _>("fee_id"),
                "feeName": r.get::<String, _>("fee_name"),
                "feeType": r.get::<String, _>("fee_type"),
                "amount": amount,
                "paidAmount": paid,
                "penalty": penalty,
                "totalDue": amount + penalty - paid,
                "status": r.get::<String, _>("status"),
                "dueDate": due_date.map(|d| d.to_string()),
                "hasPenalty": has_penalty,
                "penaltyPerDay": penalty_per_day,
                "description": r.get::<Option<String>, _>("description")
            })
        }).collect())
    }

    async fn get_student_profile(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Option<Value>, Box<dyn Error + Send + Sync>> {
        // 1. Get base student data
        let student_row = sqlx::query("SELECT * FROM students WHERE school_id = $1 AND student_id = $2")
            .bind(school_id).bind(student_id)
            .fetch_optional(&self.client.pool).await?;

        let student = match student_row {
            Some(r) => r,
            None => return Ok(None),
        };

        let class_name = student.get::<Option<String>, _>("class_name").unwrap_or_default();
        let enrolled_subjects: Value = student.get::<Option<Value>, _>("enrolled_subjects").unwrap_or(json!([]));
        let total_fees_str = student.get::<Option<bigdecimal::BigDecimal>, _>("total_fees")
            .map(|d| d.to_string()).unwrap_or("0".into());
        let subject_fees: f64 = total_fees_str.parse().unwrap_or(0.0);
        let total_subjects = enrolled_subjects.as_array().map(|a| a.len()).unwrap_or(0);

        // 2. Get student_fees (legacy fee system)
        let fee_row = sqlx::query("SELECT * FROM student_fees WHERE school_id = $1 AND student_id = $2")
            .bind(school_id).bind(student_id)
            .fetch_optional(&self.client.pool).await?;

        let (legacy_total, legacy_paid, legacy_discount) = if let Some(ref fr) = fee_row {
            let total: f64 = fr.get::<bigdecimal::BigDecimal, _>("total_fees").to_string().parse().unwrap_or(0.0);
            let pending: f64 = fr.get::<bigdecimal::BigDecimal, _>("pending_amount").to_string().parse().unwrap_or(0.0);
            let disc: f64 = fr.get::<Option<bigdecimal::BigDecimal>, _>("discount").map(|d| d.to_string().parse().unwrap_or(0.0)).unwrap_or(0.0);
            let paid = total - pending - disc;
            (total, paid.max(0.0), disc)
        } else {
            (0.0, 0.0, 0.0)
        };

        // 3. Get custom fees for this student
        let custom_fees = self.get_student_custom_fees(school_id, student_id).await?;
        let total_custom_fees: f64 = custom_fees.iter().filter_map(|f| f["amount"].as_f64()).sum();
        let total_penalty: f64 = custom_fees.iter().filter_map(|f| f["penalty"].as_f64()).sum();
        let total_custom_paid: f64 = custom_fees.iter().filter_map(|f| f["paidAmount"].as_f64()).sum();

        // 4. Build the profile
        let grand_total = subject_fees + total_custom_fees + total_penalty + legacy_total;
        let total_paid = legacy_paid + total_custom_paid;
        let total_pending = grand_total - total_paid - legacy_discount;

        Ok(Some(json!({
            "student": {
                "studentId": student.get::<String, _>("student_id"),
                "name": student.get::<Option<String>, _>("name"),
                "className": &class_name,
                "rollNumber": student.get::<Option<i32>, _>("roll_number"),
                "section": student.get::<Option<String>, _>("section"),
                "status": student.get::<String, _>("status"),
                "dob": student.get::<Option<String>, _>("dob"),
                "gender": student.get::<Option<String>, _>("gender"),
                "fatherName": student.get::<Option<String>, _>("father_name"),
                "motherName": student.get::<Option<String>, _>("mother_name"),
                "contact": student.get::<Option<String>, _>("contact"),
                "email": student.get::<Option<String>, _>("email"),
                "admissionDate": student.get::<Option<String>, _>("admission_date"),
                "enrolledSubjects": &enrolled_subjects
            },
            "className": &class_name,
            "totalSubjects": total_subjects,
            "subjectFees": subject_fees,
            "customFees": custom_fees,
            "totalCustomFees": total_custom_fees,
            "totalPenalty": total_penalty,
            "discount": legacy_discount,
            "totalAmount": grand_total,
            "totalPaid": total_paid,
            "totalPending": total_pending.max(0.0)
        })))
    }

    // ---- Referral Coupons ----

    async fn create_coupon(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let coupon_name = data["couponName"].as_str().unwrap_or("").trim().to_string();
        if coupon_name.is_empty() {
            return Err("Coupon name is required".into());
        }

        // Check unique
        let existing = sqlx::query("SELECT id FROM referral_coupons WHERE school_id = $1 AND coupon_name = $2")
            .bind(school_id).bind(&coupon_name)
            .fetch_optional(&self.client.pool).await?;
        if existing.is_some() {
            return Err("Coupon with this name already exists".into());
        }

        let coupon_id = format!("RC{}", chrono::Utc::now().timestamp_millis());
        let discount_type = data["discountType"].as_str().unwrap_or("percentage");
        let discount_value = data["discountValue"].as_f64().unwrap_or(0.0);
        let max_uses = data["maxUses"].as_i64().unwrap_or(0) as i32;
        let assigned_employee_id = data["assignedEmployeeId"].as_str();
        let employee_reward = data["employeeReward"].as_f64().unwrap_or(0.0);
        let description = data["description"].as_str();

        sqlx::query(
            "INSERT INTO referral_coupons (coupon_id, school_id, coupon_name, discount_type, discount_value, max_uses, assigned_employee_id, employee_reward, description)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)"
        )
        .bind(&coupon_id).bind(school_id).bind(&coupon_name)
        .bind(discount_type).bind(discount_value).bind(max_uses)
        .bind(assigned_employee_id).bind(employee_reward).bind(description)
        .execute(&self.client.pool).await?;

        Ok(json!({"couponId": coupon_id, "couponName": coupon_name}))
    }

    async fn get_coupons(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query("SELECT * FROM referral_coupons WHERE school_id = $1 ORDER BY created_at DESC")
            .bind(school_id).fetch_all(&self.client.pool).await?;
        Ok(rows.into_iter().map(|r| {
            json!({
                "couponId": r.get::<String, _>("coupon_id"),
                "couponName": r.get::<String, _>("coupon_name"),
                "discountType": r.get::<String, _>("discount_type"),
                "discountValue": r.get::<bigdecimal::BigDecimal, _>("discount_value").to_string(),
                "maxUses": r.get::<i32, _>("max_uses"),
                "currentUses": r.get::<i32, _>("current_uses"),
                "assignedEmployeeId": r.get::<Option<String>, _>("assigned_employee_id"),
                "employeeReward": r.get::<bigdecimal::BigDecimal, _>("employee_reward").to_string(),
                "description": r.get::<Option<String>, _>("description"),
                "status": r.get::<String, _>("status"),
                "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339()
            })
        }).collect())
    }

    async fn delete_coupon(
        &self,
        school_id: &str,
        coupon_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("DELETE FROM referral_coupons WHERE school_id = $1 AND coupon_id = $2")
            .bind(school_id).bind(coupon_id).execute(&self.client.pool).await?;
        Ok(())
    }

    async fn block_coupon(
        &self,
        school_id: &str,
        coupon_id: &str,
        blocked: bool,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let new_status = if blocked { "blocked" } else { "active" };
        sqlx::query("UPDATE referral_coupons SET status = $3 WHERE school_id = $1 AND coupon_id = $2")
            .bind(school_id).bind(coupon_id).bind(new_status)
            .execute(&self.client.pool).await?;
        Ok(())
    }

    async fn validate_coupon(
        &self,
        school_id: &str,
        coupon_name: &str,
    ) -> Result<Option<Value>, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query("SELECT * FROM referral_coupons WHERE school_id = $1 AND coupon_name = $2")
            .bind(school_id).bind(coupon_name)
            .fetch_optional(&self.client.pool).await?;

        match row {
            None => Ok(None),
            Some(r) => {
                let status: String = r.get("status");
                let max_uses: i32 = r.get("max_uses");
                let current_uses: i32 = r.get("current_uses");

                if status != "active" {
                    return Ok(Some(json!({"valid": false, "reason": "Coupon is blocked"})));
                }
                if max_uses > 0 && current_uses >= max_uses {
                    return Ok(Some(json!({"valid": false, "reason": "Coupon usage limit reached"})));
                }

                Ok(Some(json!({
                    "valid": true,
                    "couponId": r.get::<String, _>("coupon_id"),
                    "couponName": r.get::<String, _>("coupon_name"),
                    "discountType": r.get::<String, _>("discount_type"),
                    "discountValue": r.get::<bigdecimal::BigDecimal, _>("discount_value").to_string(),
                    "assignedEmployeeId": r.get::<Option<String>, _>("assigned_employee_id"),
                    "employeeReward": r.get::<bigdecimal::BigDecimal, _>("employee_reward").to_string()
                })))
            }
        }
    }

    async fn use_coupon(
        &self,
        school_id: &str,
        coupon_id: &str,
        student_id: &str,
        discount: f64,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        // 1. Fetch coupon
        let row = sqlx::query("SELECT * FROM referral_coupons WHERE school_id = $1 AND coupon_id = $2")
            .bind(school_id).bind(coupon_id)
            .fetch_optional(&self.client.pool).await?;
        let coupon = row.ok_or("Coupon not found")?;

        let assigned_emp: Option<String> = coupon.get("assigned_employee_id");
        let reward: f64 = coupon.get::<bigdecimal::BigDecimal, _>("employee_reward").to_string().parse().unwrap_or(0.0);

        // 2. Increment usage
        sqlx::query("UPDATE referral_coupons SET current_uses = current_uses + 1 WHERE school_id = $1 AND coupon_id = $2")
            .bind(school_id).bind(coupon_id)
            .execute(&self.client.pool).await?;

        // 3. Log usage
        sqlx::query(
            "INSERT INTO coupon_usage_log (school_id, coupon_id, student_id, discount_applied, employee_id, reward_paid)
             VALUES ($1,$2,$3,$4,$5,$6)"
        )
        .bind(school_id).bind(coupon_id).bind(student_id)
        .bind(discount).bind(&assigned_emp).bind(reward)
        .execute(&self.client.pool).await?;

        // 4. Award employee commission (add to bonus via employee data JSONB)
        let mut reward_msg = String::from("No employee assigned");
        if let Some(ref emp_id) = assigned_emp {
            if reward > 0.0 {
                // Get employee data, add to bonus
                let emp_row = sqlx::query("SELECT data FROM employees WHERE school_id = $1 AND employee_id = $2")
                    .bind(school_id).bind(emp_id)
                    .fetch_optional(&self.client.pool).await?;
                if let Some(er) = emp_row {
                    let mut emp_data: Value = er.get("data");
                    let current_bonus = emp_data["bonus"].as_f64().unwrap_or(0.0);
                    emp_data["bonus"] = json!(current_bonus + reward);
                    sqlx::query("UPDATE employees SET data = $3 WHERE school_id = $1 AND employee_id = $2")
                        .bind(school_id).bind(emp_id).bind(&emp_data)
                        .execute(&self.client.pool).await?;
                    reward_msg = format!("₹{} added to {}'s bonus", reward, emp_id);
                }
            }
        }

        Ok(json!({
            "used": true,
            "discount": discount,
            "rewardMessage": reward_msg
        }))
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
        let row = sqlx::query(
            "SELECT school_id, school_name, data, wallet_balance, per_student_rate, billing_status, 
             trial_ends_at, last_billing_date, status, is_blocked
             FROM schools WHERE school_id = $1"
        )
        .bind(school_id)
        .fetch_optional(&self.client.pool)
        .await?;
        Ok(
            row.map(|r| {
                json!({
                    "schoolId": r.get::<String, _>("school_id"), 
                    "schoolName": r.get::<String, _>("school_name"),
                    "data": r.get::<Value, _>("data"),
                    "walletBalance": r.get::<bigdecimal::BigDecimal, _>("wallet_balance").to_string(),
                    "perStudentRate": r.get::<bigdecimal::BigDecimal, _>("per_student_rate").to_string(),
                    "billingStatus": r.get::<String, _>("billing_status"),
                    "trialEndsAt": r.try_get::<chrono::DateTime<chrono::Utc>, _>("trial_ends_at").ok().map(|t| t.to_rfc3339()),
                    "lastBillingDate": r.try_get::<chrono::DateTime<chrono::Utc>, _>("last_billing_date").ok().map(|t| t.to_rfc3339()),
                    "status": r.get::<String, _>("status"),
                    "isBlocked": r.get::<bool, _>("is_blocked")
                })
            })
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
    ) -> Result<Vec<Value>, AppError> {
        let rows = sqlx::query(
            "SELECT * FROM responsibilities WHERE school_id = $1",
        )
        .bind(school_id)
        .fetch_all(&self.client.pool)
        .await?;
        Ok(rows
            .into_iter()
            .map(|r| json!({
                "responsibilityId": r.get::<String, _>("responsibility_id"),
                "schoolId": r.get::<String, _>("school_id"),
                "name": r.get::<String, _>("name"),
                "description": r.get::<Option<String>, _>("description"),
                "perDayPrice": r.get::<bigdecimal::BigDecimal, _>("per_day_price").to_f64().unwrap_or(0.0),
                "timePeriod": r.get::<i32, _>("time_period"),
                "spaceCategory": r.get::<Option<String>, _>("space_category").unwrap_or_default(),
                "responsibilityField": r.get::<Option<String>, _>("responsibility_field").unwrap_or_default(),
                "spaceId": r.get::<Option<String>, _>("space_id").unwrap_or_default(),
                "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339()
            }))
            .collect())
    }

    async fn add_responsibility(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError> {
        let res_id = format!("RES{}", chrono::Utc::now().timestamp_millis());
        let name = data["name"].as_str().ok_or("Name is required")?;
        let description = data["description"].as_str();

        let per_day_price = data["perDayPrice"].as_f64().unwrap_or(0.0);
        let time_period = data["timePeriod"].as_i64().unwrap_or(0) as i32;
        let space_category = data["spaceCategory"].as_str();
        let responsibility_field = data["responsibilityField"].as_str();
        let space_id = data["spaceId"].as_str();

        sqlx::query(
            "INSERT INTO responsibilities (responsibility_id, school_id, name, description, per_day_price, time_period, space_category, responsibility_field, space_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
        )
        .bind(&res_id)
        .bind(school_id)
        .bind(name)
        .bind(description)
        .bind(bigdecimal::BigDecimal::from_f64(per_day_price).unwrap_or_default())
        .bind(time_period)
        .bind(space_category)
        .bind(responsibility_field)
        .bind(space_id)
        .execute(&self.client.pool)
        .await?;

        let mut ret = data.clone();
        ret["responsibilityId"] = json!(res_id);
        Ok(ret)
    }

    async fn assign_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO employee_responsibilities (school_id, employee_id, responsibility_id)
             VALUES ($1, $2, $3) ON CONFLICT (school_id, employee_id, responsibility_id) DO NOTHING"
        )
        .bind(school_id)
        .bind(employee_id)
        .bind(responsibility_id)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }

    async fn remove_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            "DELETE FROM employee_responsibilities WHERE school_id = $1 AND employee_id = $2 AND responsibility_id = $3"
        )
        .bind(school_id)
        .bind(employee_id)
        .bind(responsibility_id)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }

    async fn get_employee_responsibilities(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<Vec<Value>, AppError> {
        let rows = sqlx::query(
            "SELECT r.* FROM responsibilities r
             JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id
             WHERE er.school_id = $1 AND er.employee_id = $2"
        )
        .bind(school_id)
        .bind(employee_id)
        .fetch_all(&self.client.pool)
        .await?;
        Ok(rows
            .into_iter()
            .map(|r| json!({
                "responsibilityId": r.get::<String, _>("responsibility_id"),
                "name": r.get::<String, _>("name"),
                "description": r.get::<Option<String>, _>("description"),
                "perDayPrice": r.get::<bigdecimal::BigDecimal, _>("per_day_price").to_f64().unwrap_or(0.0),
                "timePeriod": r.get::<i32, _>("time_period"),
                "spaceCategory": r.get::<Option<String>, _>("space_category").unwrap_or_default(),
                "responsibilityField": r.get::<Option<String>, _>("responsibility_field").unwrap_or_default(),
                "spaceId": r.get::<Option<String>, _>("space_id").unwrap_or_default(),
                "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339()
            }))
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
