use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresEmployeeRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::EmployeeRepository for PostgresEmployeeRepository {
    async fn add_employee(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let employee_type = data["employeeType"].as_str().or(data["type"].as_str()).unwrap_or("staff");
        let employee_id_str = data["employeeId"].as_str().unwrap_or("UNKNOWN");
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        sqlx::query(
            "INSERT INTO employees (employee_id, school_id, employee_type, data, aadhaar_number, contact, email)
             VALUES ($1, $2, $3, $4, $5, $6, $7)",
        )
        .bind(employee_id_str).bind(school_id).bind(employee_type).bind(&data)
        .bind(data["aadhaarNumber"].as_str()).bind(data["phone"].as_str()).bind(data["email"].as_str())
        .execute(&mut *conn).await?;

        if let Some(url) = data["profileImageUrl"].as_str() {
            sqlx::query("UPDATE app_files SET is_permanent = TRUE WHERE public_url = $1")
                .bind(url).execute(&mut *conn).await?;
        }

        if let Some(experience_arr) = data["experience"].as_array() {
            for exp in experience_arr {
                sqlx::query(
                    "INSERT INTO employee_experience (school_id, employee_id, organization_name, location, position_profile_type,
                        post_type, join_month_year, end_date, is_current, achievement_description, previous_employee_id, experience_letter_url)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
                )
                .bind(school_id).bind(employee_id_str)
                .bind(exp["organizationName"].as_str().unwrap_or(""))
                .bind(exp["location"].as_str()).bind(exp["positionProfileType"].as_str())
                .bind(exp["postType"].as_str()).bind(exp["joinMonthYear"].as_str())
                .bind(exp["endDate"].as_str()).bind(exp["isCurrent"].as_bool().unwrap_or(false))
                .bind(exp["achievementDescription"].as_str()).bind(exp["previousEmployeeId"].as_str())
                .bind(exp["experienceLetterUrl"].as_str())
                .execute(&mut *conn).await?;
            }
        }

        if let Some(education_arr) = data["education"].as_array() {
            for edu in education_arr {
                sqlx::query(
                    "INSERT INTO employee_education (school_id, employee_id, education_level, institute_name, location,
                        stream_subject, pass_year, marks_details, medium, document_url)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
                )
                .bind(school_id).bind(employee_id_str)
                .bind(edu["educationLevel"].as_str().unwrap_or(""))
                .bind(edu["instituteName"].as_str().unwrap_or(""))
                .bind(edu["location"].as_str()).bind(edu["streamSubject"].as_str())
                .bind(edu["passYear"].as_str()).bind(edu["marksDetails"].as_str())
                .bind(edu["medium"].as_str()).bind(edu["documentUrl"].as_str())
                .execute(&mut *conn).await?;
            }
        }

        Ok(data)
    }

    async fn get_employees(&self, school_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT e.employee_id, e.data,
                    COALESCE(json_agg(DISTINCT jsonb_build_object(
                        'id', exp.id, 'organizationName', exp.organization_name, 'location', exp.location,
                        'positionProfileType', exp.position_profile_type, 'postType', exp.post_type,
                        'joinMonthYear', exp.join_month_year, 'endDate', exp.end_date,
                        'isCurrent', exp.is_current, 'achievementDescription', exp.achievement_description,
                        'previousEmployeeId', exp.previous_employee_id, 'experienceLetterUrl', exp.experience_letter_url
                    )) FILTER (WHERE exp.id IS NOT NULL), '[]') as experience,
                    COALESCE(json_agg(DISTINCT jsonb_build_object(
                        'id', edu.id, 'educationLevel', edu.education_level, 'instituteName', edu.institute_name,
                        'location', edu.location, 'streamSubject', edu.stream_subject,
                        'passYear', edu.pass_year, 'marksDetails', edu.marks_details,
                        'medium', edu.medium, 'documentUrl', edu.document_url
                    )) FILTER (WHERE edu.id IS NOT NULL), '[]') as education
             FROM employees e
             LEFT JOIN employee_experience exp ON exp.school_id = e.school_id AND exp.employee_id = e.employee_id
             LEFT JOIN employee_education edu ON edu.school_id = e.school_id AND edu.employee_id = e.employee_id
             WHERE e.school_id = $1
             GROUP BY e.employee_id, e.data"
        )
        .bind(school_id)
        .fetch_all(&mut *conn).await?;

        let mut employees = Vec::new();
        for row in rows {
            let mut data: Value = row.get("data");
            let experience: Value = row.get("experience");
            let education: Value = row.get("education");
            if let Some(obj) = data.as_object_mut() {
                if experience.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
                    obj.insert("experience".to_string(), experience);
                }
                if education.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
                    obj.insert("education".to_string(), education);
                }
            }
            employees.push(data);
        }
        Ok(employees)
    }

    async fn get_employee(&self, school_id: &str, employee_id: &str) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query(
            "SELECT e.data,
                    COALESCE(json_agg(DISTINCT jsonb_build_object(
                        'id', exp.id, 'organizationName', exp.organization_name, 'location', exp.location,
                        'positionProfileType', exp.position_profile_type, 'postType', exp.post_type,
                        'joinMonthYear', exp.join_month_year, 'endDate', exp.end_date,
                        'isCurrent', exp.is_current, 'achievementDescription', exp.achievement_description,
                        'previousEmployeeId', exp.previous_employee_id, 'experienceLetterUrl', exp.experience_letter_url
                    )) FILTER (WHERE exp.id IS NOT NULL), '[]') as experience,
                    COALESCE(json_agg(DISTINCT jsonb_build_object(
                        'id', edu.id, 'educationLevel', edu.education_level, 'instituteName', edu.institute_name,
                        'location', edu.location, 'streamSubject', edu.stream_subject,
                        'passYear', edu.pass_year, 'marksDetails', edu.marks_details,
                        'medium', edu.medium, 'documentUrl', edu.document_url
                    )) FILTER (WHERE edu.id IS NOT NULL), '[]') as education
             FROM employees e
             LEFT JOIN employee_experience exp ON exp.school_id = e.school_id AND exp.employee_id = e.employee_id
             LEFT JOIN employee_education edu ON edu.school_id = e.school_id AND edu.employee_id = e.employee_id
             WHERE e.school_id = $1 AND e.employee_id = $2
             GROUP BY e.data"
        )
        .bind(school_id).bind(employee_id)
        .fetch_optional(&mut *conn).await?;

        if let Some(r) = row {
            let mut data: Value = r.get("data");
            let experience: Value = r.get("experience");
            let education: Value = r.get("education");
            if let Some(obj) = data.as_object_mut() {
                if experience.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
                    obj.insert("experience".to_string(), experience);
                }
                if education.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
                    obj.insert("education".to_string(), education);
                }
            }
            Ok(Some(data))
        } else {
            Ok(None)
        }
    }

    async fn update_employee(&self, school_id: &str, employee_id: &str, data: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        let old_photo: Option<Option<String>> = sqlx::query_scalar("SELECT data->>'profileImageUrl' FROM employees WHERE school_id = $1 AND employee_id = $2")
            .bind(school_id).bind(employee_id).fetch_optional(&mut *conn).await?;
        let old_photo = old_photo.flatten();

        let employee_type = data["employeeType"].as_str().or(data["type"].as_str());
        if let Some(etype) = employee_type {
            sqlx::query("UPDATE employees SET employee_type = $1, data = $2, aadhaar_number = $3, contact = $4, email = $5 WHERE school_id = $6 AND employee_id = $7")
                .bind(etype).bind(&data).bind(data["aadhaarNumber"].as_str()).bind(data["phone"].as_str())
                .bind(data["email"].as_str()).bind(school_id).bind(employee_id)
                .execute(&mut *conn).await?;
        } else {
            sqlx::query("UPDATE employees SET data = $1, aadhaar_number = $2, contact = $3, email = $4 WHERE school_id = $5 AND employee_id = $6")
                .bind(&data).bind(data["aadhaarNumber"].as_str()).bind(data["phone"].as_str())
                .bind(data["email"].as_str()).bind(school_id).bind(employee_id)
                .execute(&mut *conn).await?;
        }

        if let Some(url) = data["profileImageUrl"].as_str() {
            sqlx::query("UPDATE app_files SET is_permanent = TRUE WHERE public_url = $1")
                .bind(url).execute(&mut *conn).await?;
        }
        if let Some(old_url) = old_photo {
            let changed = data["profileImageUrl"].as_str().map(|n| n != old_url).unwrap_or(true);
            if changed {
                sqlx::query("UPDATE app_files SET is_permanent = FALSE WHERE public_url = $1")
                    .bind(old_url).execute(&mut *conn).await?;
            }
        }
        Ok(())
    }

    async fn delete_employee(&self, school_id: &str, employee_id: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let photo: Option<Option<String>> = sqlx::query_scalar("SELECT data->>'profileImageUrl' FROM employees WHERE school_id = $1 AND employee_id = $2")
            .bind(school_id).bind(employee_id).fetch_optional(&mut *conn).await?;
        let photo = photo.flatten();

        sqlx::query("DELETE FROM employees WHERE school_id = $1 AND employee_id = $2")
            .bind(school_id).bind(employee_id).execute(&mut *conn).await?;

        if let Some(url) = photo {
            sqlx::query("UPDATE app_files SET is_permanent = FALSE WHERE public_url = $1")
                .bind(url).execute(&mut *conn).await?;
        }
        Ok(())
    }

    async fn generate_employee_id(&self) -> Result<String, AppError> {
        let mut conn = self.client.acquire_super_admin_connection().await?;
        let row = sqlx::query("SELECT nextval('employee_id_seq')").fetch_one(&mut *conn).await?;
        let next_val: i64 = row.get(0);
        Ok(format!("E{:04}", next_val))
    }

    async fn get_driver_students(
        &self,
        school_id: &str,
        driver_id: &str,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT s.student_id, s.name, s.class_name, s.parent_phone \
             FROM employee_responsibilities er \
             JOIN responsibilities r ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id \
             JOIN space_employees se ON se.space_id = ANY(er.space_ids) AND se.school_id = er.school_id \
             JOIN students s ON s.class_id = se.space_id AND s.school_id = er.school_id \
             WHERE er.employee_id = $1 AND er.school_id = $2 AND r.employee_type = 'driver'"
        )
        .bind(driver_id).bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let students: Vec<Value> = rows.iter().map(|r| json!({
            "studentId": r.get::<String, _>("student_id"),
            "name": r.get::<String, _>("name"),
            "className": r.get::<String, _>("class_name"),
            "parentPhone": r.get::<Option<String>, _>("parent_phone"),
        })).collect();

        Ok(students)
    }
}
