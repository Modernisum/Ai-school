use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct PostgresEmployeeService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl EmployeeService for PostgresEmployeeService {
    async fn create_employee(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        // Security checks (Aadhaar uniqueness)
        self.validate_employee_data(school_id, data.clone()).await?;

        let employee_id = self.repos.employee.generate_employee_id().await?;
        let mut emp_data = data.clone();
        emp_data["employeeId"] = json!(employee_id);
        emp_data["status"] = json!("active");

        self.repos
            .employee
            .add_employee(school_id, emp_data.clone())
            .await?;

        // Audit Log
        self.repos.audit.log_action(
            school_id,
            admin_id,
            "EMPLOYEE",
            &employee_id,
            "CREATE",
            emp_data.clone()
        ).await.ok();
        
        // Sync to Global
        let sync_data = json!({
            "phone": emp_data["contact"],
            "email": emp_data["email"],
            "alternativePhone": emp_data["alternativeContact"],
            "aadhaarNumber": emp_data["aadhaarNumber"],
            "schoolId": school_id,
            "userId": employee_id,
            "userType": "employee",
            "name": emp_data["name"],
            "imageUrl": emp_data["imageUrl"]
        });
        self.repos.global_user.sync_user(sync_data).await.ok();

        Ok(emp_data)
    }

    async fn bulk_create_employees(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Vec<Value>,
    ) -> AppResult<Value> {
        let mut successful = 0;
        let mut failed = 0;
        let mut errors = Vec::new();

        for (index, mut emp_data) in data.into_iter().enumerate() {
            let row_number = emp_data["rowNumber"].as_u64().unwrap_or((index + 2) as u64);

            let name = match emp_data["name"].as_str() {
                Some(n) if !n.trim().is_empty() => n.to_string(),
                _ => {
                    failed += 1;
                    errors.push(json!({ "row": row_number, "error": "Missing name" }));
                    continue;
                }
            };

            let employee_id = match self.repos.employee.generate_employee_id().await {
                Ok(id) => id,
                Err(e) => {
                    failed += 1;
                    errors.push(json!({ "row": row_number, "name": name, "error": format!("Failed to generate employee ID: {}", e) }));
                    continue;
                }
            };

            emp_data["employeeId"] = json!(employee_id);
            emp_data["status"] = json!("active");

            match self.repos.employee.add_employee(school_id, emp_data.clone()).await {
                Ok(_) => {
                    successful += 1;
                    // Audit Log
                    let employee_id_str = emp_data["employeeId"].as_str().unwrap_or("unknown").to_string();
                    self.repos.audit.log_action(
                        school_id,
                        admin_id,
                        "EMPLOYEE",
                        &employee_id_str,
                        "CREATE_BULK",
                        emp_data.clone()
                    ).await.ok();

                    // Sync to Global
                    let sync_data = json!({
                        "phone": emp_data["contact"],
                        "email": emp_data["email"],
                        "alternativePhone": emp_data["alternativeContact"],
                        "aadhaarNumber": emp_data["aadhaarNumber"],
                        "schoolId": school_id,
                        "userId": employee_id_str,
                        "userType": "employee",
                        "name": emp_data["name"],
                        "imageUrl": emp_data["imageUrl"]
                    });
                    self.repos.global_user.sync_user(sync_data).await.ok();
                },
                Err(e) => {
                    failed += 1;
                    errors.push(json!({ "row": row_number, "name": name, "error": format!("Database Error: {}", e) }));
                }
            }
        }

        tracing::info!(
            "Bulk employee import for school {}: {} successful, {} failed",
            school_id,
            successful,
            failed
        );

        Ok(json!({
            "total": successful + failed,
            "successful": successful,
            "failed": failed,
            "errors": errors
        }))
    }

    async fn list_employees(
        &self,
        school_id: &str,
    ) -> AppResult<Vec<Value>> {
        self.repos.employee.get_employees(school_id).await.map_err(AppError::from)
    }

    async fn get_employee(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> AppResult<Option<Value>> {
        self.repos
            .employee
            .get_employee(school_id, employee_id)
            .await
            .map_err(AppError::from)
    }

    async fn update_employee(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()> {
        let old_emp = self.repos.employee.get_employee(school_id, employee_id).await?
            .ok_or_else(|| AppError::NotFound("Employee not found".to_string()))?;

        self.repos
            .employee
            .update_employee(school_id, employee_id, data.clone())
            .await?;

        let delta = self.calculate_delta(&old_emp, &data);

        // Audit Log
        if !delta.as_object().map(|o| o.is_empty()).unwrap_or(true) {
            self.repos.audit.log_action(
                school_id,
                admin_id,
                "EMPLOYEE",
                employee_id,
                "UPDATE",
                delta
            ).await.ok();
        }

        // Sync Updated Data to Global
        let updated_emp = self.repos.employee.get_employee(school_id, employee_id).await?.unwrap_or(data);
        let sync_data = json!({
            "phone": updated_emp["contact"],
            "email": updated_emp["email"],
            "alternativePhone": updated_emp["alternativeContact"],
            "aadhaarNumber": updated_emp["aadhaarNumber"],
            "schoolId": school_id,
            "userId": employee_id,
            "userType": "employee",
            "name": updated_emp["name"],
            "imageUrl": updated_emp["imageUrl"]
        });
        self.repos.global_user.sync_user(sync_data).await.ok();

        Ok(())
    }

    async fn delete_employee(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
    ) -> AppResult<()> {
        let emp = self.repos.employee.get_employee(school_id, employee_id).await?;
        
        self.repos
            .employee
            .delete_employee(school_id, employee_id)
            .await?;

        if let Some(e) = emp {
            // Audit Log
            self.repos.audit.log_action(
                school_id,
                admin_id,
                "EMPLOYEE",
                employee_id,
                "DELETE",
                e
            ).await.ok();

            // Remove from Global
            self.repos.global_user.delete_user(school_id, employee_id, "employee").await.ok();
        }

        Ok(())
    }

    async fn validate_employee_data(&self, school_id: &str, data: Value) -> AppResult<()> {
        // 1. Aadhaar Uniqueness (Cross Student & Employee)
        if let Some(aadhaar) = data["aadhaarNumber"].as_str() {
            if !aadhaar.trim().is_empty() {
                // Reuse the check_aadhaar_exists from student repo as it's cross-table
                if self.repos.student.check_aadhaar_exists(school_id, aadhaar, None).await? {
                    return Err(AppError::Validation("Aadhaar Number already exists for another student or staff member".to_string()));
                }
            }
        }
        Ok(())
    }
}

impl PostgresEmployeeService {
    fn calculate_delta(&self, old: &Value, new: &Value) -> Value {
        let mut delta = json!({});
        if let (Some(old_obj), Some(new_obj)) = (old.as_object(), new.as_object()) {
            for (key, new_val) in new_obj {
                if key == "updatedAt" || key == "updated_at" || key == "createdAt" || key == "created_at" {
                    continue;
                }
                if let Some(old_val) = old_obj.get(key) {
                    if old_val != new_val {
                        delta[key] = json!({
                            "old": old_val.clone(),
                            "new": new_val.clone()
                        });
                    }
                } else {
                    delta[key] = json!({
                        "old": null,
                        "new": new_val.clone()
                    });
                }
            }
        }
        delta
    }
}
