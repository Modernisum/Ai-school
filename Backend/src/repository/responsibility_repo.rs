use crate::db::DbClient;
use crate::repository::traits::*;
use crate::repository::query_builder;
use async_trait::async_trait;
use bigdecimal::ToPrimitive;
use serde_json::{json, Value};
use sqlx::{Acquire, Row};
use std::sync::Arc;

pub struct PostgresResponsibilityRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl ResponsibilityRepository for PostgresResponsibilityRepository {
    async fn get_responsibilities(
        &self,
        school_id: &str,
        employee_type: Option<String>,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        // Use query builder instead of hardcoded SQL
        let mut query_builder = query_builder::build_responsibility_query(
            school_id,
            employee_type.as_deref(),
            None, // space_id
            None, // search
            None, // limit
            None, // offset
        );

        let rows = query_builder
            .build()
            .fetch_all(&mut *conn)
            .await?;

        Ok(rows.into_iter().map(|r| {
             let rid: String = r.try_get("responsibility_id").unwrap_or_default();
             json!({
                "responsibilityId": rid,
                "name": r.try_get::<String, _>("name").unwrap_or_default(),
                "description": r.try_get::<Option<String>, _>("description").ok().flatten(),
                "spaceId": r.try_get::<Option<String>, _>("space_id").ok().flatten(),
                "employeeType": r.try_get::<Option<String>, _>("employee_type").ok().flatten(),
                "monthlyPrice": r.try_get::<bigdecimal::BigDecimal, _>("monthly_price").ok().map(|b| b.to_string()).unwrap_or_else(|| "0.00".to_string()),
                "perDayPrice": r.try_get::<bigdecimal::BigDecimal, _>("per_day_price").ok().map(|b| b.to_string()).unwrap_or_else(|| "0.00".to_string()),
                "studentFee": r.try_get::<bigdecimal::BigDecimal, _>("student_fee").ok().map(|b| b.to_string()).unwrap_or_else(|| "0.00".to_string()),
                "createdAt": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
             })
        }).collect())
    }

