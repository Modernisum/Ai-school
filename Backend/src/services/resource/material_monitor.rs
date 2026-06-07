use crate::error::{AppError, AppResult};
use crate::repository::Repositories;
use serde_json::{json, Value};
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
        let shortages = self.repos.resource.check_space_shortages(school_id).await?;
        Ok(shortages)
    }

    pub async fn check_and_alert_all_schools(&self) {
        let school_ids = match self.repos.resource.get_distinct_school_ids_with_material_requirements().await {
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
        let mut alerts_created = Vec::new();

        for d in &deficits {
            let space_name = d["spaceName"].as_str().unwrap();
            let material_name = d["materialName"].as_str().unwrap();
            let deficit = d["deficit"].as_i64().unwrap_or(0) as i32;

            let existing = self.repos.resource.check_existing_active_alert(school_id, space_name, material_name).await?;

            if existing.is_none() {
                self.repos.resource.insert_material_alert(school_id, space_name, material_name, deficit).await?;

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

        let active_alert_spaces = self.repos.resource.get_active_alert_spaces(school_id).await?;

        for space_name in &active_alert_spaces {
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

        let active_alerts = self.repos.resource.get_active_alerts(school_id).await?;

        for (space_name, material_name) in &active_alerts {
            if !all_deficit_keys.contains(&(space_name.clone(), material_name.clone())) {
                self.repos.resource.resolve_active_alert(school_id, space_name, material_name).await?;
            }
        }

        Ok(alerts_created)
    }

    pub async fn get_shortage_summary(&self, school_id: &str) -> AppResult<Value> {
        let deficits = self.check_space_shortages(school_id).await?;

        if deficits.is_empty() {
            let active_alert_count = self.repos.resource.get_active_alerts_count(school_id).await?;

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

        let material_names: Vec<String> = deficits.iter()
            .filter_map(|d| d["materialName"].as_str().map(|s| s.to_string()))
            .collect();

        let price_map = self.repos.resource.get_material_unit_prices(school_id, &material_names).await?;

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

        let active_alert_count = self.repos.resource.get_active_alerts_count(school_id).await?;

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
