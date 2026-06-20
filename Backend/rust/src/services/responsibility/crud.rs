use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use bigdecimal::{ToPrimitive, FromPrimitive};
use serde_json::{json, Value};
use std::sync::Arc;
use sqlx::{Row, Acquire};

fn get_days_in_month(month: i32, year: i32) -> i64 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0) {
                29
            } else {
                28
            }
        }
        _ => 30,
    }
}

fn value_to_bigdecimal(v: &serde_json::Value) -> bigdecimal::BigDecimal {
    if let Some(f) = v.as_f64() {
        if let Some(b) = bigdecimal::BigDecimal::from_f64(f) {
            return b;
        }
    }
    if let Some(s) = v.as_str() {
        if let Ok(b) = s.parse::<bigdecimal::BigDecimal>() {
            return b;
        }
    }
    if let Some(i) = v.as_i64() {
        return bigdecimal::BigDecimal::from(i);
    }
    bigdecimal::BigDecimal::from(0)
}

pub struct ResponsibilityCrud {
    pub repos: Arc<Repositories>,
}

impl ResponsibilityCrud {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn list_responsibilities(
        &self,
        school_id: &str,
        employee_type: Option<String>,
    ) -> AppResult<Vec<Value>> {
        Ok(self.repos
            .responsibility
            .get_responsibilities(school_id, employee_type)
            .await?)
    }

    pub async fn list_responsibilities_paginated(
        &self,
        school_id: &str,
        employee_type: Option<String>,
        page: i32,
        limit: i32,
    ) -> AppResult<Value> {
        Ok(self.repos.responsibility.get_responsibilities_paginated(school_id, employee_type, page, limit).await?)
    }

