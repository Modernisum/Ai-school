use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresGlobalUserRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl GlobalUserRepository for PostgresGlobalUserRepository {
    async fn sync_user(&self, data: Value) -> Result<(), AppError> {
        let phone = data["phone"].as_str();
        let email = data["email"].as_str();
        let alt_phone = data["alternativePhone"].as_str();
        let aadhaar = data["aadhaarNumber"].as_str();
        let school_id = data["schoolId"].as_str().ok_or("Missing schoolId")?;
        let user_id = data["userId"].as_str().ok_or("Missing userId")?;
        let user_type = data["userType"].as_str().ok_or("Missing userType")?;
        let name = data["name"].as_str();
        let class_name = data["className"].as_str();
        let image_url = data["imageUrl"].as_str();

        sqlx::query(
            "INSERT INTO global_users (
                phone, email, alternative_phone, aadhaar_number, 
                school_id, user_id, user_type, name, class_name, image_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (school_id, user_id, user_type) DO UPDATE SET
                phone = EXCLUDED.phone,
                email = EXCLUDED.email,
                alternative_phone = EXCLUDED.alternative_phone,
                aadhaar_number = EXCLUDED.aadhaar_number,
                name = EXCLUDED.name,
                class_name = EXCLUDED.class_name,
                image_url = EXCLUDED.image_url"
        )
        .bind(phone)
        .bind(email)
        .bind(alt_phone)
        .bind(aadhaar)
        .bind(school_id)
        .bind(user_id)
        .bind(user_type)
        .bind(name)
        .bind(class_name)
        .bind(image_url)
        .execute(&self.client.pool)
        .await?;

        Ok(())
    }

    async fn find_by_identifier(&self, ident: &str) -> Result<Vec<Value>, AppError> {
        let rows = sqlx::query(
            "SELECT * FROM global_users 
             WHERE phone = $1 
                OR email = $1 
                OR alternative_phone = $1 
                OR aadhaar_number = $1"
        )
        .bind(ident)
        .fetch_all(&self.client.pool)
        .await?;

        Ok(rows.into_iter().map(|r| {
            json!({
                "phone": r.get::<Option<String>, _>("phone"),
                "email": r.get::<Option<String>, _>("email"),
                "schoolId": r.get::<String, _>("school_id"),
                "userId": r.get::<String, _>("user_id"),
                "userType": r.get::<String, _>("user_type"),
                "name": r.get::<Option<String>, _>("name"),
                "className": r.get::<Option<String>, _>("class_name"),
                "imageUrl": r.get::<Option<String>, _>("image_url"),
            })
        }).collect())
    }

    async fn sync_all_to_global(&self) -> Result<(), AppError> {
        // 1. Get all schools
        let schools = sqlx::query("SELECT school_id FROM schools")
            .fetch_all(&self.client.pool)
            .await?;

        for school in schools {
            let school_id: String = school.get("school_id");
            let schema_name = format!("school_{}", school_id.replace('-', "_"));

            // 2. Sync Students
            let student_query = format!("SELECT student_id, contact, email, alternative_contact, aadhaar_number, name, class_name FROM {}.students", schema_name);
            let students = sqlx::query(&student_query).fetch_all(&self.client.pool).await;
            
            if let Ok(st_rows) = students {
                for r in st_rows {
                    let sync_data = json!({
                        "phone": r.get::<Option<String>, _>("contact"),
                        "email": r.get::<Option<String>, _>("email"),
                        "alternativePhone": r.get::<Option<String>, _>("alternative_contact"),
                        "aadhaarNumber": r.get::<Option<String>, _>("aadhaar_number"),
                        "schoolId": school_id,
                        "userId": r.get::<String, _>("student_id"),
                        "userType": "student",
                        "name": r.get::<Option<String>, _>("name"),
                        "className": r.get::<Option<String>, _>("class_name"),
                        "imageUrl": null // Profile images might be in a separate field or data JSON
                    });
                    self.sync_user(sync_data).await.ok();
                }
            }

            // 3. Sync Employees
            let employee_query = format!("SELECT employee_id, contact, email, aadhaar_number, data FROM {}.employees", schema_name);
            let employees = sqlx::query(&employee_query).fetch_all(&self.client.pool).await;

            if let Ok(emp_rows) = employees {
                for r in emp_rows {
                    let data: Value = r.get("data");
                    let sync_data = json!({
                        "phone": r.get::<Option<String>, _>("contact"),
                        "email": r.get::<Option<String>, _>("email"),
                        "alternativePhone": data["alternativeContact"],
                        "aadhaarNumber": r.get::<Option<String>, _>("aadhaar_number"),
                        "schoolId": school_id,
                        "userId": r.get::<String, _>("employee_id"),
                        "userType": "employee",
                        "name": data["name"],
                        "imageUrl": data["imageUrl"]
                    });
                    self.sync_user(sync_data).await.ok();
                }
            }
        }
        Ok(())
    }

    async fn delete_user(&self, school_id: &str, user_id: &str, user_type: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM global_users WHERE school_id = $1 AND user_id = $2 AND user_type = $3")
            .bind(school_id)
            .bind(user_id)
            .bind(user_type)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }
}
