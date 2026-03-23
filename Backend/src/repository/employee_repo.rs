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
        let employee_type = data["employeeType"]
            .as_str()
            .or(data["type"].as_str())
            .unwrap_or("staff");

        let employee_id_str = data["employeeId"].as_str().unwrap_or("UNKNOWN");

        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        let aadhaar_number = data["aadhaarNumber"].as_str().or(data["aadhaar_number"].as_str());
        let contact = data["contact"].as_str();
        let email = data["email"].as_str();

        sqlx::query(
            "INSERT INTO employees (employee_id, school_id, employee_type, data, aadhaar_number, contact, email)
             VALUES ($1, $2, $3, $4, $5, $6, $7)",
        )
        .bind(employee_id_str)
        .bind(school_id)
        .bind(employee_type)
        .bind(&data)
        .bind(aadhaar_number)
        .bind(contact)
        .bind(email)
        .execute(&mut *conn)
        .await?;

        // Save Experience
        if let Some(experience_arr) = data["experience"].as_array() {
            for exp in experience_arr {
                sqlx::query(
                    "INSERT INTO employee_experience (
                        school_id, employee_id, organization_name, location, position_profile_type,
                        post_type, join_month_year, end_date, is_current, achievement_description,
                        previous_employee_id, experience_letter_url
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
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
                .execute(&mut *conn)
                .await?;
            }
        }

        // Save Education
        if let Some(education_arr) = data["education"].as_array() {
            for edu in education_arr {
                sqlx::query(
                    "INSERT INTO employee_education (
                        school_id, employee_id, education_level, institute_name, location,
                        stream_subject, pass_year, marks_details, medium, document_url
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
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
                .execute(&mut *conn)
                .await?;
            }
        }

        Ok(data)
    }

    async fn get_employees(&self, school_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT employee_id, data FROM employees WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;

        let mut employees = Vec::new();

        for row in rows {
            let employee_id: String = row.get("employee_id");
            let mut data: Value = row.get("data");

            // Fetch experience
            let exp_rows = sqlx::query(
                "SELECT * FROM employee_experience WHERE school_id = $1 AND employee_id = $2",
            )
            .bind(school_id)
            .bind(&employee_id)
            .fetch_all(&mut *conn)
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
            let edu_rows = sqlx::query(
                "SELECT * FROM employee_education WHERE school_id = $1 AND employee_id = $2",
            )
            .bind(school_id)
            .bind(&employee_id)
            .fetch_all(&mut *conn)
            .await?;

            let education: Vec<Value> = edu_rows
                .into_iter()
                .map(|r| {
                    json!({
                        "id": r.get::<i32, _>("id"),
                        "educationLevel": r.get::<String, _>("education_level"),
                        "instituteName": r.get::<String, _>("institute_name"),
                        "location": r.get::<Option<String>, _>("location"),
                        "streamSubject": r.get::<Option<String>, _>("stream_subject"),
                        "passYear": r.get::<Option<String>, _>("pass_year"),
                        "marksDetails": r.get::<Option<String>, _>("marks_details"),
                        "medium": r.get::<Option<String>, _>("medium"),
                        "documentUrl": r.get::<Option<String>, _>("document_url")
                    })
                })
                .collect();

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
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row =
            sqlx::query("SELECT data FROM employees WHERE school_id = $1 AND employee_id = $2")
                .bind(school_id)
                .bind(employee_id)
                .fetch_optional(&mut *conn)
                .await?;

        if let Some(r) = row {
            let mut data: Value = r.get("data");

            // Fetch experience
            let exp_rows = sqlx::query(
                "SELECT * FROM employee_experience WHERE school_id = $1 AND employee_id = $2",
            )
            .bind(school_id)
            .bind(employee_id)
            .fetch_all(&mut *conn)
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
            let edu_rows = sqlx::query(
                "SELECT * FROM employee_education WHERE school_id = $1 AND employee_id = $2",
            )
            .bind(school_id)
            .bind(employee_id)
            .fetch_all(&mut *conn)
            .await?;

            let education: Vec<Value> = edu_rows
                .into_iter()
                .map(|r| {
                    json!({
                        "id": r.get::<i32, _>("id"),
                        "educationLevel": r.get::<String, _>("education_level"),
                        "instituteName": r.get::<String, _>("institute_name"),
                        "location": r.get::<Option<String>, _>("location"),
                        "streamSubject": r.get::<Option<String>, _>("stream_subject"),
                        "passYear": r.get::<Option<String>, _>("pass_year"),
                        "marksDetails": r.get::<Option<String>, _>("marks_details"),
                        "medium": r.get::<Option<String>, _>("medium"),
                        "documentUrl": r.get::<Option<String>, _>("document_url")
                    })
                })
                .collect();

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
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        // Extract employee type if updating
        let employee_type = data["employeeType"].as_str().or(data["type"].as_str());

        let aadhaar_number = data["aadhaarNumber"].as_str().or(data["aadhaar_number"].as_str());
        let contact = data["contact"].as_str();
        let email = data["email"].as_str();

        if let Some(etype) = employee_type {
            sqlx::query(
                "UPDATE employees SET employee_type = $1, data = $2, aadhaar_number = $3, contact = $4, email = $5
                 WHERE school_id = $6 AND employee_id = $7",
            )
            .bind(etype)
            .bind(&data)
            .bind(aadhaar_number)
            .bind(contact)
            .bind(email)
            .bind(school_id)
            .bind(employee_id)
            .execute(&mut *conn)
            .await?;
        } else {
            sqlx::query(
                "UPDATE employees SET data = $1, aadhaar_number = $2, contact = $3, email = $4
                 WHERE school_id = $5 AND employee_id = $6",
            )
            .bind(&data)
            .bind(aadhaar_number)
            .bind(contact)
            .bind(email)
            .bind(school_id)
            .bind(employee_id)
            .execute(&mut *conn)
            .await?;
        }
        Ok(())
    }

    async fn delete_employee(&self, school_id: &str, employee_id: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM employees WHERE school_id = $1 AND employee_id = $2")
            .bind(school_id)
            .bind(employee_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn generate_employee_id(&self) -> Result<String, AppError> {
        let mut conn = self.client.acquire_super_admin_connection().await?;
        let row = sqlx::query("SELECT nextval('employee_id_seq')")
            .fetch_one(&mut *conn)
            .await?;
        let next_val: i64 = row.get(0);
        Ok(format!("E{:04}", next_val))
    }
}