    pub async fn create_responsibility(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        // --- Validation ---
        let name = data["name"].as_str().filter(|s| !s.trim().is_empty())
            .ok_or_else(|| AppError::from("Responsibility 'name' is required and cannot be empty"))?;
        
        // Check for duplicate responsibility name within same school
        let existing = self.repos.responsibility.get_responsibility_by_name(school_id, name).await?;
        if existing.is_some() {
            return Err(AppError::from(format!("Responsibility with name '{}' already exists in this school", name)));
        }
        
        let _ = data["spaceCategory"].as_str()
            .ok_or_else(|| AppError::from("'spaceCategory' is required"))?;
        
        let _employee_type = data["employeeType"].as_str()
            .ok_or_else(|| AppError::from("'employeeType' is required"))?;

        let space_ids = data["spaceIds"].as_array()
            .ok_or_else(|| AppError::from("'spaceIds' array is required"))?;
        
        if space_ids.is_empty() {
             return Err(AppError::from("At least one 'spaceId' is required in 'spaceIds' array"));
        }

        // --- Space Verification ---
        for sid_val in space_ids {
            let sid = sid_val.as_str().ok_or_else(|| AppError::from("Invalid spaceId in array"))?;
            let space_exists = self.repos.resource.get_space_details(school_id, sid).await?;
            if space_exists.is_none() {
                return Err(AppError::from(format!("Space ID '{}' does not exist in infrastructure records", sid)));
            }
        }

        // --- Employee Validation (if provided) ---
        if let Some(employees) = data["employees"].as_array() {
            for emp in employees {
                if let Some(emp_id) = emp["employeeId"].as_str() {
                    // Verify employee exists
                    let emp_exists = self.repos.employee.get_employee(school_id, emp_id).await?;
                    if emp_exists.is_none() {
                        return Err(AppError::from(format!("Employee ID '{}' does not exist", emp_id)));
                    }
                    
                    // Check if employee already assigned to this responsibility
                    let _assignments = self.repos.responsibility.get_employee_responsibilities(school_id, emp_id).await?;
                    let _responsibility_id_from_name = name.to_uppercase()
                        .chars()
                        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
                        .collect::<String>()
                        .split_whitespace()
                        .collect::<Vec<_>>()
                        .join("_");
                    
                    // We'll check after creation, but we can pre-check by looking for existing assignments
                    // with same responsibility_id (though it doesn't exist yet)
                }
            }
        }

        let res = self.repos.responsibility.add_responsibility(school_id, data.clone()).await?;
        
        if let Some(responsibility_id) = res["responsibilityId"].as_str() {
            // Also assign spaceIds to responsibility root if needed or to employees
            // In user request, they provided spaceIds at root.
            // If they also provide employees, existing logic handles it.
            if let Some(employees) = data["employees"].as_array() {
                let mut assignments = Vec::new();
                for emp in employees {
                    if let Some(emp_id) = emp["employeeId"].as_str() {
                        let e_space_ids: Vec<String> = emp["spaceIds"]
                            .as_array()
                            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                            .unwrap_or_else(|| space_ids.iter().filter_map(|v| v.as_str().map(String::from)).collect()); // Default to root space_ids if not per-employee
                        
                        // Check for duplicate assignment (employee already assigned to this responsibility)
                        let existing_assignments = self.repos.responsibility.get_employee_responsibilities(school_id, emp_id).await?;
                        let already_assigned = existing_assignments.iter().any(|a|
                            a["responsibilityId"].as_str() == Some(responsibility_id)
                        );
                        
                        if already_assigned {
                            return Err(AppError::from(format!("Employee '{}' is already assigned to responsibility '{}'", emp_id, responsibility_id)));
                        }
                        
                        assignments.push((emp_id.to_string(), e_space_ids));
                    }
                }
                
                if !assignments.is_empty() {
                    let _ = self.repos.responsibility.assign_employees_with_spaces(
                        school_id,
                        responsibility_id,
                        assignments,
                    ).await;
                }
            } else {
                // If no employees provided yet, we just created definition.
                // The spaceIds are stored in 'data' blob anyway by default repository logic.
            }
        }

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "RESPONSIBILITY",
            res["responsibilityId"].as_str().unwrap_or("0"),
            "CREATE",
            data
        ).await;
        Ok(res)
    }

    pub async fn get_responsibility(&self, school_id: &str, responsibility_id: &str) -> AppResult<Option<Value>> {
        Ok(self.repos.responsibility.get_responsibility(school_id, responsibility_id).await?)
    }

    pub async fn get_responsibility_analytics(&self, school_id: &str, responsibility_id: &str) -> AppResult<Value> {
        let analytics = self.repos.responsibility.get_responsibility_analytics(school_id, responsibility_id).await?;
        Ok(analytics)
    }

    pub async fn list_student_responsibilities(&self, school_id: &str, student_id: &str) -> AppResult<Vec<Value>> {
        let responsibilities = self.repos.responsibility.get_student_responsibilities(school_id, student_id).await?;
        Ok(responsibilities)
    }

    pub async fn get_employee_responsibilities(&self, school_id: &str, employee_id: &str) -> AppResult<Vec<Value>> {
        let responsibilities = self.repos.responsibility.get_employee_responsibilities(school_id, employee_id).await?;
        Ok(responsibilities)
    }

    pub async fn list_space_responsibilities(&self, school_id: &str, space_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.responsibility.get_space_responsibilities(school_id, space_id).await?)
    }

    pub async fn list_student_responsibilities_paginated(
        &self,
        school_id: &str,
        student_id: &str,
        page: i32,
        limit: i32,
    ) -> AppResult<Value> {
        let result = self.repos.responsibility.get_student_responsibilities_paginated(school_id, student_id, page, limit).await?;
        Ok(result)
    }

    pub async fn get_employee_responsibilities_paginated(
        &self,
        school_id: &str,
        employee_id: &str,
        page: i32,
        limit: i32,
    ) -> AppResult<Value> {
        let result = self.repos.responsibility.get_employee_responsibilities_paginated(school_id, employee_id, page, limit).await?;
        Ok(result)
    }

    pub async fn update_responsibility(&self, school_id: &str, responsibility_id: &str, admin_id: &str, data: Value) -> AppResult<()> {
        // 1. Fetch Old Data for Audit/Recovery
        let old_data = self.repos.responsibility.get_responsibility(school_id, responsibility_id).await?
            .ok_or_else(|| AppError::from("Responsibility not found"))?;

        // 2. Validation (Optional fields but if provided must be valid)
        if let Some(space_ids) = data["spaceIds"].as_array() {
            if space_ids.is_empty() {
                return Err(AppError::from("At least one 'spaceId' is required if 'spaceIds' array is provided"));
            }
            for sid_val in space_ids {
                let sid = sid_val.as_str().ok_or_else(|| AppError::from("Invalid spaceId in array"))?;
                let space_exists = self.repos.resource.get_space_details(school_id, sid).await?;
                if space_exists.is_none() {
                    return Err(AppError::from(format!("Space ID '{}' does not exist in infrastructure records", sid)));
                }
            }
        }

        // 2.5 Check if student_fee changed (for auto-sync)
        let fee_changed = data.get("studentFee").and_then(|v| v.as_f64())
            .map(|new_fee| new_fee != old_data["studentFee"].as_f64().unwrap_or(0.0))
            .unwrap_or(false);

        // 3. Perform update
        self.repos.responsibility.update_responsibility(school_id, responsibility_id, data.clone()).await?;

        // 4. Log Update Action for Recovery (Old vs New)
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "RESPONSIBILITY_UPDATE",
            responsibility_id,
            "UPDATE",
            json!({
                "old": old_data,
                "new": data
            })
        ).await;

        // 5. Auto-sync student fees if student_fee changed
        if fee_changed {
            let affected = self.sync_student_fees_for_responsibility(school_id, responsibility_id).await.unwrap_or(0);
            tracing::info!(
                "Auto-synced student fees for {} students after responsibility '{}' fee changed",
                affected, responsibility_id
            );
        }

        Ok(())
    }

    pub async fn delete_responsibility(&self, school_id: &str, responsibility_id: &str, admin_id: &str) -> AppResult<()> {
        // 1. Fetch Old Data for Audit/Recovery
        let old_data = self.repos.responsibility.get_responsibility(school_id, responsibility_id).await?
            .ok_or_else(|| AppError::from("Responsibility not found"))?;

        // 2. Perform delete (cascade delete will handle employee_responsibilities)
        self.repos.responsibility.delete_responsibility(school_id, responsibility_id).await?;

        // 3. Log Delete Action for Recovery
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "RESPONSIBILITY_DELETE",
            responsibility_id,
            "DELETE",
            json!({
                "old": old_data
            })
        ).await;

        Ok(())
    }

    pub async fn get_overview_analytics(&self, school_id: &str, time_range: &str) -> AppResult<Value> {
        let days = match time_range {
            "7d" => 7,
            "90d" => 90,
            _ => 30,
        };
        Ok(self.repos.responsibility.get_overview_analytics(school_id, days).await?)
    }

    pub async fn export_responsibilities_csv(&self, school_id: &str) -> AppResult<String> {
        Ok(self.repos.responsibility.export_responsibilities_csv(school_id).await?)
    }

    pub async fn import_responsibilities_csv(&self, school_id: &str, admin_id: &str, csv_content: &str) -> AppResult<usize> {
        Ok(self.repos.responsibility.import_responsibilities_csv(school_id, admin_id, csv_content).await?)
    }

    /// Sync student fees: finds all students in spaces covered by this responsibility
    /// and recalculates their totalFees based on the current sum of student_fee for their space.
    pub async fn sync_student_fees_for_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> AppResult<usize> {
        Ok(self.repos.responsibility.sync_student_fees_for_responsibility(school_id, responsibility_id).await?)
    }

    /// Recalculate student fees for all students in the school
    pub async fn recalculate_all_student_fees(&self, school_id: &str) -> AppResult<usize> {
        Ok(self.repos.responsibility.recalculate_all_student_fees(school_id).await?)
    }

    pub async fn generate_salaries_from_responsibilities(
        &self,
        school_id: &str,
        month: i32,
        year: i32,
    ) -> AppResult<Value> {
        Ok(self.repos.responsibility.generate_salaries_from_responsibilities(school_id, month, year).await?)
    }

    pub async fn get_space_financial_overview(
        &self,
        school_id: &str,
        space_id: &str,
    ) -> AppResult<Value> {
        Ok(self.repos.responsibility.get_space_financial_overview(school_id, space_id).await?)
    }
}

