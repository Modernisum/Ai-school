use crate::error::{AppError, AppResult};
use crate::repository::Repositories;
use serde_json::{json, Value};
use sqlx::Row;
use std::collections::HashMap;
use std::sync::Arc;

pub struct MaterialMonitor {
    pub repos: Arc<Repositories>,
}

impl MaterialMonitor {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn check_space_shortages(&self, school_id: &str) -> AppResult<Vec<Value>> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;

        let rows = sqlx::query(
            r#"
            SELECT
                req.space_name,
                req.material_name,
                req.required_count,
                COALESCE(sm.quantity, 0) as available_count
            FROM space_material_requirements req
            LEFT JOIN space_materials sm
                ON sm.school_id = req.school_id
                AND sm.space_name = req.space_name
                AND sm.material_name = req.material_name
            WHERE req.school_id = $1
              AND req.required_count > 0
              AND COALESCE(sm.quantity, 0) < req.required_count
            ORDER BY req.space_name, req.material_name
            "#,
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        Ok(rows.into_iter().map(|row| {
            let required_count: i32 = row.get("required_count");
            let available_count: i32 = row.get("available_count");
            let space_name: String = row.get("space_name");
            let material_name: String = row.get("material_name");
            json!({
                "spaceName": space_name,
                "materialName": material_name,
                "requiredCount": required_count,
                "availableCount": available_count,
                "deficit": required_count - available_count,
            })
        }).collect())
    }

    pub async fn check_and_alert_all_schools(&self) {
        let school_ids: Vec<String> = match sqlx::query_scalar("SELECT DISTINCT school_id FROM space_material_requirements")
            .fetch_all(&self.repos.db_client.pool)
            .await
        {
            Ok(ids) => ids,
            Err(_) => return,
        };

        for school_id in &school_ids {
            if let Err(e) = self.check_and_alert_school(school_id).await {
                tracing::warn!("Material monitor failed for {}: {}", school_id, e);
            }
        }
    }

