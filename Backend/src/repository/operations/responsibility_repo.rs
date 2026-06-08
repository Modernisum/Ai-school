use crate::db::DbClient;
use crate::repository::traits::*;
use crate::repository::query_builder;
use async_trait::async_trait;
use bigdecimal::{ToPrimitive, FromPrimitive};
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
            let created_at_str = r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                .map(|d| d.to_rfc3339())
                .unwrap_or_else(|_| {
                    r.try_get::<chrono::NaiveDateTime, _>("created_at")
                        .map(|d| d.to_string())
                        .unwrap_or_default()
                });
            let updated_at_str = r.try_get::<chrono::DateTime<chrono::Utc>, _>("updated_at")
                .map(|d| d.to_rfc3339())
                .unwrap_or_else(|_| {
                    r.try_get::<chrono::NaiveDateTime, _>("updated_at")
                        .map(|d| d.to_string())
                        .unwrap_or_default()
                });
            json!({
                "responsibilityId": rid,
                "name": r.try_get::<String, _>("name").unwrap_or_default(),
                "description": r.try_get::<Option<String>, _>("description").ok().flatten(),
                "employeeType": r.try_get::<Option<String>, _>("employee_type").ok().flatten(),
                "spaceCategory": r.try_get::<Option<String>, _>("space_category").ok().flatten(),
                "spaceIds": r.try_get::<Vec<String>, _>("space_ids").unwrap_or_default(),
                "monthlyPrice": get_f64_from_row(&r, "monthly_price"),
                "perDayPrice": get_f64_from_row(&r, "per_day_price"),
                "studentFee": get_f64_from_row(&r, "student_fee"),
                "workLevel": r.try_get::<Option<String>, _>("work_level").ok().flatten(),
                "workPeriod": r.try_get::<Option<String>, _>("work_period").ok().flatten(),
                "workAmount": get_f64_from_row(&r, "work_amount"),
                "createdAt": created_at_str,
                "updatedAt": updated_at_str,
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

    async fn get_missing_responsibility_alerts(&self, school_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT sr.space_id, sr.responsibility_id, sr.requirement_type, r.name as responsibility_name, \
                    s.name as space_name, \
                    CASE WHEN er.employee_id IS NOT NULL THEN true ELSE false END as is_fulfilled \
             FROM space_requirements sr \
             JOIN responsibilities r ON sr.responsibility_id = r.responsibility_id AND sr.school_id = r.school_id \
             JOIN spaces s ON sr.space_id = s.space_id AND sr.school_id = s.school_id \
             LEFT JOIN employee_responsibilities er ON er.school_id = sr.school_id \
                 AND er.responsibility_id = sr.responsibility_id \
                 AND er.space_ids @> to_jsonb(sr.space_id::text) \
             WHERE sr.school_id = $1 AND sr.requirement_type = 'mandatory' \
             ORDER BY sr.space_id"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let mut alerts = Vec::new();
        for row in rows {
            let is_fulfilled: bool = row.get("is_fulfilled");
            if !is_fulfilled {
                alerts.push(json!({
                    "spaceId": row.get::<String, _>("space_id"),
                    "spaceName": row.get::<String, _>("space_name"),
                    "responsibilityId": row.get::<String, _>("responsibility_id"),
                    "responsibilityName": row.get::<String, _>("responsibility_name"),
                    "requirementType": row.get::<String, _>("requirement_type"),
                    "severity": "critical"
                }));
            }
        }
        Ok(alerts)
    }

    async fn search_responsibilities(&self, school_id: &str, pattern: &str, limit: i32, offset: i32) -> Result<(JsonList, i64), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM responsibilities WHERE school_id = $1 AND (name ILIKE $2 OR description ILIKE $2 OR employee_type ILIKE $2)"
        )
        .bind(school_id)
        .bind(pattern)
        .fetch_one(&mut *conn)
        .await?;

        let rows = sqlx::query(
            "SELECT responsibility_id, name, description, employee_type, monthly_price, student_fee, created_at \
             FROM responsibilities WHERE school_id = $1 AND (name ILIKE $2 OR description ILIKE $2 OR employee_type ILIKE $2) \
             ORDER BY created_at DESC LIMIT $3 OFFSET $4"
        )
        .bind(school_id)
        .bind(pattern)
        .bind(limit)
        .bind(offset)
        .fetch_all(&mut *conn)
        .await?;

        let data: Vec<Value> = rows.iter().map(|row| {
            json!({
                "responsibilityId": row.get::<String, _>("responsibility_id"),
                "name": row.get::<String, _>("name"),
                "description": row.get::<Option<String>, _>("description"),
                "employeeType": row.get::<Option<String>, _>("employee_type"),
                "monthlyPrice": row.get::<bigdecimal::BigDecimal, _>("monthly_price").to_string(),
                "studentFee": row.get::<bigdecimal::BigDecimal, _>("student_fee").to_string(),
                "createdAt": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at")
            })
        }).collect();

        Ok((data, total))
    }

    async fn get_space_responsibilities(
        &self,
        school_id: &str,
        space_id: &str,
    ) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT r.*, er.space_ids as assigned_space_ids, \
                    COALESCE(r.data->>'mandatory', 'false') = 'true' as is_mandatory \
             FROM responsibilities r \
             JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id \
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
                "studentFee": get_f64_from_row(row, "student_fee"),
                "monthlyPrice": get_f64_from_row(row, "monthly_price"),
                "perDayPrice": get_f64_from_row(row, "per_day_price"),
                "spaceCategory": row.get::<Option<String>, _>("space_category"),
                "isMandatory": row.get::<bool, _>("is_mandatory")
            })
        }).collect();

        Ok(items)
    }

    async fn get_overview_analytics(&self, school_id: &str, days: i32) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

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
        let row_rev = sqlx::query(
            "SELECT COALESCE(SUM(r.monthly_price), 0) as monthly_revenue FROM employee_responsibilities er \
             JOIN responsibilities r ON er.responsibility_id = r.responsibility_id AND er.school_id = r.school_id \
             WHERE er.school_id = $1"
        )
        .bind(school_id)
        .fetch_one(&mut *conn)
        .await?;
        let monthly_revenue = get_f64_from_row(&row_rev, "monthly_revenue");

        // Employee workload
        let employee_workload = sqlx::query(
            "SELECT COALESCE(e.data->>'name', 'Unnamed') AS name, COUNT(er.responsibility_id) as assignments \
             FROM employees e \
             LEFT JOIN employee_responsibilities er ON e.employee_id = er.employee_id \
             WHERE e.school_id = $1 \
             GROUP BY e.employee_id, e.data->>'name' \
             ORDER BY assignments DESC \
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
        let space_util = sqlx::query(
            "SELECT s.name, COUNT(er.responsibility_id) as value \
             FROM spaces s \
             LEFT JOIN responsibilities r ON r.space_ids @> to_jsonb(ARRAY[s.space_id::text]) \
             LEFT JOIN employee_responsibilities er ON er.responsibility_id = r.responsibility_id \
             WHERE s.school_id = $1 \
             GROUP BY s.space_id, s.name \
             ORDER BY value DESC \
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
            "SELECT er.created_at::date as trend_date, SUM(r.monthly_price) as revenue \
             FROM employee_responsibilities er \
             JOIN responsibilities r ON er.responsibility_id = r.responsibility_id AND er.school_id = r.school_id \
             WHERE er.school_id = $1 \
               AND er.created_at >= NOW() - INTERVAL '1 day' * $2 \
             GROUP BY er.created_at::date \
             ORDER BY trend_date ASC"
        )
        .bind(school_id)
        .bind(days)
        .fetch_all(&mut *conn)
        .await?;

        let trend_data: Vec<Value> = revenue_trend.iter().map(|row| {
            json!({
                "date": row.try_get::<chrono::NaiveDate, _>("trend_date").map(|d| d.to_string()).unwrap_or_default(),
                "revenue": get_f64_from_row(row, "revenue")
            })
        }).collect();

        // Top responsibilities by revenue
        let top_resp = sqlx::query(
            "SELECT r.name, COUNT(er.employee_id) as assignments, \
                    COUNT(DISTINCT unnest(r.space_ids)) as spaces, \
                    SUM(r.monthly_price) as revenue \
             FROM responsibilities r \
             LEFT JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id \
             WHERE r.school_id = $1 \
             GROUP BY r.responsibility_id, r.name \
             ORDER BY revenue DESC \
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
                "revenue": get_f64_from_row(row, "revenue")
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

    async fn export_responsibilities_csv(&self, school_id: &str) -> Result<String, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let rows = sqlx::query(
            "SELECT r.responsibility_id, r.name, r.description, r.employee_type, \
                    r.monthly_price, r.per_day_price, r.student_fee, \
                    r.space_category, r.work_level, r.work_period, r.work_amount, \
                    r.created_at \
             FROM responsibilities r \
             WHERE r.school_id = $1 \
             ORDER BY r.created_at DESC"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let mut csv = String::from("ID,Name,Description,Employee Type,Monthly Price,Per Day Price,Student Fee,Space Category,Work Level,Work Period,Work Amount,Created At\n");
        
        for row in rows {
            let created_at_str = row.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                .map(|d| d.to_rfc3339())
                .unwrap_or_else(|_| {
                    row.try_get::<chrono::NaiveDateTime, _>("created_at")
                        .map(|d| d.to_string())
                        .unwrap_or_default()
                });
            csv.push_str(&format!(
                "{},{},{},{},{},{},{},{},{},{},{},{}\n",
                row.get::<String, _>("responsibility_id"),
                row.get::<String, _>("name"),
                row.get::<Option<String>, _>("description").unwrap_or_default(),
                row.get::<Option<String>, _>("employee_type").unwrap_or_default(),
                get_f64_from_row(&row, "monthly_price"),
                get_f64_from_row(&row, "per_day_price"),
                get_f64_from_row(&row, "student_fee"),
                row.get::<Option<String>, _>("space_category").unwrap_or_default(),
                row.get::<Option<String>, _>("work_level").unwrap_or_default(),
                row.get::<Option<String>, _>("work_period").unwrap_or_default(),
                get_f64_from_row(&row, "work_amount"),
                created_at_str
            ));
        }
        
        Ok(csv)
    }

    async fn import_responsibilities_csv(
        &self,
        school_id: &str,
        admin_id: &str,
        csv_content: &str,
    ) -> Result<usize, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
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
            
            // Check duplicate
            let existing = self.get_responsibility_by_name(school_id, name).await?;
            if existing.is_some() {
                continue;
            }
            
            let responsibility_id = format!("resp_{}", uuid::Uuid::new_v4());
            
            let monthly_price = parts.get(4).and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0);
            let per_day_price = parts.get(5).and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0);
            let student_fee = parts.get(6).and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0);
            let work_amount = parts.get(10).and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0);

            sqlx::query(
                "INSERT INTO responsibilities (school_id, responsibility_id, name, description, employee_type, \
                 monthly_price, per_day_price, student_fee, space_category, work_level, work_period, work_amount, \
                 created_by, created_at, updated_at) \
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())"
            )
            .bind(school_id)
            .bind(&responsibility_id)
            .bind(name)
            .bind(parts.get(2).map(|s| s.trim()))
            .bind(parts.get(3).map(|s| s.trim()))
            .bind(bigdecimal::BigDecimal::from_f64(monthly_price).unwrap_or_default())
            .bind(bigdecimal::BigDecimal::from_f64(per_day_price).unwrap_or_default())
            .bind(bigdecimal::BigDecimal::from_f64(student_fee).unwrap_or_default())
            .bind(parts.get(7).map(|s| s.trim()))
            .bind(parts.get(8).map(|s| s.trim()))
            .bind(parts.get(9).map(|s| s.trim()))
            .bind(bigdecimal::BigDecimal::from_f64(work_amount).unwrap_or_default())
            .bind(admin_id)
            .execute(&mut *conn)
            .await?;
            
            count += 1;
        }

        Ok(count)
    }

    async fn sync_student_fees_for_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> Result<usize, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        let space_rows: Vec<(String,)> = sqlx::query_as(
            "SELECT DISTINCT jsonb_array_elements_text(er.space_ids) as space_id \
              FROM employee_responsibilities er \
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

        use sqlx::Connection;
        let mut tx = conn.begin().await?;
        let mut affected = 0usize;

        for space_id in &space_ids {
            let fee_sum: Option<bigdecimal::BigDecimal> = sqlx::query_scalar(
                "SELECT SUM(r.student_fee) FROM responsibilities r \
                  JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id \
                  WHERE er.school_id = $1 AND er.space_ids @> to_jsonb($2::text)"
            )
            .bind(school_id)
            .bind(space_id)
            .fetch_optional(&mut *tx)
            .await?;

            let new_fee = fee_sum.unwrap_or_else(|| bigdecimal::BigDecimal::from(0));

            let result = sqlx::query(
                "UPDATE students s \
                  SET total_fees = $1, updated_at = NOW() \
                  WHERE school_id = $2 \
                    AND EXISTS ( \
                        SELECT 1 \
                        FROM spaces sp \
                        WHERE sp.school_id = s.school_id \
                          AND (sp.name = $3 OR sp.space_id = $3) \
                          AND ( \
                              LOWER(sp.name) = LOWER(CASE WHEN s.section IS NULL OR s.section = '' THEN s.class_name ELSE CONCAT(s.class_name, '-', s.section) END) \
                              OR LOWER(sp.name) = LOWER(CONCAT('Class ', CASE WHEN s.section IS NULL OR s.section = '' THEN s.class_name ELSE CONCAT(s.class_name, '-', s.section) END)) \
                          ) \
                    )"
            )
            .bind(&new_fee)
            .bind(school_id)
            .bind(space_id)
            .execute(&mut *tx)
            .await?;

            affected += result.rows_affected() as usize;
        }

        tx.commit().await?;
        Ok(affected)
    }

    async fn recalculate_all_student_fees(&self, school_id: &str) -> Result<usize, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        let result = sqlx::query(
            "UPDATE students s \
             SET total_fees = COALESCE(( \
                 SELECT SUM(r.student_fee) \
                 FROM employee_responsibilities er \
                 JOIN responsibilities r ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id \
                 WHERE er.school_id = s.school_id \
                   AND EXISTS ( \
                       SELECT 1 \
                       FROM jsonb_array_elements_text(er.space_ids) AS assigned_space_id \
                       LEFT JOIN spaces sp ON sp.school_id = s.school_id AND (sp.name = assigned_space_id OR sp.space_id = assigned_space_id) \
                       WHERE \
                           LOWER(COALESCE(sp.name, assigned_space_id)) = LOWER(CASE WHEN s.section IS NULL OR s.section = '' THEN s.class_name ELSE CONCAT(s.class_name, '-', s.section) END) \
                           OR LOWER(COALESCE(sp.name, assigned_space_id)) = LOWER(CONCAT('Class ', CASE WHEN s.section IS NULL OR s.section = '' THEN s.class_name ELSE CONCAT(s.class_name, '-', s.section) END)) \
                           OR LOWER(COALESCE(sp.name, assigned_space_id)) = LOWER(CONCAT('class-', CASE WHEN s.section IS NULL OR s.section = '' THEN s.class_name ELSE CONCAT(s.class_name, '-', s.section) END)) \
                           OR LOWER(COALESCE(sp.name, assigned_space_id)) = LOWER(REPLACE(CASE WHEN s.section IS NULL OR s.section = '' THEN s.class_name ELSE CONCAT(s.class_name, '-', s.section) END, '-', '')) \
                   ) \
             ), 0.00), \
             updated_at = NOW() \
             WHERE s.school_id = $1"
        )
        .bind(school_id)
        .execute(&mut *conn)
        .await?;

        Ok(result.rows_affected() as usize)
    }

    async fn generate_salaries_from_responsibilities(
        &self,
        school_id: &str,
        month: i32,
        year: i32,
    ) -> Result<Value, AppError> {
        // We'll run DB queries to get employees list
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let emp_rows = sqlx::query(
            "SELECT employee_id, base_salary, bonus, aid, experience_years, experience_rate, tenure_months, tenure_rate, data \
             FROM employees WHERE school_id = $1"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let mut generated = 0usize;
        let mut failed = 0usize;
        let mut errors = Vec::new();

        let days_in_month = get_days_in_month(month, year);
        let days_in_month_bd = bigdecimal::BigDecimal::from(days_in_month);

        for r_row in emp_rows {
            let emp_id = r_row.get::<String, _>("employee_id");
            let data: Value = r_row.try_get::<Value, _>("data").unwrap_or(json!({}));

            // Get responsibilities for employee
            let resp_rows = sqlx::query(
                "SELECT r.monthly_price, er.space_ids as assigned_space_ids \
                 FROM employee_responsibilities er \
                 JOIN responsibilities r ON er.responsibility_id = r.responsibility_id AND er.school_id = r.school_id \
                 WHERE er.school_id = $1 AND er.employee_id = $2"
            )
            .bind(school_id)
            .bind(&emp_id)
            .fetch_all(&mut *conn)
            .await?;

            let mut spaces_component = bigdecimal::BigDecimal::from(0);
            for r in resp_rows {
                let monthly_price = r.get::<bigdecimal::BigDecimal, _>("monthly_price");
                let spaces_count = r.try_get::<Vec<String>, _>("assigned_space_ids")
                    .map(|arr| bigdecimal::BigDecimal::from(arr.len() as i64))
                    .unwrap_or_else(|_| bigdecimal::BigDecimal::from(1));
                spaces_component += &monthly_price * &spaces_count;
            }

            let base_salary = r_row.try_get::<bigdecimal::BigDecimal, _>("base_salary")
                .unwrap_or_else(|_| bigdecimal::BigDecimal::from(0));
            let bonus = r_row.try_get::<bigdecimal::BigDecimal, _>("bonus")
                .unwrap_or_else(|_| bigdecimal::BigDecimal::from(0));
            let aid = r_row.try_get::<bigdecimal::BigDecimal, _>("aid")
                .unwrap_or_else(|_| bigdecimal::BigDecimal::from(0));
            let exp_years = r_row.try_get::<bigdecimal::BigDecimal, _>("experience_years")
                .unwrap_or_else(|_| bigdecimal::BigDecimal::from(0));
            let exp_rate = r_row.try_get::<bigdecimal::BigDecimal, _>("experience_rate")
                .unwrap_or_else(|_| bigdecimal::BigDecimal::from(0));
            let tenure_months = r_row.try_get::<bigdecimal::BigDecimal, _>("tenure_months")
                .unwrap_or_else(|_| bigdecimal::BigDecimal::from(0));
            let tenure_rate = r_row.try_get::<bigdecimal::BigDecimal, _>("tenure_rate")
                .unwrap_or_else(|_| bigdecimal::BigDecimal::from(0));

            let exp_component = &exp_years * &exp_rate;
            let tenure_component = &tenure_months * &tenure_rate;
            let gross_salary = &spaces_component + &exp_component + &tenure_component + &bonus + &aid;

            // Get attendance absents
            let absent_row = sqlx::query(
                "SELECT COUNT(*) as absent_count FROM attendance \
                 WHERE school_id = $1 AND role = 'employee' AND user_id = $2 \
                   AND EXTRACT(MONTH FROM date) = $3 AND EXTRACT(YEAR FROM date) = $4 \
                   AND status = 'absent'"
            )
            .bind(school_id)
            .bind(&emp_id)
            .bind(month as f64)
            .bind(year as f64)
            .fetch_one(&mut *conn)
            .await?;
            let absent_days: i64 = absent_row.get("absent_count");
            let absent_days_bd = bigdecimal::BigDecimal::from(absent_days);

            let daily_rate = &gross_salary / &days_in_month_bd;
            let deductions = &absent_days_bd * &daily_rate;
            let mut net_salary = &gross_salary - &deductions;
            let zero = bigdecimal::BigDecimal::from(0);
            if net_salary < zero {
                net_salary = zero;
            }

            let salary_id = format!("sal_{}_{}", emp_id, uuid::Uuid::new_v4().to_string()[..8].to_string());

            let result = sqlx::query(
                "INSERT INTO salaries (salary_id, school_id, employee_id, month, year, \
                 base_salary, bonus, total_salary, due_amount, status, created_at, updated_at) \
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW()) \
                 ON CONFLICT (salary_id) DO UPDATE SET \
                 total_salary = EXCLUDED.total_salary, \
                 due_amount = EXCLUDED.due_amount, \
                 status = EXCLUDED.status, \
                 updated_at = NOW()"
            )
            .bind(&salary_id)
            .bind(school_id)
            .bind(&emp_id)
            .bind(month)
            .bind(year)
            .bind(&base_salary)
            .bind(&bonus)
            .bind(&net_salary)
            .bind(&net_salary)
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
            "generated": generated,
            "failed": failed,
            "errors": errors
        }))
    }

    async fn get_space_financial_overview(
        &self,
        school_id: &str,
        space_id: &str,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        // Total monthly salary cost for this space
        let total_salary_cost_row = sqlx::query(
            "SELECT COALESCE(SUM(r.monthly_price), 0) as cost FROM responsibilities r \
             JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id \
             WHERE er.school_id = $1 AND er.space_ids @> to_jsonb($2::text)"
        )
        .bind(school_id)
        .bind(space_id)
        .fetch_one(&mut *conn)
        .await?;
        let total_salary_cost = get_f64_from_row(&total_salary_cost_row, "cost");

        // Total student fees generated from this space
        let total_student_fees_row = sqlx::query(
            "SELECT COALESCE(SUM(r.student_fee), 0) as fees FROM responsibilities r \
             JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id \
             WHERE er.school_id = $1 AND er.space_ids @> to_jsonb($2::text)"
        )
        .bind(school_id)
        .bind(space_id)
        .fetch_one(&mut *conn)
        .await?;
        let total_student_fees = get_f64_from_row(&total_student_fees_row, "fees");

        // Count active employees assigned to this space
        let employee_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(DISTINCT er.employee_id) FROM employee_responsibilities er \
             WHERE er.school_id = $1 AND er.space_ids @> to_jsonb($2::text)"
        )
        .bind(school_id)
        .bind(space_id)
        .fetch_one(&mut *conn)
        .await?;

        // Count students in this space
        let student_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM students WHERE school_id = $1 AND CONCAT(COALESCE(class_name, ''), '-', COALESCE(section, '')) = $2 AND status = 'active'"
        )
        .bind(school_id)
        .bind(space_id)
        .fetch_one(&mut *conn)
        .await?;

        let net_revenue = total_student_fees - total_salary_cost;

        Ok(json!({
            "spaceId": space_id,
            "totalMonthlySalaryCost": total_salary_cost,
            "totalStudentFees": total_student_fees,
            "netRevenue": net_revenue,
            "employeeCount": employee_count,
            "studentCount": student_count
        }))
    }

    async fn bulk_create_employee_assignments(
        &self,
        school_id: &str,
        assignments: Vec<(String, String, Vec<String>)>,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        for (employee_id, responsibility_id, space_ids) in assignments {
            sqlx::query(
                "INSERT INTO employee_responsibilities
                 (school_id, employee_id, responsibility_id, space_ids, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, NOW(), NOW())"
            )
            .bind(school_id)
            .bind(&employee_id)
            .bind(&responsibility_id)
            .bind(&space_ids)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(())
    }

    async fn bulk_remove_employee_responsibilities(
        &self,
        school_id: &str,
        removals: Vec<(String, String)>,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        for (employee_id, responsibility_id) in removals {
            sqlx::query(
                "DELETE FROM employee_responsibilities
                 WHERE school_id = $1 AND employee_id = $2 AND responsibility_id = $3"
            )
            .bind(school_id)
            .bind(&employee_id)
            .bind(&responsibility_id)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(())
    }

    async fn get_assignment_history(
        &self,
        school_id: &str,
        responsibility_id: Option<&str>,
        employee_id: Option<&str>,
        limit: i64,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let mut query_str = "SELECT * FROM responsibility_assignment_history WHERE school_id = $1".to_string();
        let mut param_count = 1;
        
        if let Some(rid) = responsibility_id {
            query_str.push_str(&format!(" AND responsibility_id = ${}", param_count + 1));
            param_count += 1;
        }
        
        if let Some(eid) = employee_id {
            query_str.push_str(&format!(" AND employee_id = ${}", param_count + 1));
            param_count += 1;
        }
        
        query_str.push_str(&format!(" ORDER BY performed_at DESC LIMIT ${}", param_count + 1));
        
        let mut query = sqlx::query(&query_str).bind(school_id);
        if let Some(rid) = responsibility_id {
            query = query.bind(rid);
        }
        if let Some(eid) = employee_id {
            query = query.bind(eid);
        }
        query = query.bind(limit);
        
        let rows = query.fetch_all(&mut *conn).await?;
        
        let mut history = Vec::new();
        for row in rows {
            history.push(json!({
                "id": row.get::<i32, _>("id"),
                "schoolId": row.get::<String, _>("school_id"),
                "responsibilityId": row.get::<String, _>("responsibility_id"),
                "employeeId": row.get::<String, _>("employee_id"),
                "spaceIds": row.get::<Option<Vec<String>>, _>("space_ids").unwrap_or_default(),
                "action": row.get::<String, _>("action"),
                "previousSpaceIds": row.get::<Option<Vec<String>>, _>("previous_space_ids").unwrap_or_default(),
                "performedBy": row.get::<String, _>("performed_by"),
                "performedAt": row.get::<chrono::DateTime<chrono::Utc>, _>("performed_at").to_rfc3339(),
                "reason": row.get::<Option<String>, _>("reason"),
                "version": row.get::<i32, _>("version"),
                "metadata": row.get::<serde_json::Value, _>("metadata"),
            }));
        }
        
        Ok(history)
    }

    async fn get_responsibility_versions(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let rows = sqlx::query(
            "SELECT * FROM responsibility_version
             WHERE school_id = $1 AND responsibility_id = $2
             ORDER BY version DESC"
        )
        .bind(school_id)
        .bind(responsibility_id)
        .fetch_all(&mut *conn)
        .await?;
        
        let mut versions = Vec::new();
        for row in rows {
            versions.push(json!({
                "id": row.get::<i32, _>("id"),
                "schoolId": row.get::<String, _>("school_id"),
                "responsibilityId": row.get::<String, _>("responsibility_id"),
                "version": row.get::<i32, _>("version"),
                "name": row.get::<String, _>("name"),
                "description": row.get::<Option<String>, _>("description"),
                "employeeType": row.get::<Option<String>, _>("employee_type"),
                "revenue": row.get::<Option<f64>, _>("revenue"),
                "spaceIds": row.get::<Option<Vec<String>>, _>("space_ids").unwrap_or_default(),
                "createdBy": row.get::<String, _>("created_by"),
                "createdAt": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                "isCurrent": row.get::<bool, _>("is_current"),
                "metadata": row.get::<serde_json::Value, _>("metadata"),
            }));
        }
        
        Ok(versions)
    }

    async fn rollback_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
        version: i32,
        admin_id: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;
        
        // Get version to rollback to
        let version_row = sqlx::query(
            "SELECT * FROM responsibility_version
             WHERE school_id = $1 AND responsibility_id = $2 AND version = $3"
        )
        .bind(school_id)
        .bind(responsibility_id)
        .bind(version)
        .fetch_optional(&mut *tx)
        .await?;
        
        let version_data = version_row.ok_or_else(|| Box::new(crate::error::AppError::NotFound("Version not found".to_string())) as AppError)?;
        
        // Update responsibility with version data
        sqlx::query(
            "UPDATE responsibilities
             SET name = $1, description = $2, employee_type = $3, revenue = $4, space_ids = $5
             WHERE school_id = $6 AND responsibility_id = $7"
        )
        .bind(version_data.try_get::<String, _>("name").unwrap_or_else(|_| String::new()))
        .bind(version_data.try_get::<Option<String>, _>("description").unwrap_or(None))
        .bind(version_data.try_get::<Option<String>, _>("employee_type").unwrap_or(None))
        .bind(version_data.try_get::<Option<f64>, _>("revenue").unwrap_or(None))
        .bind(version_data.try_get::<Option<Vec<String>>, _>("space_ids").unwrap_or(None))
        .bind(school_id)
        .bind(responsibility_id)
        .execute(&mut *tx)
        .await?;
        
        // Create a new version entry for rollback
        let new_version: i32 = sqlx::query_scalar(
            "SELECT COALESCE(MAX(version), 0) + 1 FROM responsibility_version
             WHERE responsibility_id = $1"
        )
        .bind(responsibility_id)
        .fetch_one(&mut *tx)
        .await?;
        
        sqlx::query(
            "INSERT INTO responsibility_version
             (school_id, responsibility_id, version, name, description, employee_type, revenue, space_ids, created_by, is_current, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10)"
        )
        .bind(school_id)
        .bind(responsibility_id)
        .bind(new_version)
        .bind(version_data.try_get::<String, _>("name").unwrap_or_else(|_| String::new()))
        .bind(version_data.try_get::<Option<String>, _>("description").unwrap_or(None))
        .bind(version_data.try_get::<Option<String>, _>("employee_type").unwrap_or(None))
        .bind(version_data.try_get::<Option<f64>, _>("revenue").unwrap_or(None))
        .bind(version_data.try_get::<Option<Vec<String>>, _>("space_ids").unwrap_or(None))
        .bind(admin_id)
        .bind(json!({"rollbackFrom": version}))
        .execute(&mut *tx)
        .await?;
        
        tx.commit().await?;
        Ok(())
    }

    async fn create_responsibility_version(
        &self,
        school_id: &str,
        responsibility_id: &str,
        admin_id: &str,
    ) -> Result<i32, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;
        
        // Get current responsibility data
        let resp_row = sqlx::query(
            "SELECT * FROM responsibilities
             WHERE school_id = $1 AND responsibility_id = $2"
        )
        .bind(school_id)
        .bind(responsibility_id)
        .fetch_optional(&mut *tx)
        .await?;
        
        let resp_data = resp_row.ok_or_else(|| Box::new(crate::error::AppError::NotFound("Responsibility not found".to_string())) as AppError)?;
        
        // Get next version number
        let version: i32 = sqlx::query_scalar(
            "SELECT COALESCE(MAX(version), 0) + 1 FROM responsibility_version
             WHERE responsibility_id = $1"
        )
        .bind(responsibility_id)
        .fetch_one(&mut *tx)
        .await?;
        
        // Insert new version
        sqlx::query(
            "INSERT INTO responsibility_version
             (school_id, responsibility_id, version, name, description, employee_type, revenue, space_ids, created_by, is_current, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10)"
        )
        .bind(school_id)
        .bind(responsibility_id)
        .bind(version)
        .bind(resp_data.try_get::<String, _>("name").unwrap_or_else(|_| String::new()))
        .bind(resp_data.try_get::<Option<String>, _>("description").unwrap_or(None))
        .bind(resp_data.try_get::<Option<String>, _>("employee_type").unwrap_or(None))
        .bind(resp_data.try_get::<Option<f64>, _>("revenue").unwrap_or(None))
        .bind(resp_data.try_get::<Option<Vec<String>>, _>("space_ids").unwrap_or(None))
        .bind(admin_id)
        .bind(json!({}))
        .execute(&mut *tx)
        .await?;
        
        tx.commit().await?;
        Ok(version)
    }

    async fn get_responsibility_utilization_metrics(
        &self,
        school_id: &str,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let has_date_range = start_date.is_some() && end_date.is_some();
        
        let total_responsibilities: i64 = {
            let mut q = "SELECT COUNT(*) FROM responsibilities WHERE school_id = $1".to_string();
            if has_date_range {
                q.push_str(" AND created_at BETWEEN $2 AND $3");
            }
            let mut query = sqlx::query_scalar::<_, i64>(&q).bind(school_id);
            if let (Some(start), Some(end)) = (start_date, end_date) {
                query = query.bind(start).bind(end);
            }
            query.fetch_one(&mut *conn).await?
        };
        
        let assigned_responsibilities: i64 = {
            let mut q = "SELECT COUNT(DISTINCT er.responsibility_id) FROM employee_responsibilities er
                         JOIN responsibilities r ON er.responsibility_id = r.responsibility_id
                         WHERE r.school_id = $1".to_string();
            if has_date_range {
                q.push_str(" AND er.created_at BETWEEN $2 AND $3");
            }
            let mut query = sqlx::query_scalar::<_, i64>(&q).bind(school_id);
            if let (Some(start), Some(end)) = (start_date, end_date) {
                query = query.bind(start).bind(end);
            }
            query.fetch_one(&mut *conn).await?
        };
        
        let utilization_rate = if total_responsibilities > 0 {
            (assigned_responsibilities as f64 / total_responsibilities as f64) * 100.0
        } else {
            0.0
        };
        
        Ok(json!({
            "totalResponsibilities": total_responsibilities,
            "assignedResponsibilities": assigned_responsibilities,
            "unassignedResponsibilities": total_responsibilities - assigned_responsibilities,
            "utilizationRate": utilization_rate,
            "startDate": start_date,
            "endDate": end_date
        }))
    }

    async fn get_employee_workload_metrics(
        &self,
        school_id: &str,
        employee_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let mut query_str = "SELECT e.employee_id, e.name, COUNT(DISTINCT er.responsibility_id) as responsibility_count, \
                        COUNT(DISTINCT er.space_ids) as space_count \
                        FROM employees e \
                        LEFT JOIN employee_responsibilities er ON e.employee_id = er.employee_id \
                        WHERE e.school_id = $1".to_string();
        
        let mut param_count = 1;
        if let Some(eid) = employee_id {
            query_str.push_str(&format!(" AND e.employee_id = ${}", param_count + 1));
            param_count += 1;
        }
        
        query_str.push_str(" GROUP BY e.employee_id, e.name ORDER BY responsibility_count DESC");
        
        let mut query = sqlx::query(&query_str).bind(school_id);
        if let Some(eid) = employee_id {
            query = query.bind(eid);
        }
        
        let rows = query.fetch_all(&mut *conn).await?;
        
        let mut employees = Vec::new();
        for row in rows {
            employees.push(json!({
                "employeeId": row.get::<String, _>("employee_id"),
                "name": row.get::<String, _>("name"),
                "responsibilityCount": row.get::<i64, _>("responsibility_count"),
                "spaceCount": row.get::<i64, _>("space_count")
            }));
        }
        
        Ok(json!({
            "employees": employees,
            "totalEmployees": employees.len(),
            "startDate": start_date,
            "endDate": end_date
        }))
    }

    async fn get_space_distribution_metrics(
        &self,
        school_id: &str,
        space_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let mut query_str = "SELECT s.space_id, s.name, COUNT(DISTINCT er.employee_id) as employee_count, \
                        COUNT(DISTINCT er.responsibility_id) as responsibility_count \
                        FROM spaces s \
                        LEFT JOIN employee_responsibilities er ON s.space_id = ANY(er.space_ids) \
                        WHERE s.school_id = $1".to_string();
        
        let mut param_count = 1;
        if let Some(sid) = space_id {
            query_str.push_str(&format!(" AND s.space_id = ${}", param_count + 1));
            param_count += 1;
        }
        
        query_str.push_str(" GROUP BY s.space_id, s.name ORDER BY employee_count DESC");
        
        let mut query = sqlx::query(&query_str).bind(school_id);
        if let Some(sid) = space_id {
            query = query.bind(sid);
        }
        
        let rows = query.fetch_all(&mut *conn).await?;
        
        let mut spaces = Vec::new();
        for row in rows {
            spaces.push(json!({
                "spaceId": row.get::<String, _>("space_id"),
                "name": row.get::<String, _>("name"),
                "employeeCount": row.get::<i64, _>("employee_count"),
                "responsibilityCount": row.get::<i64, _>("responsibility_count")
            }));
        }
        
        Ok(json!({
            "spaces": spaces,
            "totalSpaces": spaces.len(),
            "startDate": start_date,
            "endDate": end_date
        }))
    }

    async fn get_revenue_metrics(
        &self,
        school_id: &str,
        responsibility_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let mut query_str = "SELECT r.responsibility_id, r.name, r.monthly_price, \
                        COUNT(DISTINCT er.employee_id) as assigned_count, \
                        r.monthly_price * COUNT(DISTINCT er.employee_id) as total_revenue \
                        FROM responsibilities r \
                        LEFT JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id \
                        WHERE r.school_id = $1".to_string();
        
        let mut param_count = 1;
        if let Some(rid) = responsibility_id {
            query_str.push_str(&format!(" AND r.responsibility_id = ${}", param_count + 1));
            param_count += 1;
        }
        
        query_str.push_str(" GROUP BY r.responsibility_id, r.name, r.monthly_price ORDER BY total_revenue DESC");
        
        let mut query = sqlx::query(&query_str).bind(school_id);
        if let Some(rid) = responsibility_id {
            query = query.bind(rid);
        }
        
        let rows = query.fetch_all(&mut *conn).await?;
        
        let mut responsibilities = Vec::new();
        let mut total_revenue = 0.0;
        
        for row in rows {
            let revenue: f64 = row.get::<f64, _>("total_revenue");
            total_revenue += revenue;
            responsibilities.push(json!({
                "responsibilityId": row.get::<String, _>("responsibility_id"),
                "name": row.get::<String, _>("name"),
                "monthlyPrice": row.get::<f64, _>("monthly_price"),
                "assignedCount": row.get::<i64, _>("assigned_count"),
                "totalRevenue": revenue
            }));
        }
        
        Ok(json!({
            "responsibilities": responsibilities,
            "totalRevenue": total_revenue,
            "startDate": start_date,
            "endDate": end_date
        }))
    }
}

// Helpers at the module level
fn get_f64_from_row(row: &sqlx::postgres::PgRow, col: &str) -> f64 {
    if let Ok(bd) = row.try_get::<bigdecimal::BigDecimal, _>(col) {
        use bigdecimal::ToPrimitive;
        bd.to_f64().unwrap_or(0.0)
    } else if let Ok(f) = row.try_get::<f64, _>(col) {
        f
    } else {
        0.0
    }
}

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