    async fn get_responsibilities_paginated(
        &self,
        school_id: &str,
        employee_type: Option<String>,
        page: i32,
        limit: i32,
    ) -> Result<Value, AppError> {
        let offset = (page - 1) * limit;
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        // Build query with pagination
        let mut query_builder = query_builder::build_responsibility_query(
            school_id,
            employee_type.as_deref(),
            None, // space_id
            None, // search
            Some(limit as i64),
            Some(offset as i64),
        );

        // Get total count with parameterized query
        let mut total_query = "SELECT COUNT(*) FROM responsibilities WHERE school_id = $1".to_string();
        if employee_type.is_some() {
            total_query.push_str(" AND employee_type = $2");
        }
        
        let mut total_query_builder = sqlx::query(&total_query).bind(school_id);
        if let Some(ref et) = employee_type {
            total_query_builder = total_query_builder.bind(et);
        }
        
        let total_row = total_query_builder
            .fetch_one(&mut *conn)
            .await?;
        let total: i64 = total_row.get::<i64, _>("count");

        // Get paginated data
        let rows = query_builder
            .build()
            .fetch_all(&mut *conn)
            .await?;

        let data: Vec<Value> = rows.into_iter().map(|r| {
            let rid: String = r.try_get("responsibility_id").unwrap_or_default();
            json!({
                "responsibilityId": rid,
                "name": r.try_get::<String, _>("name").unwrap_or_default(),
                "description": r.try_get::<Option<String>, _>("description").ok().flatten(),
                "spaceId": r.try_get::<Option<String>, _>("space_id").ok().flatten(),
                "employeeType": r.try_get::<Option<String>, _>("employee_type").ok().flatten(),
                "monthlyPrice": r.try_get::<bigdecimal::BigDecimal, _>("monthly_price").ok().map(|b| b.to_string()).unwrap_or_else(|| "0.00".to_string()),
                "perDayPrice": r.try_get::<bigdecimal::BigDecimal, _>("per_day_price").ok().map(|b| b.to_string()).unwrap_or_else(|| "0.00".to_string()),
                "studentFee": r.try_get::<bigdecimal::BigDecimal, _>("student_fee").ok().map(|b| b.to_string()).unwrap_or_else(|| "0.00".to_string()),
                "createdAt": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
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

    async fn add_responsibility(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        let name = data["name"]
            .as_str()
            .ok_or_else(|| AppError::from("Name is required"))?;
        let responsibility_id = name
            .to_uppercase()
            .chars()
            .filter(|c| c.is_alphanumeric() || c.is_whitespace())
            .collect::<String>()
            .split_whitespace()
            .collect::<Vec<_>>()
            .join("_");

        sqlx::query(
            "INSERT INTO responsibilities (responsibility_id, school_id, name, description, per_day_price, time_period, employee_type, monthly_price, student_fee, data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (responsibility_id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description"
        )
            .bind(&responsibility_id)
            .bind(school_id)
            .bind(name)
            .bind(data["description"].as_str())
            .bind(data["perDayPrice"].as_f64().unwrap_or(0.0))
            .bind(data["timePeriod"].as_i64().unwrap_or(0) as i32)
            .bind(data["employeeType"].as_str())
            .bind(data["monthlyPrice"].as_f64().unwrap_or(0.0))
            .bind(data["studentFee"].as_f64().unwrap_or(0.0))
            .bind(json!({})) // Empty JSON for now
            .execute(&mut *conn).await?;

        let mut ret = data.clone();
        ret["responsibilityId"] = json!(responsibility_id);
        Ok(ret)
    }

    async fn assign_employees_with_spaces(
        &self,
        school_id: &str,
        responsibility_id: &str,
        assignments: Vec<(String, Vec<String>)>,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        for (emp_id, space_ids) in assignments {
            sqlx::query(
                "INSERT INTO employee_responsibilities (school_id, employee_id, responsibility_id, space_ids) 
                 VALUES ($1, $2, $3, $4) 
                 ON CONFLICT (school_id, employee_id, responsibility_id) 
                 DO UPDATE SET space_ids = EXCLUDED.space_ids"
            )
            .bind(school_id)
            .bind(&emp_id)
            .bind(responsibility_id)
            .bind(serde_json::to_value(&space_ids)?)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(())
    }

    async fn assign_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        // 1. Update Join Table
        sqlx::query("INSERT INTO employee_responsibilities (school_id, employee_id, responsibility_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING")
            .bind(school_id).bind(employee_id).bind(responsibility_id).execute(&mut *tx).await?;

        // 2. Sync to Employee Data (ID Integration)
        sqlx::query(
            "UPDATE employees 
             SET data = jsonb_set(
                 COALESCE(data, '{}'::jsonb), 
                 '{responsibilities}', 
                 (SELECT json_agg(responsibility_id) FROM employee_responsibilities WHERE school_id = $1 AND employee_id = $2)::jsonb, 
                 true
             )
             WHERE school_id = $1 AND employee_id = $2"
        )
        .bind(school_id)
        .bind(employee_id)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(())
    }

    async fn bulk_assign_responsibilities(
        &self,
        school_id: &str,
        employee_ids: Vec<String>,
        responsibility_ids: Vec<String>,
        space_ids: Vec<String>,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        for emp_id in &employee_ids {
            for resp_id in &responsibility_ids {
                sqlx::query(
                    "INSERT INTO employee_responsibilities (school_id, employee_id, responsibility_id, space_ids) 
                     VALUES ($1, $2, $3, $4) 
                     ON CONFLICT (school_id, employee_id, responsibility_id) 
                     DO UPDATE SET space_ids = EXCLUDED.space_ids"
                )
                .bind(school_id)
                .bind(emp_id)
                .bind(resp_id)
                .bind(serde_json::to_value(&space_ids)?)
                .execute(&mut *tx)
                .await?;
            }
        }

        tx.commit().await?;
        Ok(())
    }

    async fn remove_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        // 1. Remove from Join Table
        sqlx::query("DELETE FROM employee_responsibilities WHERE school_id = $1 AND employee_id = $2 AND responsibility_id = $3")
            .bind(school_id).bind(employee_id).bind(responsibility_id).execute(&mut *tx).await?;

        // 2. Sync to Employee Data (ID Integration) - Re-calculate list or set to empty if none
        sqlx::query(
            "UPDATE employees 
             SET data = jsonb_set(
                 COALESCE(data, '{}'::jsonb), 
                 '{responsibilities}', 
                 (SELECT COALESCE(json_agg(responsibility_id), '[]'::json) FROM employee_responsibilities WHERE school_id = $1 AND employee_id = $2)::jsonb, 
                 true
             )
             WHERE school_id = $1 AND employee_id = $2"
        )
        .bind(school_id)
        .bind(employee_id)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(())
    }

    async fn get_student_fee_sum_for_space(
        &self,
        school_id: &str,
        space_id: &str,
    ) -> Result<f64, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let result: Option<bigdecimal::BigDecimal> = sqlx::query_scalar(
            "SELECT SUM(r.student_fee) FROM responsibilities r 
             WHERE r.school_id = $1 AND r.responsibility_id IN (
                 SELECT DISTINCT er.responsibility_id 
                 FROM employee_responsibilities er 
                 WHERE er.school_id = $1 AND er.space_ids @> to_jsonb($2::text)
             )"
        )
        .bind(school_id)
        .bind(space_id)
        .fetch_optional(&mut *conn)
        .await?;

        Ok(result.map(|val| val.to_f64().unwrap_or(0.0)).unwrap_or(0.0))
    }

    async fn get_responsibility_analytics(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        // 1. Get employees assigned and aggregate space IDs
        let emp_rows = sqlx::query(
            "SELECT er.employee_id, e.data->>'name' as employee_name, er.space_ids
             FROM employee_responsibilities er 
             LEFT JOIN employees e ON er.employee_id = e.employee_id AND er.school_id = e.school_id
             WHERE er.school_id = $1 AND er.responsibility_id = $2",
        )
        .bind(school_id)
        .bind(responsibility_id)
        .fetch_all(&mut *conn)
        .await?;

        let mut assigned_employees = Vec::new();
        let mut all_space_ids = std::collections::HashSet::new();

        for row in emp_rows {
            let emp_id: String = row.get("employee_id");
            let emp_name: Option<String> = row.get("employee_name");

            assigned_employees.push(json!({
                "employeeId": emp_id,
                "name": emp_name.unwrap_or_default()
            }));

            if let Ok(spaces) = row.try_get::<Value, _>("space_ids") {
                if let Some(arr) = spaces.as_array() {
                    for s in arr {
                        if let Some(space_str) = s.as_str() {
                            all_space_ids.insert(space_str.to_string());
                        }
                    }
                }
            }
        }

        let active_spaces: Vec<String> = all_space_ids.into_iter().collect();

        // 2. Find students across these active spaces
        let mut total_students = 0;
        let mut classes_distribution = serde_json::Map::new();

        if !active_spaces.is_empty() {
            let st_rows = sqlx::query(
                "SELECT class_name, COUNT(*) as student_count 
                 FROM students 
                 WHERE school_id = $1 AND room_number = ANY($2) AND status = 'active'
                 GROUP BY class_name",
            )
            .bind(school_id)
            .bind(&active_spaces)
            .fetch_all(&mut *conn)
            .await?;

            for row in st_rows {
                let cname: String = row.get("class_name");
                let count: i64 = row.get("student_count");
                total_students += count;
                classes_distribution.insert(cname, json!(count));
            }
        }

        // 3. Get responsibility fee to calculate total projected revenue
        let fee: Option<bigdecimal::BigDecimal> = sqlx::query_scalar(
            "SELECT student_fee FROM responsibilities WHERE school_id = $1 AND responsibility_id = $2"
        )
        .bind(school_id)
        .bind(responsibility_id)
        .fetch_optional(&mut *conn)
        .await?;

        let fee_val = fee.map(|v| v.to_f64().unwrap_or(0.0)).unwrap_or(0.0);
        let combined_fee_generated = fee_val * (total_students as f64);

        Ok(json!({
            "responsibilityId": responsibility_id,
            "assignedEmployees": assigned_employees,
            "activeSpaces": active_spaces,
            "consumingStudents": {
                "totalCount": total_students,
                "byClass": classes_distribution,
                "combinedFeeGenerated": combined_fee_generated
            }
        }))
    }

    async fn get_student_responsibilities(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        // 1. Get student's class details
        let info_opt = sqlx::query(
            "SELECT class_name, section FROM students WHERE school_id = $1 AND student_id = $2",
        )
        .bind(school_id)
        .bind(student_id)
        .fetch_optional(&mut *conn)
        .await?;

        let rn = match info_opt {
            Some(row) => {
                let class_name = row
                    .get::<Option<String>, _>("class_name")
                    .unwrap_or_default();
                let section = row.get::<Option<String>, _>("section").unwrap_or_default();
                if class_name.is_empty() || section.is_empty() {
                    return Ok(vec![]);
                }
                format!("{}-{}", class_name, section)
            }
            None => return Ok(vec![]),
        };

        // 2. Fetch responsibilities where assigned space_ids contain this room
        let rows = sqlx::query(
            "SELECT DISTINCT r.responsibility_id, r.name, r.student_fee 
             FROM responsibilities r 
             JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id 
             WHERE er.school_id = $1 AND er.space_ids @> to_jsonb($2::text)"
        )
        .bind(school_id)
        .bind(&rn)
        .fetch_all(&mut *conn)
        .await?;

        let items: Vec<Value> = rows
            .into_iter()
            .map(|row| {
                json!({
                    "responsibilityId": row.get::<String, _>("responsibility_id"),
                    "name": row.get::<String, _>("name"),
                    "studentFee": row.try_get::<bigdecimal::BigDecimal, _>("student_fee")
                        .unwrap_or_default()
                        .to_f64()
                        .unwrap_or(0.0)
                })
            })
            .collect();

        // 3. Return grouped logically by space
        Ok(vec![json!({
            "spaceName": rn,
            "items": items
        })])
    }

    async fn get_student_responsibilities_paginated(
        &self,
        school_id: &str,
        student_id: &str,
        page: i32,
        limit: i32,
    ) -> Result<Value, AppError> {
        let offset = (page - 1) * limit;
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        // 1. Get student's class details
        let info_opt = sqlx::query(
            "SELECT class_name, section FROM students WHERE school_id = $1 AND student_id = $2",
        )
        .bind(school_id)
        .bind(student_id)
        .fetch_optional(&mut *conn)
        .await?;

        let rn = match info_opt {
            Some(row) => {
                let class_name = row
                    .get::<Option<String>, _>("class_name")
                    .unwrap_or_default();
                let section = row.get::<Option<String>, _>("section").unwrap_or_default();
                if class_name.is_empty() || section.is_empty() {
                    return Ok(json!({
                        "data": [],
                        "pagination": {
                            "page": page,
                            "limit": limit,
                            "total": 0,
                            "pages": 0
                        }
                    }));
                }
                format!("{}-{}", class_name, section)
            }
            None => return Ok(json!({
                "data": [],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": 0,
                    "pages": 0
                }
            })),
        };

        // 2. Get total count
        let total_query = "SELECT COUNT(DISTINCT r.responsibility_id) as total
            FROM responsibilities r
            JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id
            WHERE er.school_id = $1 AND er.space_ids @> to_jsonb($2::text)";
        
        let total_row = sqlx::query(total_query)
            .bind(school_id)
            .bind(&rn)
            .fetch_one(&mut *conn)
            .await?;
        let total: i64 = total_row.get::<i64, _>("total");

        // 3. Fetch paginated responsibilities
        let rows = sqlx::query(
            "SELECT DISTINCT r.responsibility_id, r.name, r.student_fee
             FROM responsibilities r
             JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id
             WHERE er.school_id = $1 AND er.space_ids @> to_jsonb($2::text)
             ORDER BY r.name
             LIMIT $3 OFFSET $4"
        )
        .bind(school_id)
        .bind(&rn)
        .bind(limit)
        .bind(offset)
        .fetch_all(&mut *conn)
        .await?;

        let items: Vec<Value> = rows
            .into_iter()
            .map(|row| {
                json!({
                    "responsibilityId": row.get::<String, _>("responsibility_id"),
                    "name": row.get::<String, _>("name"),
                    "studentFee": row.try_get::<bigdecimal::BigDecimal, _>("student_fee")
                        .unwrap_or_default()
                        .to_f64()
                        .unwrap_or(0.0)
                })
            })
            .collect();

        let pages = ((total as f64) / (limit as f64)).ceil() as i32;

        Ok(json!({
            "data": vec![json!({
                "spaceName": rn,
                "items": items
            })],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": pages
            }
        }))
    }

    async fn get_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query(
            "SELECT * FROM responsibilities WHERE school_id = $1 AND responsibility_id = $2",
        )
        .bind(school_id)
        .bind(responsibility_id)
        .fetch_optional(&mut *conn)
        .await?;

        if let Some(r) = row {
            Ok(Some(json!({
                "responsibilityId": r.get::<String, _>("responsibility_id"),
                "name": r.get::<String, _>("name"),
                "description": r.get::<Option<String>, _>("description"),
                "perDayPrice": r.get::<bigdecimal::BigDecimal, _>("per_day_price").to_f64().unwrap_or(0.0),
                "timePeriod": r.get::<i32, _>("time_period"),
                "employeeType": r.get::<Option<String>, _>("employee_type"),
                "monthlyPrice": r.get::<bigdecimal::BigDecimal, _>("monthly_price").to_f64().unwrap_or(0.0),
                "studentFee": r.get::<bigdecimal::BigDecimal, _>("student_fee").to_f64().unwrap_or(0.0),
                "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at")
            })))
        } else {
            Ok(None)
        }
    }

    async fn get_responsibility_by_name(
        &self,
        school_id: &str,
        name: &str,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query(
            "SELECT * FROM responsibilities WHERE school_id = $1 AND name = $2",
        )
        .bind(school_id)
        .bind(name)
        .fetch_optional(&mut *conn)
        .await?;

        if let Some(r) = row {
            Ok(Some(json!({
                "responsibilityId": r.get::<String, _>("responsibility_id"),
                "name": r.get::<String, _>("name"),
                "description": r.get::<Option<String>, _>("description"),
                "perDayPrice": r.get::<bigdecimal::BigDecimal, _>("per_day_price").to_f64().unwrap_or(0.0),
                "timePeriod": r.get::<i32, _>("time_period"),
                "employeeType": r.get::<Option<String>, _>("employee_type"),
                "monthlyPrice": r.get::<bigdecimal::BigDecimal, _>("monthly_price").to_f64().unwrap_or(0.0),
                "studentFee": r.get::<bigdecimal::BigDecimal, _>("student_fee").to_f64().unwrap_or(0.0),
                "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at")
            })))
        } else {
            Ok(None)
        }
    }

    async fn update_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        sqlx::query(
            "UPDATE responsibilities SET 
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                per_day_price = COALESCE($3, per_day_price),
                time_period = COALESCE($4, time_period),
                employee_type = COALESCE($5, employee_type),
                monthly_price = COALESCE($6, monthly_price),
                student_fee = COALESCE($7, student_fee)
             WHERE school_id = $8 AND responsibility_id = $9",
        )
        .bind(data["name"].as_str())
        .bind(data["description"].as_str())
        .bind(data["perDayPrice"].as_f64())
        .bind(data["timePeriod"].as_i64().map(|v| v as i32))
        .bind(data["employeeType"].as_str())
        .bind(data["monthlyPrice"].as_f64())
        .bind(data["studentFee"].as_f64())
        .bind(school_id)
        .bind(responsibility_id)
        .execute(&mut *conn)
        .await?;

        Ok(())
    }

    async fn delete_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM responsibilities WHERE school_id = $1 AND responsibility_id = $2")
            .bind(school_id)
            .bind(responsibility_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn get_employee_responsibilities(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT r.*, er.space_ids as assigned_space_ids 
             FROM responsibilities r 
             JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id 
             WHERE er.school_id = $1 AND er.employee_id = $2",
        )
        .bind(school_id)
        .bind(employee_id)
        .fetch_all(&mut *conn)
        .await?;

        Ok(rows.into_iter().map(|r| json!({
            "responsibilityId": r.get::<String, _>("responsibility_id"),
            "name": r.get::<String, _>("name"),
            "description": r.get::<Option<String>, _>("description"),
            "spaceId": r.get::<Option<String>, _>("space_id"), // Base spaceId for the role
            "assignedSpaceIds": r.get::<Option<Value>, _>("assigned_space_ids").unwrap_or_else(|| json!([])), // Specific spaces for this assignment
            "employeeType": r.get::<Option<String>, _>("employee_type"),
            "monthlyPrice": r.get::<bigdecimal::BigDecimal, _>("monthly_price").to_f64().unwrap_or(0.0),
            "perDayPrice": r.get::<bigdecimal::BigDecimal, _>("per_day_price").to_f64().unwrap_or(0.0),
            "studentFee": r.get::<bigdecimal::BigDecimal, _>("student_fee").to_f64().unwrap_or(0.0)
        })).collect())
    }

    async fn get_employee_responsibilities_paginated(
        &self,
        school_id: &str,
        employee_id: &str,
        page: i32,
        limit: i32,
    ) -> Result<Value, AppError> {
        let offset = (page - 1) * limit;
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        // Get total count
        let total_query = "SELECT COUNT(*) as total
            FROM employee_responsibilities er
            JOIN responsibilities r ON r.responsibility_id = er.responsibility_id
            WHERE er.school_id = $1 AND er.employee_id = $2";
        
        let total_row = sqlx::query(total_query)
            .bind(school_id)
            .bind(employee_id)
            .fetch_one(&mut *conn)
            .await?;
        let total: i64 = total_row.get::<i64, _>("total");

        // Get paginated data
        let rows = sqlx::query(
            "SELECT r.*, er.space_ids as assigned_space_ids
             FROM responsibilities r
             JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id
             WHERE er.school_id = $1 AND er.employee_id = $2
             ORDER BY r.name
             LIMIT $3 OFFSET $4"
        )
        .bind(school_id)
        .bind(employee_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&mut *conn)
        .await?;

        let data: Vec<Value> = rows.into_iter().map(|r| json!({
            "responsibilityId": r.get::<String, _>("responsibility_id"),
            "name": r.get::<String, _>("name"),
            "description": r.get::<Option<String>, _>("description"),
            "spaceId": r.get::<Option<String>, _>("space_id"), // Base spaceId for the role
            "assignedSpaceIds": r.get::<Option<Value>, _>("assigned_space_ids").unwrap_or_else(|| json!([])), // Specific spaces for this assignment
            "employeeType": r.get::<Option<String>, _>("employee_type"),
            "monthlyPrice": r.get::<bigdecimal::BigDecimal, _>("monthly_price").to_f64().unwrap_or(0.0),
            "perDayPrice": r.get::<bigdecimal::BigDecimal, _>("per_day_price").to_f64().unwrap_or(0.0),
            "studentFee": r.get::<bigdecimal::BigDecimal, _>("student_fee").to_f64().unwrap_or(0.0)
        })).collect();

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
}

