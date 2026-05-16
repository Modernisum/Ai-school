use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use bigdecimal::ToPrimitive;
use serde_json::{json, Value};
use std::sync::Arc;
use sqlx::Row;

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
        let offset = (page - 1) * limit;
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;

        let mut query = "SELECT r.* FROM responsibilities r WHERE r.school_id = $1".to_string();
        let mut param_count = 1;

        if let Some(ref _et) = employee_type {
            param_count += 1;
            query.push_str(&format!(" AND r.employee_type = ${}", param_count));
        }

        let total_query = query.replace("SELECT r.*", "SELECT COUNT(*)");

        let mut total_query_builder = sqlx::query(&total_query).bind(school_id);
        if let Some(ref et) = employee_type {
            total_query_builder = total_query_builder.bind(et);
        }

        let total_row = total_query_builder.fetch_one(&mut *conn).await?;
        let total: i64 = total_row.get::<i64, _>("count");

        query.push_str(&format!(" ORDER BY r.created_at DESC LIMIT ${} OFFSET ${}", param_count + 1, param_count + 2));

        let mut query_builder = sqlx::query(&query).bind(school_id);
        if let Some(ref et) = employee_type {
            query_builder = query_builder.bind(et);
        }
        query_builder = query_builder.bind(limit).bind(offset);

        let rows = query_builder.fetch_all(&mut *conn).await?;
        let data: Vec<Value> = rows.iter().map(|row| {
            json!({
                "responsibilityId": row.get::<String, _>("responsibility_id"),
                "name": row.get::<String, _>("name"),
                "description": row.get::<Option<String>, _>("description"),
                "employeeType": row.get::<Option<String>, _>("employee_type"),
                "spaceCategory": row.get::<Option<String>, _>("space_category"),
                "spaceIds": row.get::<Vec<String>, _>("space_ids"),
                "monthlyPrice": row.get::<f64, _>("monthly_price"),
                "perDayPrice": row.get::<f64, _>("per_day_price"),
                "studentFee": row.get::<f64, _>("student_fee"),
                "workLevel": row.get::<Option<String>, _>("work_level"),
                "workPeriod": row.get::<Option<String>, _>("work_period"),
                "workAmount": row.get::<f64, _>("work_amount"),
                "createdAt": row.get::<String, _>("created_at"),
                "updatedAt": row.get::<String, _>("updated_at"),
            })
        }).collect();

        let pages = ((total as f64) / (limit as f64)).ceil() as i32;

        Ok(json!({
            "data": data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": pages
            }
        }))
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
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT r.*, er.space_ids as assigned_space_ids,
                    COALESCE(r.data->>'mandatory', 'false') = 'true' as is_mandatory
             FROM responsibilities r
             JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id
             WHERE er.school_id = $1 AND er.space_ids @> to_jsonb($2::text)"
        )
        .bind(school_id)
        .bind(space_id)
        .fetch_all(&mut *conn)
        .await?;

        let items: Vec<Value> = rows.iter().map(|row| {
            json!({
                "responsibilityId": row.get::<String, _>("responsibility_id"),
                "name": row.get::<String, _>("name"),
                "description": row.get::<Option<String>, _>("description"),
                "employeeType": row.get::<Option<String>, _>("employee_type"),
                "studentFee": row.get::<f64, _>("student_fee"),
                "monthlyPrice": row.get::<f64, _>("monthly_price"),
                "perDayPrice": row.get::<f64, _>("per_day_price"),
                "spaceCategory": row.get::<Option<String>, _>("space_category"),
                "isMandatory": row.get::<bool, _>("is_mandatory")
            })
        }).collect();

        Ok(items)
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

        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;

        // Total responsibilities
        let total_resp: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM responsibilities WHERE school_id = $1"
        )
        .bind(school_id)
        .fetch_one(&mut *conn)
        .await?;

        // Active assignments
        let active_assignments: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM employee_responsibilities WHERE school_id = $1"
        )
        .bind(school_id)
        .fetch_one(&mut *conn)
        .await?;

        // Spaces covered
        let spaces_covered: i64 = sqlx::query_scalar(
            "SELECT COUNT(DISTINCT jsonb_array_elements_text(space_ids)) FROM responsibilities WHERE school_id = $1"
        )
        .bind(school_id)
        .fetch_one(&mut *conn)
        .await?;

        // Monthly revenue
        let monthly_revenue: f64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(monthly_price), 0) FROM employee_responsibilities er
             JOIN responsibilities r ON er.responsibility_id = r.responsibility_id AND er.school_id = r.school_id
             WHERE er.school_id = $1"
        )
        .bind(school_id)
        .fetch_one(&mut *conn)
        .await?;

        // Employee workload
        let employee_workload: Vec<sqlx::postgres::PgRow> = sqlx::query(
            "SELECT COALESCE(e.data->>'name', 'Unnamed') AS name, COUNT(er.responsibility_id) as assignments
             FROM employees e
             LEFT JOIN employee_responsibilities er ON e.employee_id = er.employee_id
             WHERE e.school_id = $1
             GROUP BY e.employee_id, e.data->>'name'
             ORDER BY assignments DESC
             LIMIT 10"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let workload_data: Vec<Value> = employee_workload.iter().map(|row| {
            json!({
                "name": row.try_get::<String, _>("name").unwrap_or_default(),
                "assignments": row.try_get::<i64, _>("assignments").unwrap_or(0)
            })
        }).collect();

        // Space utilization
        let space_util: Vec<sqlx::postgres::PgRow> = sqlx::query(
            "SELECT s.name, COUNT(er.responsibility_id) as value
             FROM spaces s
             LEFT JOIN responsibilities r ON r.space_ids @> to_jsonb(ARRAY[s.space_id::text])
             LEFT JOIN employee_responsibilities er ON er.responsibility_id = r.responsibility_id
             WHERE s.school_id = $1
             GROUP BY s.space_id, s.name
             ORDER BY value DESC
             LIMIT 5"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let utilization_data: Vec<Value> = space_util.iter().map(|row| {
            json!({
                "name": row.try_get::<String, _>("name").unwrap_or_default(),
                "value": row.try_get::<i64, _>("value").unwrap_or(0)
            })
        }).collect();

        // Revenue trend
        let revenue_trend = sqlx::query(
            "SELECT DATE(er.created_at) as date, SUM(r.monthly_price) as revenue
             FROM employee_responsibilities er
             JOIN responsibilities r ON er.responsibility_id = r.responsibility_id AND er.school_id = r.school_id
             WHERE er.school_id = $1
               AND er.created_at >= NOW() - INTERVAL '1 day' * $2
             GROUP BY DATE(er.created_at)
             ORDER BY date ASC"
        )
        .bind(school_id)
        .bind(days)
        .fetch_all(&mut *conn)
        .await?;

        let trend_data: Vec<Value> = revenue_trend.iter().map(|row| {
            json!({
                "date": row.try_get::<String, _>("date").unwrap_or_default(),
                "revenue": row.try_get::<f64, _>("revenue").unwrap_or(0.0)
            })
        }).collect();

        // Top responsibilities by revenue
        let top_resp = sqlx::query(
            "SELECT r.name, COUNT(er.employee_id) as assignments,
                    COUNT(DISTINCT unnest(r.space_ids)) as spaces,
                    SUM(r.monthly_price) as revenue
             FROM responsibilities r
             LEFT JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id
             WHERE r.school_id = $1
             GROUP BY r.responsibility_id, r.name
             ORDER BY revenue DESC
             LIMIT 10"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let top_data: Vec<Value> = top_resp.iter().map(|row| {
            json!({
                "name": row.try_get::<String, _>("name").unwrap_or_default(),
                "assignments": row.try_get::<i64, _>("assignments").unwrap_or(0),
                "spaces": row.try_get::<i64, _>("spaces").unwrap_or(0),
                "revenue": row.try_get::<f64, _>("revenue").unwrap_or(0.0)
            })
        }).collect();

        Ok(json!({
            "totalResponsibilities": total_resp,
            "activeAssignments": active_assignments,
            "spacesCovered": spaces_covered,
            "monthlyRevenue": monthly_revenue,
            "employeeWorkload": workload_data,
            "spaceUtilization": utilization_data,
            "revenueTrend": trend_data,
            "topResponsibilities": top_data
        }))
    }

    pub async fn export_responsibilities_csv(&self, school_id: &str) -> AppResult<String> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let rows = sqlx::query(
            "SELECT r.responsibility_id, r.name, r.description, r.employee_type,
                    r.monthly_price, r.per_day_price, r.student_fee,
                    r.space_category, r.work_level, r.work_period, r.work_amount,
                    r.created_at
             FROM responsibilities r
             WHERE r.school_id = $1
             ORDER BY r.created_at DESC"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let mut csv = String::from("ID,Name,Description,Employee Type,Monthly Price,Per Day Price,Student Fee,Space Category,Work Level,Work Period,Work Amount,Created At\n");
        
        for row in rows {
            csv.push_str(&format!(
                "{},{},{},{},{},{},{},{},{},{},{},{}\n",
                row.get::<String, _>("responsibility_id"),
                row.get::<String, _>("name"),
                row.get::<Option<String>, _>("description").unwrap_or_default(),
                row.get::<Option<String>, _>("employee_type").unwrap_or_default(),
                row.get::<f64, _>("monthly_price"),
                row.get::<f64, _>("per_day_price"),
                row.get::<f64, _>("student_fee"),
                row.get::<Option<String>, _>("space_category").unwrap_or_default(),
                row.get::<Option<String>, _>("work_level").unwrap_or_default(),
                row.get::<Option<String>, _>("work_period").unwrap_or_default(),
                row.get::<f64, _>("work_amount"),
                row.get::<String, _>("created_at")
            ));
        }
        
        Ok(csv)
    }

    pub async fn import_responsibilities_csv(&self, school_id: &str, admin_id: &str, csv_content: &str) -> AppResult<usize> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        let mut count = 0;
        
        for line in csv_content.lines().skip(1) {
            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() < 2 {
                continue;
            }
            
            let name = parts[1].trim();
            if name.is_empty() {
                continue;
            }
            
            // Check for duplicate
            let existing = self.repos.responsibility.get_responsibility_by_name(school_id, name).await?;
            if existing.is_some() {
                continue;
            }
            
            let responsibility_id = format!("resp_{}", uuid::Uuid::new_v4());
            
            sqlx::query(
                "INSERT INTO responsibilities (school_id, responsibility_id, name, description, employee_type,
                 monthly_price, per_day_price, student_fee, space_category, work_level, work_period, work_amount,
                 created_by, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())"
            )
            .bind(school_id)
            .bind(&responsibility_id)
            .bind(name)
            .bind(parts.get(2).map(|s| s.trim()))
            .bind(parts.get(3).map(|s| s.trim()))
            .bind(parts.get(4).and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0))
            .bind(parts.get(5).and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0))
            .bind(parts.get(6).and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0))
            .bind(parts.get(7).map(|s| s.trim()))
            .bind(parts.get(8).map(|s| s.trim()))
            .bind(parts.get(9).map(|s| s.trim()))
            .bind(parts.get(10).and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0))
            .bind(admin_id)
            .execute(&mut *conn)
            .await?;
            
            count += 1;
        }

        Ok(count)
    }

    /// Sync student fees: finds all students in spaces covered by this responsibility
    /// and recalculates their totalFees based on the current sum of student_fee for their space.
    pub async fn sync_student_fees_for_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> AppResult<usize> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;

        let space_rows: Vec<(String,)> = sqlx::query_as(
            "SELECT DISTINCT jsonb_array_elements_text(er.space_ids) as space_id
             FROM employee_responsibilities er
             WHERE er.school_id = $1 AND er.responsibility_id = $2"
        )
        .bind(school_id)
        .bind(responsibility_id)
        .fetch_all(&mut *conn)
        .await?;

        let space_ids: Vec<String> = space_rows.into_iter().map(|(s,)| s).collect();

        if space_ids.is_empty() {
            return Ok(0);
        }

        let mut affected = 0usize;

        for space_id in &space_ids {
            let fee_sum: Option<bigdecimal::BigDecimal> = sqlx::query_scalar(
                "SELECT SUM(r.student_fee) FROM responsibilities r
                 JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id
                 WHERE er.school_id = $1 AND er.space_ids @> to_jsonb($2::text)"
            )
            .bind(school_id)
            .bind(space_id)
            .fetch_optional(&mut *conn)
            .await?;

            let new_fee = fee_sum.map(|v| v.to_f64().unwrap_or(0.0)).unwrap_or(0.0);

            let result = sqlx::query(
                "UPDATE students SET total_fees = $1, updated_at = NOW()
                 WHERE school_id = $2 AND CONCAT(COALESCE(class_name, ''), '-', COALESCE(section, '')) = $3"
            )
            .bind(new_fee)
            .bind(school_id)
            .bind(space_id)
            .execute(&mut *conn)
            .await?;

            affected += result.rows_affected() as usize;
        }

        Ok(affected)
    }

    /// Recalculate student fees for all students in the school
    pub async fn recalculate_all_student_fees(&self, school_id: &str) -> AppResult<usize> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;

        let students: Vec<(String, String, String)> = sqlx::query_as(
            "SELECT student_id, COALESCE(class_name, '') as class_name, COALESCE(section, '') as section FROM students WHERE school_id = $1"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let mut affected = 0usize;

        for (student_id, class_name, section) in &students {
            let space_id = if section.is_empty() {
                class_name.clone()
            } else {
                format!("{}-{}", class_name, section)
            };

            let fee_sum: Option<bigdecimal::BigDecimal> = sqlx::query_scalar(
                "SELECT SUM(r.student_fee) FROM responsibilities r
                 JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id
                 WHERE er.school_id = $1 AND er.space_ids @> to_jsonb($2::text)"
            )
            .bind(school_id)
            .bind(space_id)
            .fetch_optional(&mut *conn)
            .await?;

            let new_fee = fee_sum.map(|v| v.to_f64().unwrap_or(0.0)).unwrap_or(0.0);

            sqlx::query(
                "UPDATE students SET total_fees = $1, updated_at = NOW() WHERE school_id = $2 AND student_id = $3"
            )
            .bind(new_fee)
            .bind(school_id)
            .bind(student_id)
            .execute(&mut *conn)
            .await?;

            affected += 1;
        }

        Ok(affected)
    }

    /// Generate monthly salary records for all employees based on their responsibility assignments.
    pub async fn generate_salaries_from_responsibilities(
        &self,
        school_id: &str,
        month: i32,
        year: i32,
    ) -> AppResult<Value> {
        let employees = self.repos.employee.get_employees(school_id).await?;
        let mut generated = 0usize;
        let mut failed = 0usize;
        let mut errors = Vec::new();
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;

        for emp in &employees {
            let emp_id = match emp["employeeId"].as_str() {
                Some(id) => id,
                None => continue,
            };

            let mut spaces_component = 0.0f64;
            let responsibilities = self
                .repos
                .responsibility
                .get_employee_responsibilities(school_id, emp_id)
                .await
                .unwrap_or_default();

            for r in &responsibilities {
                let monthly_price = r["monthlyPrice"].as_f64().unwrap_or(0.0);
                let spaces_count = r["assignedSpaceIds"]
                    .as_array()
                    .map(|arr| arr.len() as f64)
                    .unwrap_or(1.0);
                spaces_component += monthly_price * spaces_count;
            }

            let base_salary = emp["baseSalary"].as_f64().unwrap_or(0.0);
            let bonus = emp["bonus"].as_f64().unwrap_or(0.0);
            let aid = emp["aid"].as_f64().unwrap_or(0.0);
            let exp_years = emp["experienceYears"].as_f64().unwrap_or(0.0);
            let exp_rate = emp["experienceRate"].as_f64().unwrap_or(0.0);
            let tenure_months = emp["tenureMonths"].as_f64().unwrap_or(0.0);
            let tenure_rate = emp["tenureRate"].as_f64().unwrap_or(0.0);

            let exp_component = exp_years * exp_rate;
            let tenure_component = tenure_months * tenure_rate;
            let gross_salary = spaces_component + exp_component + tenure_component + bonus + aid;

            let attendance = self
                .repos
                .attendance
                .get_attendance(school_id, "employee", emp_id)
                .await
                .unwrap_or_default();

            let absent_days = attendance.iter().filter(|a| {
                a["status"] == "absent"
                    && a["month"].as_i64() == Some(month as i64)
                    && a["year"].as_i64() == Some(year as i64)
            }).count() as f64;

            let daily_rate = gross_salary / 30.0;
            let deductions = absent_days * daily_rate;
            let net_salary = (gross_salary - deductions).max(0.0);

            let salary_id = format!("sal_{}_{}", emp_id, uuid::Uuid::new_v4().to_string()[..8].to_string());

            let result = sqlx::query(
                "INSERT INTO salaries (salary_id, school_id, employee_id, month, year,
                 base_salary, bonus, total_salary, due_amount, status, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
                 ON CONFLICT (salary_id) DO UPDATE SET
                 total_salary = EXCLUDED.total_salary,
                 due_amount = EXCLUDED.due_amount,
                 status = EXCLUDED.status,
                 updated_at = NOW()"
            )
            .bind(&salary_id)
            .bind(school_id)
            .bind(emp_id)
            .bind(month)
            .bind(year)
            .bind(base_salary)
            .bind(bonus)
            .bind(net_salary)
            .bind(net_salary)
            .bind("DUE")
            .execute(&mut *conn)
            .await;

            match result {
                Ok(_) => generated += 1,
                Err(e) => {
                    failed += 1;
                    errors.push(json!({"employeeId": emp_id, "error": e.to_string()}));
                }
            }
        }

        Ok(json!({
            "schoolId": school_id,
            "month": month,
            "year": year,
            "totalEmployees": employees.len(),
            "generated": generated,
            "failed": failed,
            "errors": errors
        }))
    }
}
