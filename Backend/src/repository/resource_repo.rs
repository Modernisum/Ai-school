use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresResourceRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl ResourceRepository for PostgresResourceRepository {
    async fn add_space(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let space_id = format!("{}-{}", school_id, data["id"].as_str().unwrap_or(""));
        sqlx::query(
            "INSERT INTO spaces (space_id, school_id, space_name, space_category) VALUES ($1, $2, $3, $4) ON CONFLICT (school_id, space_id) DO NOTHING",
        )
        .bind(&space_id)
        .bind(school_id)
        .bind(data["name"].as_str())
        .bind(data["id"].as_str())
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    async fn add_item(
        &self,
        school_id: &str,
        space_id: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let item_id = format!(
            "{}-{}-{}",
            school_id,
            space_id,
            data["id"].as_str().unwrap_or("")
        );
        sqlx::query("INSERT INTO items (item_id, school_id, space_id, item_name, room_number, class_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (school_id, space_id, item_id) DO NOTHING")
            .bind(&item_id)
            .bind(school_id)
            .bind(space_id)
            .bind(data["itemName"].as_str())
            .bind(data["roomNumber"].as_str())
            .bind(data["classId"].as_str())
            .execute(&mut *conn).await?;
        Ok(())
    }

    async fn add_material(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let material_id = data["materialName"].as_str().map(|s| s.to_lowercase()).unwrap_or_else(|| "unknown".to_string());
        sqlx::query("INSERT INTO materials (id, school_id, name, quantity, unit_price, attachment_path) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (school_id, id) DO UPDATE SET quantity = materials.quantity + EXCLUDED.quantity, attachment_path = EXCLUDED.attachment_path")
            .bind(&material_id)
            .bind(school_id)
            .bind(data["materialName"].as_str())
            .bind(data["quantity"].as_i64())
            .bind(data["unitPrice"].as_f64())
            .bind(data["attachmentPath"].as_str())
            .execute(&mut *conn).await?;
        
        let mut ret = data.clone();
        ret["id"] = json!(material_id);
        Ok(ret)
    }

    async fn get_material(
        &self,
        school_id: &str,
        material_id: &str,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM materials WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(material_id)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(
            row.map(
                |r| json!({"id": r.get::<String, _>("id"), "name": r.get::<String, _>("name")}),
            ),
        )
    }

    async fn update_material(
        &self,
        school_id: &str,
        material_id: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("UPDATE materials SET quantity = COALESCE($1, quantity) WHERE school_id = $2 AND id = $3")
            .bind(data["quantity"].as_i64())
            .bind(school_id).bind(material_id).execute(&mut *conn).await?;
        Ok(())
    }

    async fn add_material_location(
        &self,
        school_id: &str,
        material_id: &str,
        space_id: &str,
        item_id: &str,
        quantity: i32,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO material_locations (school_id, material_id, space_id, item_id, quantity) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (school_id, material_id, space_id, item_id) DO UPDATE SET quantity = material_locations.quantity + EXCLUDED.quantity")
            .bind(school_id).bind(material_id).bind(space_id).bind(item_id).bind(quantity).execute(&mut *conn).await?;
        Ok(())
    }

    async fn add_material_history(
        &self,
        school_id: &str,
        material_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO audit_logs (school_id, target_type, target_id, action, data) VALUES ($1, $2, $3, $4, $5)")
            .bind(school_id).bind("material").bind(material_id).bind(action).bind(data).execute(&mut *conn).await?;
        Ok(())
    }

    async fn add_announcement(
        &self,
        school_id: &str,
        target_type: &str,
        user_id: &str,
        data: Value,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO announcements (school_id, target_type, user_id, title, content) VALUES ($1, $2, $3, $4, $5)")
            .bind(school_id)
            .bind(target_type)
            .bind(user_id)
            .bind(data["title"].as_str())
            .bind(data["content"].as_str())
            .execute(&mut *conn).await?;
        Ok(data)
    }

    async fn get_announcements(
        &self,
        school_id: &str,
        target_type: &str,
        user_id: &str,
    ) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT * FROM announcements WHERE school_id = $1 AND target_type = $2 AND (user_id = $3 OR user_id IS NULL)")
            .bind(school_id)
            .bind(target_type)
            .bind(user_id)
            .fetch_all(&mut *conn)
            .await?;
        Ok(rows.into_iter().map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title"), "content": r.get::<String, _>("content")})).collect())
    }

    async fn get_announcement(&self, school_id: &str, announcement_id: i32) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM announcements WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(announcement_id)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(row.map(|r| json!({
            "id": r.get::<i32, _>("id"),
            "title": r.get::<String, _>("title"),
            "content": r.get::<String, _>("content"),
            "targetType": r.get::<String, _>("target_type"),
            "userId": r.get::<Option<String>, _>("user_id")
        })))
    }

    async fn add_event_summary(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let res = sqlx::query("INSERT INTO events (school_id, title, description, start_time, end_time) VALUES ($1, $2, $3, $4, $5) RETURNING id")
            .bind(school_id)
            .bind(data["title"].as_str())
            .bind(data["description"].as_str())
            .bind(chrono::NaiveDateTime::parse_from_str(data["startTime"].as_str().unwrap_or(""), "%Y-%m-%d %H:%M:%S").unwrap_or_else(|_| chrono::Utc::now().naive_utc()))
            .bind(data["endTime"].as_str().map(|t| chrono::NaiveDateTime::parse_from_str(t, "%Y-%m-%d %H:%M:%S").unwrap_or_else(|_| chrono::Utc::now().naive_utc())))
            .fetch_one(&mut *conn)
            .await?;
        
        let mut ret = data.clone();
        ret["id"] = json!(res.get::<i32, _>("id"));
        Ok(ret)
    }

    async fn get_event(&self, school_id: &str, event_id: i32) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM events WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(event_id)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(row.map(|r| json!({
            "id": r.get::<i32, _>("id"),
            "title": r.get::<String, _>("title"),
            "description": r.get::<Option<String>, _>("description"),
            "startTime": r.get::<chrono::NaiveDateTime, _>("start_time").to_string(),
            "endTime": r.get::<Option<chrono::NaiveDateTime>, _>("end_time").map(|t| t.to_string())
        })))
    }
    async fn get_materials(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT id, name, quantity, unit_price::FLOAT as unit_price, extra_unit, need_unit FROM materials WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;
        Ok(rows
            .into_iter()
            .map(|r| {
                json!({
                    "id": r.get::<String, _>("id"),
                    "materialName": r.get::<String, _>("name"),
                    "quantity": r.get::<i32, _>("quantity"),
                    "unitPrice": r.get::<Option<f64>, _>("unit_price"),
                    "extraUnit": r.get::<i32, _>("extra_unit"),
                    "needUnit": r.get::<i32, _>("need_unit")
                })
            })
            .collect())
    }

    async fn delete_announcement(&self, school_id: &str, announcement_id: i32) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM announcements WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(announcement_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn delete_material(&self, school_id: &str, material_id: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM materials WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(material_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn delete_event(&self, school_id: &str, event_id: i32) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM events WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(event_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }
    async fn get_spaces(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        // 1. Fetch all spaces
        let space_rows = sqlx::query("SELECT * FROM spaces WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;

        // 2. Fetch all items for this school to nest them
        let item_rows = sqlx::query("SELECT * FROM items WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;

        // 3. Group items by space_id
        let mut items_map: std::collections::HashMap<String, Vec<Value>> =
            std::collections::HashMap::new();
        for r in item_rows {
            let space_id = r.try_get::<String, _>("space_id").unwrap_or_default();
            let item_id = r.try_get::<String, _>("item_id").unwrap_or_default();
            let item_name = r.try_get::<String, _>("item_name").unwrap_or_default();
            let item = json!({
                "id": item_id,
                "name": item_name,
                "itemName": item_name,
                "roomNumber": r.try_get::<Option<String>, _>("room_number").ok().flatten(),
                "classId": r.try_get::<Option<String>, _>("class_id").ok().flatten(),
            });
            items_map.entry(space_id).or_default().push(item);
        }

        // 4. Construct final JSON
        Ok(space_rows
            .into_iter()
            .map(|r| {
                let space_id = r.try_get::<String, _>("space_id").unwrap_or_default();
                let name = r.try_get::<String, _>("space_name").unwrap_or_default();
                let category = r.try_get::<String, _>("space_category").ok();
                let capacity = r.try_get::<i32, _>("capacity").ok();
                let items = items_map.get(&space_id).cloned().unwrap_or_default();
                json!({
                    "id": space_id,
                    "spaceId": space_id,
                    "name": name,
                    "spaceName": name,
                    "spaceCategory": category,
                    "capacity": capacity,
                    "items": items,
                    "inventory": items,
                })
            })
            .collect())
    }

    async fn create_space(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let space_id = format!("SP{:03}", chrono::Utc::now().timestamp_millis() % 1000);
        let space_name = data["spaceName"].as_str().unwrap_or("Unnamed Space");
        let category = data["spaceCategory"].as_str().unwrap_or("classroom");
        let capacity = data["capacity"].as_i64().unwrap_or(0);
        let space_number = data["spaceNumber"].as_str();

        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "INSERT INTO spaces (space_id, school_id, space_name, space_category, space_number, capacity, data)
             VALUES ($1, $2, $3, $4, $5, $6, $7)"
        )
        .bind(&space_id)
        .bind(school_id)
        .bind(space_name)
        .bind(category)
        .bind(space_number)
        .bind(capacity as i32)
        .bind(&data)
        .execute(&mut *conn)
        .await?;

        // Return constructed object
        let mut ret = data.clone();
        if let Some(obj) = ret.as_object_mut() {
            obj.insert("spaceId".to_string(), json!(space_id));
        }
        Ok(ret)
    }

    async fn update_space(
        &self,
        school_id: &str,
        space_id: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let name = data["spaceName"].as_str();
        let category = data["spaceCategory"].as_str();
        let capacity = data["capacity"].as_i64();
        let space_number = data["spaceNumber"].as_str();

        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "UPDATE spaces SET 
                space_name = COALESCE($1, space_name),
                space_category = COALESCE($2, space_category),
                space_number = COALESCE($3, space_number),
                capacity = COALESCE($4, capacity),
                data = data || $5
             WHERE school_id = $6 AND space_id = $7",
        )
        .bind(name)
        .bind(category)
        .bind(space_number)
        .bind(capacity.map(|c| c as i32))
        .bind(&data)
        .bind(school_id)
        .bind(space_id)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    async fn delete_space(&self, school_id: &str, space_id: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        // Delete dependencies first if any, though cascades are usually better
        sqlx::query("DELETE FROM space_employees WHERE school_id = $1 AND space_id = $2")
            .bind(school_id)
            .bind(space_id)
            .execute(&mut *conn)
            .await?;
        sqlx::query("DELETE FROM space_materials WHERE school_id = $1 AND space_id = $2")
            .bind(school_id)
            .bind(space_id)
            .execute(&mut *conn)
            .await?;

        sqlx::query("DELETE FROM spaces WHERE school_id = $1 AND space_id = $2")
            .bind(school_id)
            .bind(space_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn get_space_details(
        &self,
        school_id: &str,
        space_id: &str,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM spaces WHERE school_id = $1 AND space_id = $2")
            .bind(school_id)
            .bind(space_id)
            .fetch_optional(&mut *conn)
            .await?;

        if let Some(r) = row {
            let mut data: Value = r.try_get("data").unwrap_or(json!({}));
            let id = r.get::<String, _>("id");
            let space_id_real = r.get::<String, _>("space_id");
            let name = r.get::<String, _>("space_name");

            // Fetch employees
            let emp_rows = sqlx::query(
                "SELECT employee_id FROM space_employees WHERE school_id = $1 AND space_id = $2",
            )
            .bind(school_id)
            .bind(&space_id_real)
            .fetch_all(&mut *conn)
            .await?;
            let employees: Vec<String> = emp_rows
                .into_iter()
                .map(|er| er.get("employee_id"))
                .collect();

            // Fetch materials
            let mat_rows = sqlx::query("SELECT material_name, quantity, unit FROM space_materials WHERE school_id = $1 AND space_id = $2")
                .bind(school_id)
                .bind(&space_id_real)
                .fetch_all(&mut *conn)
                .await?;
            let materials: Vec<Value> = mat_rows
                .into_iter()
                .map(|mr| {
                    json!({
                        "materialName": mr.get::<String, _>("material_name"),
                        "quantity": mr.get::<i32, _>("quantity"),
                        "unit": mr.get::<Option<String>, _>("unit")
                    })
                })
                .collect();

            if let Some(obj) = data.as_object_mut() {
                obj.insert("id".to_string(), json!(id));
                obj.insert("spaceId".to_string(), json!(space_id_real));
                obj.insert("spaceName".to_string(), json!(name));
                obj.insert(
                    "spaceCategory".to_string(),
                    json!(r.get::<String, _>("space_category")),
                );
                obj.insert("capacity".to_string(), json!(r.get::<i32, _>("capacity")));
                obj.insert("employees".to_string(), json!(employees));
                obj.insert("materials".to_string(), json!(materials));
            }
            Ok(Some(data))
        } else {
            Ok(None)
        }
    }

    async fn get_space_categories(&self, school_id: &str) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows =
            sqlx::query("SELECT * FROM space_categories WHERE school_id = $1 OR is_default = TRUE")
                .bind(school_id)
                .fetch_all(&mut *conn)
                .await?;

        Ok(rows
            .into_iter()
            .map(|r| {
                json!({
                    "id": r.get::<i32, _>("id"),
                    "name": r.get::<String, _>("name"),
                    "isDefault": r.get::<bool, _>("is_default")
                })
            })
            .collect())
    }

    async fn create_space_category(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let name = data["name"].as_str().unwrap_or("");
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO space_categories (school_id, name, is_default) VALUES ($1, $2, FALSE) ON CONFLICT DO NOTHING")
            .bind(school_id)
            .bind(name)
            .execute(&mut *conn)
            .await?;
        Ok(data)
    }

    async fn delete_space_category(
        &self,
        school_id: &str,
        category_id: i32,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "DELETE FROM space_categories WHERE school_id = $1 AND id = $2 AND is_default = FALSE",
        )
        .bind(school_id)
        .bind(category_id)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    async fn assign_space_materials(
        &self,
        school_id: &str,
        space_id: &str,
        materials: Vec<Value>,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        for mat in materials {
            let name = mat["materialName"].as_str().unwrap_or("");
            let qty = mat["quantity"].as_i64().unwrap_or(0) as i32;
            let unit = mat["unit"].as_str();

            sqlx::query(
                "INSERT INTO space_materials (school_id, space_id, material_name, quantity, unit)
                 VALUES ($1, $2, $3, $4, $5)",
            )
            .bind(school_id)
            .bind(space_id)
            .bind(name)
            .bind(qty)
            .bind(unit)
            .execute(&mut *conn)
            .await?;
        }
        Ok(())
    }

    async fn assign_space_employees(
        &self,
        school_id: &str,
        space_id: &str,
        employee_ids: Vec<String>,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        for emp_id in employee_ids {
            sqlx::query(
                "INSERT INTO space_employees (school_id, space_id, employee_id)
                 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
            )
            .bind(school_id)
            .bind(space_id)
            .bind(emp_id)
            .execute(&mut *conn)
            .await?;
        }
        Ok(())
    }

    async fn remove_space_employee(
        &self,
        school_id: &str,
        space_id: &str,
        employee_id: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM space_employees WHERE school_id = $1 AND space_id = $2 AND employee_id = $3")
            .bind(school_id)
            .bind(space_id)
            .bind(employee_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }
}