#[cfg(test)]
mod responsibility_repository_tests {
    use super::*;
    use crate::db::DbClient;
    use crate::logic::cache_service::ResponsibilityCacheService;
    use sqlx::{Execute, Pool, Postgres};
    use std::sync::Arc;
    use mockall::predicate::*;
    use mockall::mock;

    // Mock DbClient for testing
    mock! {
        pub DbClient {
            pub async fn acquire_tenant_connection(&self, school_id: &str) -> Result<sqlx::pool::PoolConnection<sqlx::Postgres>, sqlx::Error>;
            pub fn pool(&self) -> &Pool<Postgres>;
            pub fn redis(&self) -> &deadpool_redis::Pool;
        }
    }

    #[test]
    fn test_query_builder_integration() {
        // Test that query builder creates correct SQL
        let mut query = query_builder::build_responsibility_query(
            "school123",
            Some("teacher"),
            Some("space456"),
            Some("math"),
            Some(10),
            Some(0),
        );
        
        let sql = query.build().sql();
        assert!(sql.contains("WHERE school_id = $1"));
        assert!(sql.contains("AND employee_type = $2"));
        assert!(sql.contains("AND space_id = $3"));
        assert!(sql.contains("AND name ILIKE $4"));
        assert!(sql.contains("LIMIT $5"));
        assert!(sql.contains("OFFSET $6"));
    }

