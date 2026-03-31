use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresStudentRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::StudentRepository for PostgresStudentRepository {
    async fn add_student(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        sqlx::query(
            "INSERT INTO students (
                student_id, school_id, class_name, name, roll_number, section, status,
                dob, gender, father_name, mother_name, aadhaar_number,
                address_line1, address_city, address_state, address_pincode,
                tc_number, contact, alternative_contact, email,
                transport_enabled, transport_radius,
                additional_subjects, admission_date, room_number,
                enrolled_subjects, total_fees, student_type, profile_image_url
            ) VALUES (
                $1,$2,$3,$4,$5,$6,'active',
                $7,$8,$9,$10,$11,
                $12,$13,$14,$15,
                $16,$17,$18,$19,
                $20,$21,
                $22,$23,$24,
                $25, $26, $27, $28
            )",
        )
        .bind(data["studentId"].as_str())
        .bind(school_id)
        .bind(data["className"].as_str())
        .bind(data["name"].as_str())
        .bind(data["rollNumber"].as_i64().map(|v| v as i32))
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
        .bind(data["transportEnabled"].as_bool().unwrap_or(false))
        .bind(data["transportRadius"].as_str())
        .bind(data["additionalSubjects"].as_str())
        .bind(data["admissionDate"].as_str())
        .bind(data["roomNumber"].as_str())
        .bind(data["enrolledSubjects"].clone())
        .bind(data["totalFees"].as_f64().unwrap_or(0.0))
        .bind(data["studentType"].as_str())
        .bind(data["profileImageUrl"].as_str())
        .execute(&mut *conn)
        .await?;

        // Mark profile image as permanent if exists
        if let Some(url) = data["profileImageUrl"].as_str() {
            sqlx::query("UPDATE app_files SET is_permanent = TRUE WHERE public_url = $1")
                .bind(url)
                .execute(&mut *conn)
                .await?;
        }

        Ok(data)
    }

    async fn get_students(&self, school_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT student_id, name, class_name, roll_number, section, status, created_at, student_type, profile_image_url
             FROM students WHERE school_id = $1"
        )
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;
        Ok(rows.into_iter().map(|r| {
            json!({
                "studentId": r.get::<String, _>("student_id"),
                "name": r.get::<Option<String>, _>("name"),
                "className": r.get::<Option<String>, _>("class_name"),
                "rollNumber": r.get::<Option<i32>, _>("roll_number"),
                "section": r.get::<Option<String>, _>("section"),
                "status": r.get::<String, _>("status"),
                "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                "studentType": r.get::<Option<String>, _>("student_type"),
                "profileImageUrl": r.get::<Option<String>, _>("profile_image_url"),
            })
        }).collect())
    }

    async fn get_students_by_class(
        &self,
        school_id: &str,
        class_name: &str,
        section: Option<&str>,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = if let Some(sec) = section {
            sqlx::query("SELECT * FROM students WHERE school_id = $1 AND class_name = $2 AND section = $3")
                .bind(school_id).bind(class_name).bind(sec).fetch_all(&mut *conn).await?
        } else {
            sqlx::query("SELECT * FROM students WHERE school_id = $1 AND class_name = $2")
                .bind(school_id).bind(class_name).fetch_all(&mut *conn).await?
        };
        Ok(rows.into_iter().map(|r| json!({"studentId": r.get::<String, _>("student_id"), "name": r.get::<Option<String>, _>("name")})).collect())
    }

    async fn get_student(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM students WHERE school_id = $1 AND student_id = $2")
            .bind(school_id)
            .bind(student_id)
            .fetch_optional(&mut *conn)
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
                "studentType": r.get::<Option<String>, _>("student_type"),
                "enrolledSubjects": r.get::<Option<Value>, _>("enrolled_subjects").unwrap_or(json!([])),
                "totalFees": r.get::<Option<bigdecimal::BigDecimal>, _>("total_fees").map(|d| d.to_string()).unwrap_or_else(|| "0.00".to_string()),
                "profileImageUrl": r.get::<Option<String>, _>("profile_image_url"),
            })
        }))
    }

    async fn update_student(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        // 1. Get current profile_image_url for cleanup
        let old_photo: Option<String> = sqlx::query_scalar("SELECT profile_image_url FROM students WHERE school_id = $1 AND student_id = $2")
            .bind(school_id)
            .bind(student_id)
            .fetch_optional(&mut *conn)
            .await?;

        // 2. Perform the update
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
                total_fees = COALESCE($24, total_fees),
                student_type = COALESCE($25, student_type),
                profile_image_url = COALESCE($26, profile_image_url)
            WHERE school_id = $27 AND student_id = $28",
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
        .bind(data["studentType"].as_str())
        .bind(data["profileImageUrl"].as_str())
        .bind(school_id)
        .bind(student_id)
        .execute(&mut *conn)
        .await?;

        // 3. Handle photo transitions
        let new_photo = data["profileImageUrl"].as_str();
        
        // Mark new photo as permanent
        if let Some(url) = new_photo {
            sqlx::query("UPDATE app_files SET is_permanent = TRUE WHERE public_url = $1")
                .bind(url)
                .execute(&mut *conn)
                .await?;
        }

        // Mark old photo as orphaned if it was changed
        if let Some(old_url) = old_photo {
            if let Some(new_url) = new_photo {
                if old_url != new_url {
                    sqlx::query("UPDATE app_files SET is_permanent = FALSE WHERE public_url = $1")
                        .bind(old_url)
                        .execute(&mut *conn)
                        .await?;
                }
            } else if data["profileImageUrl"].is_null() {
                 // explicitly set to null (removal)
                 sqlx::query("UPDATE app_files SET is_permanent = FALSE WHERE public_url = $1")
                    .bind(old_url)
                    .execute(&mut *conn)
                    .await?;
            }
        }
        
        Ok(())
    }

    async fn delete_student(&self, school_id: &str, student_id: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        // 1. Get photo for cleanup
        let photo: Option<String> = sqlx::query_scalar("SELECT profile_image_url FROM students WHERE school_id = $1 AND student_id = $2")
            .bind(school_id).bind(student_id).fetch_optional(&mut *conn).await?;

        // 2. Delete student
        sqlx::query("DELETE FROM students WHERE school_id = $1 AND student_id = $2")
            .bind(school_id).bind(student_id).execute(&mut *conn).await?;

        // 3. Orphan the photo
        if let Some(url) = photo {
             sqlx::query("UPDATE app_files SET is_permanent = FALSE WHERE public_url = $1")
                .bind(url).execute(&mut *conn).await?;
        }
        
        Ok(())
    }

    async fn get_next_roll_number(
        &self,
        school_id: &str,
        class_name: &str,
    ) -> Result<i32, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT COALESCE(MAX(roll_number), 0) + 1 FROM students WHERE school_id = $1 AND class_name = $2").bind(school_id).bind(class_name).fetch_one(&mut *conn).await?;
        Ok(row.get(0))
    }

    async fn generate_student_id(&self, school_id: &str) -> Result<String, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT COALESCE(MAX(CAST(SUBSTRING(student_id FROM 2) AS INTEGER)), 0) + 1 FROM students WHERE school_id = $1 AND student_id ~ '^S[0-9]+$'")
            .bind(school_id)
            .fetch_one(&mut *conn)
            .await?;
        let next_val: i32 = row.get(0);
        Ok(format!("S{:06}", next_val))
    }

    async fn check_aadhaar_exists(&self, _school_id: &str, aadhaar: &str, exclude_sid: Option<&str>, exclude_eid: Option<&str>) -> Result<bool, AppError> {
        let mut conn = self.client.acquire_tenant_connection("public").await?;
        let row = sqlx::query(
            "SELECT EXISTS (SELECT 1 FROM students WHERE REPLACE(aadhaar_number, ' ', '') = REPLACE($1, ' ', '') AND student_id != COALESCE($2, '')) OR 
                    EXISTS (SELECT 1 FROM employees WHERE REPLACE(aadhaar_number, ' ', '') = REPLACE($1, ' ', '') AND employee_id != COALESCE($3, ''))"
        )
        .bind(aadhaar)
        .bind(exclude_sid)
        .bind(exclude_eid)
        .fetch_one(&mut *conn)
        .await?;
        Ok(row.get(0))
    }

    async fn count_phone_usage(&self, _school_id: &str, phone: &str, exclude_sid: Option<&str>, exclude_eid: Option<&str>) -> Result<i32, AppError> {
        let mut conn = self.client.acquire_tenant_connection("public").await?;
        let row = sqlx::query(
            "SELECT (
                (SELECT COUNT(*) FROM students WHERE REPLACE(REPLACE(contact, ' ', ''), '-', '') = REPLACE(REPLACE($1, ' ', ''), '-', '') AND student_id != COALESCE($2, '')) +
                (SELECT COUNT(*) FROM employees WHERE REPLACE(REPLACE(contact, ' ', ''), '-', '') = REPLACE(REPLACE($1, ' ', ''), '-', '') AND employee_id != COALESCE($3, ''))
             )"
        )
        .bind(phone)
        .bind(exclude_sid)
        .bind(exclude_eid)
        .fetch_one(&mut *conn)
        .await?;
        Ok(row.get::<i64, _>(0) as i32)
    }

    async fn count_email_usage(&self, _school_id: &str, email: &str, exclude_sid: Option<&str>, exclude_eid: Option<&str>) -> Result<i32, AppError> {
        let mut conn = self.client.acquire_tenant_connection("public").await?;
        let row = sqlx::query(
            "SELECT (
                (SELECT COUNT(*) FROM students WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND student_id != COALESCE($2, '')) +
                (SELECT COUNT(*) FROM employees WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND employee_id != COALESCE($3, ''))
             )"
        )
        .bind(email)
        .bind(exclude_sid)
        .bind(exclude_eid)
        .fetch_one(&mut *conn)
        .await?;
        Ok(row.get::<i64, _>(0) as i32)
    }

    async fn add_history(&self, school_id: &str, student_id: &str, rev_no: i32, snapshot: Value, delta: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO student_history (school_id, student_id, revision_no, snapshot, delta) VALUES ($1, $2, $3, $4, $5)")
            .bind(school_id).bind(student_id).bind(rev_no).bind(snapshot).bind(delta).execute(&mut *conn).await?;
        Ok(())
    }

    async fn get_next_rev_no(&self, school_id: &str, student_id: &str) -> Result<i32, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT COALESCE(MAX(revision_no), 0) + 1 FROM student_history WHERE school_id = $1 AND student_id = $2")
            .bind(school_id).bind(student_id).fetch_one(&mut *conn).await?;
        Ok(row.get(0))
    }

    async fn get_history_by_id(&self, school_id: &str, id: i32) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT id, student_id, revision_no, snapshot, delta, rev_date FROM student_history WHERE school_id = $1 AND id = $2")
            .bind(school_id).bind(id).fetch_optional(&mut *conn).await?;
        Ok(row.map(|r| json!({
            "id": r.get::<i32, _>("id"), 
            "studentId": r.get::<String, _>("student_id"), 
            "revisionNo": r.get::<i32, _>("revision_no"),
            "snapshot": r.get::<Value, _>("snapshot"),
            "delta": r.get::<Value, _>("delta"),
            "date": r.get::<chrono::DateTime<chrono::Utc>, _>("rev_date").to_rfc3339()
        })))
    }

    async fn get_all_student_history(&self, school_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT id, student_id, revision_no, snapshot, delta, rev_date FROM student_history WHERE school_id = $1 ORDER BY rev_date DESC")
            .bind(school_id).fetch_all(&mut *conn).await?;
        Ok(rows.into_iter().map(|r| json!({
            "id": r.get::<i32, _>("id"), 
            "studentId": r.get::<String, _>("student_id"), 
            "revisionNo": r.get::<i32, _>("revision_no"),
            "snapshot": r.get::<Value, _>("snapshot"),
            "delta": r.get::<Value, _>("delta"),
            "date": r.get::<chrono::DateTime<chrono::Utc>, _>("rev_date").to_rfc3339()
        })).collect())
    }

    async fn get_student_profile(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        // 1. Get base student data
        let student_row = sqlx::query("SELECT * FROM students WHERE school_id = $1 AND student_id = $2")
            .bind(school_id)
            .bind(student_id)
            .fetch_optional(&mut *conn)
            .await?;

        let student = match student_row {
            Some(r) => r,
            None => return Ok(None),
        };

        let class_name = student.get::<Option<String>, _>("class_name").unwrap_or_default();
        let enrolled_subjects: Value = student.get::<Option<Value>, _>("enrolled_subjects").unwrap_or(json!([]));
        let total_fees_str = student.get::<Option<sqlx::types::BigDecimal>, _>("total_fees")
            .map(|d| d.to_string())
            .unwrap_or_else(|| "0".to_string());
        let subject_fees: f64 = total_fees_str.parse().unwrap_or(0.0);
        let total_subjects = enrolled_subjects.as_array().map(|a| a.len()).unwrap_or(0);

        // 2. Get student_fees (legacy fee system)
        let fee_row = sqlx::query("SELECT * FROM student_fees WHERE school_id = $1 AND student_id = $2")
            .bind(school_id)
            .bind(student_id)
            .fetch_optional(&mut *conn)
            .await?;

        let (legacy_total, legacy_paid, legacy_discount) = if let Some(fr) = fee_row {
            let total: f64 = fr.get::<sqlx::types::BigDecimal, _>("total_fees").to_string().parse().unwrap_or(0.0);
            let pending: f64 = fr.get::<sqlx::types::BigDecimal, _>("pending_amount").to_string().parse().unwrap_or(0.0);
            let disc = fr.get::<Option<sqlx::types::BigDecimal>, _>("discount")
                .map(|d| d.to_string().parse().unwrap_or(0.0))
                .unwrap_or(0.0);
            let paid = total - pending - disc;
            (total, paid.max(0.0), disc)
        } else {
            (0.0, 0.0, 0.0)
        };

        // 3. Get custom fees for this student
        let rows = sqlx::query(
            "SELECT r.*, f.fee_name, f.fee_type, f.due_date, f.has_penalty, f.penalty_per_day, f.description
             FROM custom_fee_records r
             JOIN custom_fees f ON r.fee_id = f.fee_id AND r.school_id = f.school_id
             WHERE r.school_id = $1 AND r.student_id = $2"
        )
        .bind(school_id).bind(student_id)
        .fetch_all(&mut *conn).await?;

        let custom_fees: Vec<Value> = rows.into_iter().map(|r| {
            let has_penalty = r.get::<bool, _>("has_penalty");
            let penalty_per_day: f64 = r.get::<sqlx::types::BigDecimal, _>("penalty_per_day").to_string().parse().unwrap_or(0.0);
            let due_date = r.try_get::<chrono::NaiveDate, _>("due_date").ok();
            
            let mut penalty = 0.0;
            if has_penalty {
                if let Some(due) = due_date {
                    let today = chrono::Local::now().date_naive();
                    if today > due {
                        let days = (today - due).num_days();
                        penalty = days as f64 * penalty_per_day;
                    }
                }
            }

            json!({
                "feeId": r.get::<String, _>("fee_id"),
                "feeName": r.get::<String, _>("fee_name"),
                "amount": r.get::<sqlx::types::BigDecimal, _>("amount").to_string().parse::<f64>().unwrap_or(0.0),
                "penalty": penalty,
                "paidAmount": r.get::<sqlx::types::BigDecimal, _>("paid_amount").to_string().parse::<f64>().unwrap_or(0.0),
                "status": r.get::<String, _>("status")
            })
        }).collect();

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
                "studentType": student.get::<Option<String>, _>("student_type"),
                "aadhaarNumber": student.get::<Option<String>, _>("aadhaar_number"),
                "createdAt": student.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                "updatedAt": student.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
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
}