    pub async fn check_and_alert_school(&self, school_id: &str) -> AppResult<Vec<Value>> {
        let deficits = self.check_space_shortages(school_id).await?;

        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;

        let mut alerts_created = Vec::new();

        for d in &deficits {
            let space_name = d["spaceName"].as_str().unwrap();
            let material_name = d["materialName"].as_str().unwrap();
            let deficit = d["deficit"].as_i64().unwrap_or(0) as i32;

            let existing: Option<(i64,)> = sqlx::query_as(
                "SELECT id FROM material_alert_log WHERE school_id = $1 AND space_name = $2 AND material_name = $3 AND status = 'active'"
            )
            .bind(school_id)
            .bind(space_name)
            .bind(material_name)
            .fetch_optional(&mut *conn)
            .await?;

            if existing.is_none() {
                sqlx::query(
                    "INSERT INTO material_alert_log (school_id, space_name, material_name, deficit_count, status)
                     VALUES ($1, $2, $3, $4, 'active')"
                )
                .bind(school_id)
                .bind(space_name)
                .bind(material_name)
                .bind(deficit)
                .execute(&mut *conn)
                .await?;

                self.repos.task.add_task(
                    school_id,
                    json!({
                        "title": format!("Material Shortage: {}", material_name),
                        "description": format!("{} is short by {} unit(s) in {}", material_name, deficit, space_name),
                        "status": "pending",
                        "priority": "High",
                        "task_name": format!("Restock {} in {}", material_name, space_name),
                        "category": "material_shortage",
                    }),
                ).await.ok();

                alerts_created.push(json!({
                    "spaceName": space_name,
                    "materialName": material_name,
                    "deficit": deficit,
                    "taskCreated": true,
                }));
            }
        }

        let active_alert_spaces: Vec<(String,)> = sqlx::query_as(
            "SELECT DISTINCT space_name FROM material_alert_log WHERE school_id = $1 AND status = 'active'"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        for (space_name,) in &active_alert_spaces {
            let space_deficits: Vec<&Value> = deficits.iter()
                .filter(|d| d["spaceName"].as_str() == Some(space_name))
                .collect();

            if !space_deficits.is_empty() {
                let deficit_count = space_deficits.len();
                let material_list: Vec<&str> = space_deficits.iter()
                    .filter_map(|d| d["materialName"].as_str())
                    .collect();

                let title = format!("Material Shortages in {}", space_name);
                let message = format!("{} material(s) short in {} ({})", deficit_count, space_name, material_list.join(", "));

                self.repos.notification.create(
                    school_id,
                    None,
                    "MATERIAL_SHORTAGE",
                    if deficit_count > 2 { "critical" } else { "warning" },
                    &title,
                    &message,
                    json!({
                        "spaceName": space_name,
                        "deficitCount": deficit_count,
                        "deficits": space_deficits,
                    }),
                ).await.ok();
            }
        }

        let all_deficit_keys: std::collections::HashSet<(String, String)> = deficits.iter()
            .map(|d| (d["spaceName"].as_str().unwrap_or("").to_string(), d["materialName"].as_str().unwrap_or("").to_string()))
            .collect();

        let active_alerts: Vec<(String, String)> = sqlx::query_as(
            "SELECT space_name, material_name FROM material_alert_log WHERE school_id = $1 AND status = 'active'"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        for (space_name, material_name) in &active_alerts {
            if !all_deficit_keys.contains(&(space_name.clone(), material_name.clone())) {
                sqlx::query(
                    "UPDATE material_alert_log SET status = 'resolved', resolved_at = NOW()
                     WHERE school_id = $1 AND space_name = $2 AND material_name = $3 AND status = 'active'"
                )
                .bind(school_id)
                .bind(space_name)
                .bind(material_name)
                .execute(&mut *conn)
                .await?;
            }
        }

        Ok(alerts_created)
    }

    pub async fn get_shortage_summary(&self, school_id: &str) -> AppResult<Value> {
        let deficits = self.check_space_shortages(school_id).await?;

        if deficits.is_empty() {
            let active_alert_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM material_alert_log WHERE school_id = $1 AND status = 'active'"
            )
            .bind(school_id)
            .fetch_one(&self.repos.db_client.pool)
            .await?;

            return Ok(json!({
                "success": true,
                "data": {
                    "totalDeficitCount": 0,
                    "totalCostToFulfill": 0.0,
                    "activeAlertCount": active_alert_count,
                    "perSpace": [],
                }
            }));
        }

        let material_names: Vec<&str> = deficits.iter()
            .filter_map(|d| d["materialName"].as_str())
            .collect();

        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        let price_rows = sqlx::query(
            "SELECT name, unit_price FROM materials WHERE school_id = $1 AND name = ANY($2)"
        )
        .bind(school_id)
        .bind(&material_names)
        .fetch_all(&mut *conn)
        .await?;

        let mut price_map: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
        for row in &price_rows {
            let name: String = row.get("name");
            let price: f64 = row.get("unit_price");
            price_map.insert(name, price);
        }

        let mut per_space: std::collections::BTreeMap<String, Vec<Value>> = std::collections::BTreeMap::new();
        for d in &deficits {
            let space_name = d["spaceName"].as_str().unwrap().to_string();
            per_space.entry(space_name).or_default().push(d.clone());
        }

        let mut total_deficit_value = 0.0_f64;
        let mut per_space_result = Vec::new();

        for (space_name, space_deficits) in &per_space {
            let mut space_value = 0.0_f64;
            let mut items = Vec::new();

            for d in space_deficits {
                let material_name = d["materialName"].as_str().unwrap();
                let deficit = d["deficit"].as_f64().unwrap_or(0.0);
                let price = price_map.get(material_name).copied().unwrap_or(0.0);
                let cost = price * deficit;
                space_value += cost;

                items.push(json!({
                    "materialName": material_name,
                    "deficit": d["deficit"],
                    "unitPrice": price,
                    "costToFulfill": cost,
                }));
            }

            total_deficit_value += space_value;
            per_space_result.push(json!({
                "spaceName": space_name,
                "deficitCount": space_deficits.len(),
                "items": items,
                "totalCostToFulfill": space_value,
            }));
        }

        let active_alert_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM material_alert_log WHERE school_id = $1 AND status = 'active'"
        )
        .bind(school_id)
        .fetch_one(&self.repos.db_client.pool)
        .await?;

        Ok(json!({
            "success": true,
            "data": {
                "totalDeficitCount": deficits.len(),
                "totalCostToFulfill": total_deficit_value,
                "activeAlertCount": active_alert_count,
                "perSpace": per_space_result,
            }
        }))
    }
}