    #[test]
    fn test_responsibility_cache_service_creation() {
        use crate::logic::cache_service::ResponsibilityCacheService;
        
        let redis_pool = deadpool_redis::Config::from_url("redis://localhost:6379")
            .create_pool(None)
            .expect("Failed to create Redis pool");
        
        let _service = ResponsibilityCacheService::new(redis_pool);
    }

    #[tokio::test]
    async fn test_cached_repository_wrapper() {
        use crate::logic::cache_service::CachedResponsibilityRepository;
        
        let test_client = DbClient::new_test().expect("Failed to create test DbClient");
        let redis_pool = deadpool_redis::Config::from_url("redis://localhost:6379")
            .create_pool(None)
            .expect("Failed to create Redis pool");
        let cache_service = Arc::new(ResponsibilityCacheService::new(redis_pool));
        
        let base_repo = PostgresResponsibilityRepository {
            client: Arc::new(test_client),
        };
        
        // Create cached repository
        let cached_repo = CachedResponsibilityRepository::new(
            Arc::new(base_repo),
            cache_service,
        );
        
        // Verify the repository implements the trait
        let _repo: &dyn ResponsibilityRepository = &cached_repo;
    }

    // Test helper functions for query builder
    #[test]
    fn test_query_builder_helpers() {
        // Test build_responsibility_query with various parameters
        let mut query1 = query_builder::build_responsibility_query(
            "school1",
            None,
            None,
            None,
            None,
            None,
        );
        assert!(query1.build().sql().contains("WHERE school_id = $1"));

        let mut query2 = query_builder::build_responsibility_query(
            "school2",
            Some("teacher"),
            Some("space1"),
            Some("search term"),
            Some(20),
            Some(10),
        );
        let sql2 = query2.build().sql();
        assert!(sql2.contains("AND employee_type = $2"));
        assert!(sql2.contains("AND space_id = $3"));
        assert!(sql2.contains("AND name ILIKE $4"));
        assert!(sql2.contains("LIMIT $5"));
        assert!(sql2.contains("OFFSET $6"));
    }

    #[test]
    fn test_employee_responsibility_query_builder() {
        let mut query = query_builder::build_employee_responsibility_query(
            "school123",
            Some("emp456"),
            Some("space789"),
        );
        
        let sql = query.build().sql();
        assert!(sql.contains("WHERE school_id = $1"));
        assert!(sql.contains("AND employee_id = $2"));
        assert!(sql.contains("AND responsibility_id = $3"));
    }
}
