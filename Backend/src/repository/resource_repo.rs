use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::{Row, Acquire};
use std::sync::Arc;
use rand;
use crate::services::academic_utils::get_default_materials;
use bigdecimal::ToPrimitive;

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
            "{}-{}",
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
        let material_name = data["materialName"].as_str().unwrap_or("unknown");
        let material_id = format!("MAT-{:06}", rand::random::<u32>() % 900000 + 100000);
        
        let unit = data["unit"].as_str().filter(|s| !s.is_empty());

        let row = sqlx::query("INSERT INTO materials (id, school_id, name, quantity, unit_price, unit, description, attachment_path, extra_unit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $4) ON CONFLICT (school_id, name) DO UPDATE SET quantity = materials.quantity + EXCLUDED.quantity, extra_unit = materials.extra_unit + EXCLUDED.quantity, description = EXCLUDED.description, attachment_path = EXCLUDED.attachment_path, unit = COALESCE(EXCLUDED.unit, materials.unit), unit_price = EXCLUDED.unit_price RETURNING id")
            .bind(&material_id)
            .bind(school_id)
            .bind(material_name)
            .bind(data["quantity"].as_i64())
            .bind(data["unitPrice"].as_f64())
            .bind(unit)
            .bind(data["description"].as_str())
            .bind(data["attachmentPath"].as_str())
            .fetch_one(&mut *conn).await?;
        
        let mut ret = data.clone();
        ret["id"] = json!(row.get::<String, _>("id"));
        Ok(ret)
    }

    async fn get_material(
        &self,
        school_id: &str,
        material_id: &str,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        // 1. Fetch basic material info
        let row = sqlx::query("SELECT * FROM materials WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(material_id)
            .fetch_optional(&mut *conn)
            .await?;
            
        if let Some(r) = row {
            // 2. Fetch occupied spaces
            let spaces = sqlx::query("SELECT space_id, quantity FROM space_materials WHERE school_id = $1 AND material_id = $2")
                .bind(school_id).bind(material_id).fetch_all(&mut *conn).await?;
            
            let occupied_spaces: Vec<Value> = spaces.into_iter().map(|s| json!({
                "spaceId": s.get::<String, _>("space_id"),
                "quantity": s.get::<i32, _>("quantity")
            })).collect();

            // 3. Fetch history
            let history_rows = sqlx::query("SELECT * FROM material_history WHERE school_id = $1 AND material_id = $2 ORDER BY created_at DESC LIMIT 50")
                .bind(school_id).bind(material_id).fetch_all(&mut *conn).await?;
            
            let history: Vec<Value> = history_rows.into_iter().map(|h| json!({
                "actionType": h.get::<String, _>("action_type"),
                "quantity": h.get::<i32, _>("quantity"),
                "unitPrice": h.get::<Option<bigdecimal::BigDecimal>, _>("unit_price").map(|b| b.to_f64().unwrap_or(0.0)),
                "totalAmount": h.get::<Option<bigdecimal::BigDecimal>, _>("total_amount").map(|b| b.to_f64().unwrap_or(0.0)),
                "actorId": h.get::<Option<String>, _>("actor_id"),
                "spaceId": h.get::<Option<String>, _>("space_id"),
                "notes": h.get::<Option<String>, _>("notes"),
                "createdAt": h.get::<chrono::DateTime<chrono::Utc>, _>("created_at")
            })).collect();

            Ok(Some(json!({
                "id": r.get::<String, _>("id"), 
                "materialName": r.get::<String, _>("name"),
                "quantity": r.get::<i32, _>("quantity"),
                "unitPrice": r.get::<bigdecimal::BigDecimal, _>("unit_price").to_f64().unwrap_or(0.0),
                "unit": r.get::<Option<String>, _>("unit"),
                "extraUnit": r.get::<i32, _>("extra_unit"),
                "needUnit": r.get::<i32, _>("need_unit"),
                "description": r.get::<Option<String>, _>("description"),
                "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                "occupiedSpaces": occupied_spaces,
                "history": history
            })))
        } else {
            Ok(None)
        }
    }

    async fn update_material(
        &self,
        school_id: &str,
        admin_id: &str, // Changed to accept admin_id for history
        material_id: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        // 1. Handle Purchase logic if this is a "buy" operation (identified by quantity > 0 and perUnit)
        if let (Some(buy_qty), Some(unit_price)) = (data["quantity"].as_i64(), data["unitPrice"].as_f64()) {
            // Get current needUnit to decide where to allocate
            let current: (i32, i32) = sqlx::query_as("SELECT need_unit, extra_unit FROM materials WHERE school_id = $1 AND id = $2")
                .bind(school_id).bind(material_id).fetch_one(&mut *tx).await?;
            
            let need_to_fill = current.0;
            let mut remaining_purchase = buy_qty as i32;
            
            let filled_need = std::cmp::min(need_to_fill, remaining_purchase);
            remaining_purchase -= filled_need;
            
            // Update material counts
            sqlx::query(
                "UPDATE materials 
                 SET quantity = quantity + $1,
                     need_unit = need_unit - $2,
                     extra_unit = extra_unit + $3,
                     unit_price = $4
                 WHERE school_id = $5 AND id = $6"
            )
            .bind(buy_qty as i32)
            .bind(filled_need)
            .bind(remaining_purchase)
            .bind(unit_price)
            .bind(school_id).bind(material_id).execute(&mut *tx).await?;

            // Record in material_history
            sqlx::query(
                "INSERT INTO material_history (school_id, material_id, action_type, quantity, unit_price, total_amount, actor_id, notes)
                 VALUES ($1, $2, 'PURCHASE', $3, $4, $5, $6, $7)"
            )
            .bind(school_id).bind(material_id).bind(buy_qty as i32).bind(unit_price)
            .bind(buy_qty as f64 * unit_price).bind(admin_id).bind(data["notes"].as_str().unwrap_or("Inventory Purchase"))
            .execute(&mut *tx).await?;
        } else if let Some(new_qty) = data["quantity"].as_i64() {
            // Standard manual quantity update
            sqlx::query(
                "UPDATE materials 
                 SET quantity = $1, 
                     extra_unit = $1 - need_unit 
                 WHERE school_id = $2 AND id = $3"
            )
            .bind(new_qty)
            .bind(school_id)
            .bind(material_id)
            .execute(&mut *tx)
            .await?;
        }

        // Update other descriptive fields
        if let Some(unit) = data["unit"].as_str() {
            sqlx::query("UPDATE materials SET unit = $1 WHERE school_id = $2 AND id = $3")
                .bind(unit).bind(school_id).bind(material_id).execute(&mut *tx).await?;
        }
        if let Some(desc) = data["description"].as_str() {
            sqlx::query("UPDATE materials SET description = $1 WHERE school_id = $2 AND id = $3")
                .bind(desc).bind(school_id).bind(material_id).execute(&mut *tx).await?;
        }

        tx.commit().await?;
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
        let rows = sqlx::query("SELECT id, name, quantity, unit_price::FLOAT as unit_price, unit, extra_unit, need_unit FROM materials WHERE school_id = $1")
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
                    "unit": r.get::<Option<String>, _>("unit"),
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
        category_id: Option<i32>,
    ) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        // 1. Fetch filtered spaces
        let space_rows = match category_id {
            Some(cid) => {
                // Find category name first
                let cat_name: Option<String> = sqlx::query_scalar("SELECT name FROM space_categories WHERE id = $1")
                    .bind(cid)
                    .fetch_optional(&mut *conn)
                    .await?;
                
                match cat_name {
                    Some(name) => {
                        sqlx::query("SELECT * FROM spaces WHERE school_id = $1 AND space_category = $2")
                            .bind(school_id)
                            .bind(name)
                            .fetch_all(&mut *conn)
                            .await?
                    },
                    None => Vec::new() // ID provided but not found
                }
            },
            None => {
                sqlx::query("SELECT * FROM spaces WHERE school_id = $1")
                    .bind(school_id)
                    .fetch_all(&mut *conn)
                    .await?
            }
        };

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

        // Fetch all personnel requirements for these spaces
        let req_rows = sqlx::query(
            "SELECT sr.space_id, sr.responsibility_id, r.name, sr.required_count,
             (SELECT COUNT(*) FROM space_employees se
              JOIN employee_responsibilities er ON se.employee_id = er.employee_id AND se.school_id = er.school_id
              WHERE se.space_id = sr.space_id AND se.school_id = sr.school_id AND er.responsibility_id = sr.responsibility_id) as fulfilled_count
             FROM space_requirements sr
             JOIN responsibilities r ON sr.responsibility_id = r.responsibility_id AND sr.school_id = r.school_id
             WHERE sr.school_id = $1"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let mut req_map: std::collections::HashMap<String, Vec<Value>> = std::collections::HashMap::new();
        for rr in req_rows {
            let space_id = rr.get::<String, _>("space_id");
            req_map.entry(space_id).or_default().push(json!({
                "roleId": rr.get::<String, _>("responsibility_id"),
                "roleName": rr.get::<String, _>("name"),
                "requiredCount": rr.get::<i32, _>("required_count"),
                "fulfilledCount": rr.get::<i64, _>("fulfilled_count")
            }));
        }

        // Fetch all material requirements for these spaces
        let mat_req_rows = sqlx::query(
            "SELECT smr.space_id, smr.material_name, smr.required_count,
             COALESCE((SELECT SUM(quantity) FROM space_materials sm
              WHERE sm.space_id = smr.space_id AND sm.school_id = smr.school_id AND sm.material_name = smr.material_name), 0) as fulfilled_count
             FROM space_material_requirements smr
             WHERE smr.school_id = $1"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let mut mat_req_map: std::collections::HashMap<String, Vec<Value>> = std::collections::HashMap::new();
        for mr in mat_req_rows {
            let space_id = mr.get::<String, _>("space_id");
            mat_req_map.entry(space_id).or_default().push(json!({
                "materialName": mr.get::<String, _>("material_name"),
                "requiredCount": mr.get::<i32, _>("required_count"),
                "fulfilledCount": mr.get::<i64, _>("fulfilled_count")
            }));
        }

        // Fetch all materials assigned to spaces (inventory)
        let mat_rows = sqlx::query(
            "SELECT space_id, material_id, material_name, quantity, unit, unit_price::FLOAT FROM space_materials WHERE school_id = $1"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let mut inventory_map: std::collections::HashMap<String, Vec<Value>> = std::collections::HashMap::new();
        for mr in mat_rows {
            let space_id = mr.get::<String, _>("space_id");
            inventory_map.entry(space_id).or_default().push(json!({
                "materialId": mr.get::<Option<String>, _>("material_id"),
                "materialName": mr.get::<String, _>("material_name"),
                "quantity": mr.get::<i32, _>("quantity"),
                "unit": mr.get::<Option<String>, _>("unit"),
                "unitPrice": mr.get::<Option<f64>, _>("unit_price")
            }));
        }

        // 4. Construct final JSON
        let result = space_rows
            .into_iter()
            .map(|r| {
                let space_id = r.try_get::<String, _>("space_id").unwrap_or_default();
                let name = r.try_get::<String, _>("space_name").unwrap_or_default();
                let category = r.try_get::<String, _>("space_category").ok();
                let inventory = inventory_map.get(&space_id).cloned().unwrap_or_default();
                let requirements = req_map.get(&space_id).cloned().unwrap_or_default();
                
                json!({
                    "spaceId": space_id,
                    "name": name,
                    "spaceName": name,
                    "spaceCategory": category,
                    "inventory": inventory,
                    "requirements": requirements
                })
            })
            .collect::<Vec<Value>>();

        Ok(result)
    }


    async fn create_space(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let category_id = data["categoryId"]
            .as_i64()
            .or_else(|| data["spaceCategory"].as_i64())
            .ok_or_else(|| AppError::from("categoryId is mandatory"))? as i32;

        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        // 1. Get Category Name
        let category_row: sqlx::postgres::PgRow = sqlx::query("SELECT name FROM space_categories WHERE id = $1")
            .bind(category_id)
            .fetch_one(&mut *tx)
            .await?;
        let category_name = category_row.get::<String, _>("name");

        // 2. Count existing spaces in this category for this school to generate systematic number
        let count_row: sqlx::postgres::PgRow = sqlx::query(
            "SELECT COUNT(*) FROM spaces WHERE school_id = $1 AND space_category = $2",
        )
        .bind(school_id)
        .bind(&category_name)
        .fetch_one(&mut *tx)
        .await?;
        let count = count_row.get::<i64, _>(0);
        
        let space_number = if let Some(n) = data["spaceNumber"].as_str() {
            n.to_string()
        } else {
            (count + 1).to_string()
        };

        // Validate uniqueness of category + number
        let exists: Option<sqlx::postgres::PgRow> = sqlx::query("SELECT 1 FROM spaces WHERE school_id = $1 AND space_category = $2 AND space_number = $3")
            .bind(school_id)
            .bind(&category_name)
            .bind(&space_number)
            .fetch_optional(&mut *tx)
            .await?;
        if exists.is_some() {
            return Err(AppError::from(format!("Space {} {} already exists", category_name, space_number)));
        }

        // 3. Determine systematic name and human-readable space name
        let systematic_name = format!("{} {}", category_name, space_number);
        let human_readable_name = data["spaceName"].as_str().unwrap_or(&systematic_name).to_string();

        // 4. Generate unique Space ID
        let space_id = format!("SP{:06}", rand::random::<u32>() % 900000 + 100000);
        println!("create_space: generated space_id = {}, school_id = {}", space_id, school_id);

        // 5. Insert Space
        sqlx::query(
            "INSERT INTO spaces (space_id, school_id, name, space_name, space_category, space_number, capacity, data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
        )
        .bind(&space_id)
        .bind(school_id)
        .bind(&systematic_name)
        .bind(&human_readable_name)
        .bind(&category_name)
        .bind(&space_number)
        .bind(data["capacity"].as_i64().unwrap_or(0) as i32)
        .bind(&data)
        .execute(&mut *tx)
        .await?;

        // 6. Add default materials for this category (Using BORROW logic)
        let default_materials_map = get_default_materials();
        let mut allocated_materials = Vec::new();
        if let Some(default_materials) = default_materials_map.get(category_name.as_str()) {
            for mat in default_materials {
                let material_name = mat["materialName"].as_str().unwrap_or("unknown");
                let qty = mat["quantity"].as_i64().unwrap_or(0) as i32;
                let unit = mat["unit"].as_str().filter(|s| !s.is_empty());
                let unit_price = mat["unitPrice"].as_f64().unwrap_or(0.0);

                // 1. Ensure material exists or get existing
                let row = sqlx::query(
                    "INSERT INTO materials (id, school_id, name, quantity, unit_price, unit, extra_unit, need_unit) 
                     VALUES ($1, $2, $3, 0, $4, $5, 0, 0) 
                     ON CONFLICT (school_id, name) DO UPDATE SET name = EXCLUDED.name
                     RETURNING id"
                )
                .bind(format!("MAT-{:06}", rand::random::<u32>() % 900000 + 100000))
                .bind(school_id).bind(material_name).bind(unit_price).bind(unit)
                .fetch_one(&mut *tx).await?;
                
                let real_material_id: String = row.get("id");

                // 2. Check stock: Borrow from extra_unit if available, else increase need_unit
                let stock: (i32, i32) = sqlx::query_as("SELECT extra_unit, need_unit FROM materials WHERE school_id = $1 AND id = $2")
                    .bind(school_id).bind(&real_material_id).fetch_one(&mut *tx).await?;
                
                let from_extra = std::cmp::min(stock.0, qty);
                let from_need = qty - from_extra;

                sqlx::query(
                    "UPDATE materials 
                     SET extra_unit = extra_unit - $1, 
                         need_unit = need_unit + $2
                     WHERE school_id = $3 AND id = $4"
                )
                .bind(from_extra).bind(from_need).bind(school_id).bind(&real_material_id)
                .execute(&mut *tx).await?;

                // 3. Assign to space inventory
                sqlx::query(
                    "INSERT INTO space_materials (school_id, space_id, material_id, material_name, quantity, unit, unit_price)
                     VALUES ($1, $2, $3, $4, $5, $6, $7) 
                     ON CONFLICT (school_id, space_id, material_name) 
                     DO UPDATE SET 
                        quantity = space_materials.quantity + EXCLUDED.quantity,
                        unit_price = EXCLUDED.unit_price,
                        unit = COALESCE(EXCLUDED.unit, space_materials.unit)"
                )
                .bind(school_id).bind(&space_id).bind(&real_material_id).bind(material_name).bind(qty).bind(unit).bind(unit_price)
                .execute(&mut *tx).await?;
                
                // 4. Record history
                sqlx::query(
                    "INSERT INTO material_history (school_id, material_id, action_type, quantity, space_id, notes)
                     VALUES ($1, $2, 'BORROW', $3, $4, $5)"
                )
                .bind(school_id).bind(&real_material_id).bind(qty).bind(&space_id).bind(format!("Auto-allocated for Space: {}", systematic_name))
                .execute(&mut *tx).await?;

                allocated_materials.push(json!({
                    "materialId": real_material_id,
                    "materialName": material_name,
                    "quantity": qty,
                    "unit": unit,
                    "unitPrice": unit_price
                }));
            }
        }

        // 6. Insert Requirements
        if let Some(reqs) = data["requirements"].as_array() {
            for req in reqs {
                if let (Some(role_id), Some(count)) = (req["roleId"].as_str(), req["count"].as_i64()) {
                    sqlx::query(
                        "INSERT INTO space_requirements (school_id, space_id, responsibility_id, required_count)
                         VALUES ($1, $2, $3, $4) ON CONFLICT (school_id, space_id, responsibility_id) DO UPDATE SET required_count = $4"
                    )
                    .bind(school_id).bind(&space_id).bind(role_id).bind(count as i32)
                    .execute(&mut *tx)
                    .await?;
                }
            }
        }

        // 7. Insert Initial Materials (Inventory)
        if let Some(mats) = data["materials"].as_array() {
            for mat in mats {
                if let (Some(name), Some(qty)) = (mat["materialName"].as_str(), mat["quantity"].as_i64()) {
                    sqlx::query(
                        "INSERT INTO space_materials (school_id, space_id, material_name, quantity, unit)
                         VALUES ($1, $2, $3, $4, $5)"
                    )
                    .bind(school_id).bind(&space_id).bind(name).bind(qty as i32).bind(mat["unit"].as_str())
                    .execute(&mut *tx)
                    .await?;
                }
            }
        }

        // 8. Insert Material Requirements (Mandates)
        if let Some(mat_reqs) = data["materialRequirements"].as_array() {
            for req in mat_reqs {
                if let (Some(name), Some(count)) = (req["materialName"].as_str(), req["requiredCount"].as_i64()) {
                    sqlx::query(
                        "INSERT INTO space_material_requirements (school_id, space_id, material_name, required_count)
                         VALUES ($1, $2, $3, $4) ON CONFLICT (school_id, space_id, material_name) DO UPDATE SET required_count = $4"
                    )
                    .bind(school_id).bind(&space_id).bind(name).bind(count as i32)
                    .execute(&mut *tx)
                    .await?;
                }
            }
        }

        tx.commit().await?;

        // Return constructed object
        let mut ret = data.clone();
        if let Some(obj) = ret.as_object_mut() {
            obj.insert("spaceId".to_string(), json!(space_id));
            obj.insert("spaceName".to_string(), json!(human_readable_name));
            obj.insert("spaceCategory".to_string(), json!(category_name));
            obj.insert("allocatedMaterials".to_string(), json!(allocated_materials));
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
        
        // 1. Get category of space being deleted
        let cat_row = sqlx::query("SELECT space_category FROM spaces WHERE school_id = $1 AND space_id = $2")
            .bind(school_id).bind(space_id).fetch_optional(&mut *conn).await?;
        
        let category = match cat_row {
            Some(r) => r.get::<Option<String>, _>("space_category"),
            None => return Ok(()), // Already gone
        };

        // 2. Perform deletion
        sqlx::query("DELETE FROM space_employees WHERE school_id = $1 AND space_id = $2")
            .bind(school_id).bind(space_id).execute(&mut *conn).await?;
        sqlx::query("DELETE FROM space_materials WHERE school_id = $1 AND space_id = $2")
            .bind(school_id).bind(space_id).execute(&mut *conn).await?;
        sqlx::query("DELETE FROM spaces WHERE school_id = $1 AND space_id = $2")
            .bind(school_id).bind(space_id).execute(&mut *conn).await?;

        // 3. Re-index remaining spaces in same category (only those with generic names)
        if let Some(cat) = category {
            let remaining = sqlx::query("SELECT space_id, space_name FROM spaces WHERE school_id = $1 AND space_category = $2 ORDER BY created_at ASC")
                .bind(school_id).bind(&cat).fetch_all(&mut *conn).await?;
            
            let mut generic_index = 1;
            for row in remaining {
                let sid = row.get::<String, _>("space_id");
                let current_name = row.get::<String, _>("space_name");
                // Check if current_name matches pattern "category number"
                let parts: Vec<&str> = current_name.split_whitespace().collect();
                let is_generic = parts.len() == 2 && parts[0] == cat && parts[1].chars().all(|c| c.is_ascii_digit());
                if is_generic {
                    let new_name = format!("{} {}", cat, generic_index);
                    sqlx::query("UPDATE spaces SET space_name = $1 WHERE school_id = $2 AND space_id = $3")
                        .bind(&new_name).bind(school_id).bind(&sid).execute(&mut *conn).await?;
                    generic_index += 1;
                }
                // If not generic, keep current name unchanged
            }
        }
        
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
            let space_category = r.get::<String, _>("space_category");
            let capacity = r.get::<i32, _>("capacity");

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
            let mat_rows = sqlx::query(
                "SELECT material_id, material_name, quantity, unit, unit_price::FLOAT as unit_price, created_at FROM space_materials WHERE school_id = $1 AND space_id = $2"
            )
            .bind(school_id)
            .bind(&space_id_real)
            .fetch_all(&mut *conn)
            .await?;
            let materials: Vec<Value> = mat_rows
                .into_iter()
                .map(|mr| {
                    json!({
                        "materialId": mr.get::<Option<String>, _>("material_id"),
                        "materialName": mr.get::<String, _>("material_name"),
                        "quantity": mr.get::<i32, _>("quantity"),
                        "unit": mr.get::<Option<String>, _>("unit"),
                        "unitPrice": mr.get::<Option<f64>, _>("unit_price"),
                        "createdAt": mr.get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                    })
                })
                .collect();

            // Fetch requirements and fulfillment
            let req_rows = sqlx::query(
                "SELECT sr.responsibility_id, r.name, sr.required_count,
                 (SELECT COUNT(*) FROM space_employees se 
                  JOIN employee_responsibilities er ON se.employee_id = er.employee_id AND se.school_id = er.school_id
                  WHERE se.space_id = sr.space_id AND se.school_id = sr.school_id AND er.responsibility_id = sr.responsibility_id) as fulfilled_count
                 FROM space_requirements sr
                 JOIN responsibilities r ON sr.responsibility_id = r.responsibility_id AND sr.school_id = r.school_id
                 WHERE sr.school_id = $1 AND sr.space_id = $2"
            )
            .bind(school_id)
            .bind(&space_id_real)
            .fetch_all(&mut *conn)
            .await?;

            let requirements: Vec<Value> = req_rows
                .into_iter()
                .map(|rr| {
                    json!({
                        "roleId": rr.get::<String, _>("responsibility_id"),
                        "roleName": rr.get::<String, _>("name"),
                        "requiredCount": rr.get::<i32, _>("required_count"),
                        "fulfilledCount": rr.get::<i64, _>("fulfilled_count")
                    })
                })
                .collect();

            // Fetch Material Requirements and Fulfillment
            let mat_req_rows = sqlx::query(
                "SELECT smr.material_name, smr.required_count,
                 COALESCE((SELECT SUM(quantity) FROM space_materials sm 
                  WHERE sm.space_id = smr.space_id AND sm.school_id = smr.school_id AND sm.material_name = smr.material_name), 0) as fulfilled_count
                 FROM space_material_requirements smr
                 WHERE smr.school_id = $1 AND smr.space_id = $2"
            )
            .bind(school_id)
            .bind(&space_id_real)
            .fetch_all(&mut *conn)
            .await?;

            let material_requirements: Vec<Value> = mat_req_rows
                .into_iter()
                .map(|mr| {
                    json!({
                        "materialName": mr.get::<String, _>("material_name"),
                        "requiredCount": mr.get::<i32, _>("required_count"),
                        "fulfilledCount": mr.get::<i64, _>("fulfilled_count")
                    })
                })
                .collect();

            // Assemble Details
            if let Some(obj) = data.as_object_mut() {
                obj.insert("id".to_string(), json!(id));
                obj.insert("spaceId".to_string(), json!(space_id_real));
                obj.insert("spaceName".to_string(), json!(name));
                obj.insert("spaceCategory".to_string(), json!(space_category));
                obj.insert("capacity".to_string(), json!(capacity));
                obj.insert("employees".to_string(), json!(employees));
                obj.insert("materials".to_string(), json!(materials));
                obj.insert("requirements".to_string(), json!(requirements));
                obj.insert("materialRequirements".to_string(), json!(material_requirements));
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
        let mut tx = conn.begin().await?;

        for mat in materials {
            let name = mat["materialName"].as_str().unwrap_or(mat["name"].as_str().unwrap_or(""));
            let material_id_from_input = mat["materialId"].as_str();
            let qty = mat["quantity"].as_i64().unwrap_or(0) as i32;
            let unit = mat["unit"].as_str().filter(|s| !s.is_empty());
            let unit_price = mat["unitPrice"].as_f64().unwrap_or(0.0);

            if name.is_empty() { continue; }

            // 1. Ensure material exists or get existing by ID/Name
            let real_material_id = if let Some(mid) = material_id_from_input {
                mid.to_string()
            } else {
                let row = sqlx::query(
                    "INSERT INTO materials (id, school_id, name, quantity, unit_price, unit, extra_unit) 
                     VALUES ($1, $2, $3, 0, $4, $5, 0) 
                     ON CONFLICT (school_id, name) DO UPDATE SET name = EXCLUDED.name
                     RETURNING id"
                )
                .bind(format!("MAT-{:06}", rand::random::<u32>() % 900000 + 100000))
                .bind(school_id).bind(name).bind(unit_price).bind(unit)
                .fetch_one(&mut *tx).await?;
                
                row.get::<String, _>("id")
            };

            // 2. Logic: Borrow from extra_unit if available, else increase need_unit
            let stock: (i32, i32) = sqlx::query_as("SELECT extra_unit, need_unit FROM materials WHERE school_id = $1 AND id = $2")
                .bind(school_id).bind(&real_material_id).fetch_one(&mut *tx).await?;
            
            let extra_avail = stock.0;
            let from_extra = std::cmp::min(extra_avail, qty);
            let from_need = qty - from_extra;

            sqlx::query(
                "UPDATE materials 
                 SET extra_unit = extra_unit - $1, 
                     need_unit = need_unit + $2
                 WHERE school_id = $3 AND id = $4"
            )
            .bind(from_extra).bind(from_need).bind(school_id).bind(&real_material_id)
            .execute(&mut *tx).await?;

            // 3. Record the assignment in space_materials
            sqlx::query(
                "INSERT INTO space_materials (school_id, space_id, material_id, material_name, quantity, unit, unit_price)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (school_id, space_id, material_name) 
                 DO UPDATE SET 
                    quantity = space_materials.quantity + EXCLUDED.quantity,
                    unit_price = EXCLUDED.unit_price,
                    unit = COALESCE(EXCLUDED.unit, space_materials.unit)",
            )
            .bind(school_id).bind(space_id).bind(&real_material_id).bind(name).bind(qty).bind(unit).bind(unit_price)
            .execute(&mut *tx).await?;

            // 4. Record history
            sqlx::query(
                "INSERT INTO material_history (school_id, material_id, action_type, quantity, space_id, notes)
                 VALUES ($1, $2, 'BORROW', $3, $4, $5)"
            )
            .bind(school_id).bind(&real_material_id).bind(qty).bind(space_id).bind(format!("Borrowed by Space: {}", space_id))
            .execute(&mut *tx).await?;
        }
        tx.commit().await?;
        Ok(())
    }

    async fn remove_space_material(
        &self,
        school_id: &str,
        space_id: &str,
        material_name: &str,
        quantity: i32,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;
        
        // 1. Get material_id from space_materials first
        let material_id: String = sqlx::query("SELECT material_id FROM space_materials WHERE school_id = $1 AND space_id = $2 AND material_name = $3")
            .bind(school_id).bind(space_id).bind(material_name).fetch_one(&mut *tx).await?.get("material_id");
        
        // 2. Remove from space_materials
        sqlx::query("DELETE FROM space_materials WHERE school_id = $1 AND space_id = $2 AND material_name = $3")
            .bind(school_id).bind(space_id).bind(material_name).execute(&mut *tx).await?;

        // 3. Restore global stock tracking (RETURN logic)
        // Since we are returning from a space, we increase extra_unit and decrease need_unit
        sqlx::query(
            "UPDATE materials 
             SET extra_unit = extra_unit + $1, 
                 need_unit = need_unit - $1 
             WHERE school_id = $2 AND id = $3"
        )
        .bind(quantity)
        .bind(school_id)
        .bind(&material_id)
        .execute(&mut *tx)
        .await?;

        // 4. Record history
        sqlx::query(
            "INSERT INTO material_history (school_id, material_id, action_type, quantity, space_id, notes)
             VALUES ($1, $2, 'RETURN', $3, $4, $5)"
        )
        .bind(school_id).bind(&material_id).bind(quantity).bind(space_id).bind(format!("Returned from Space: {}", space_id))
        .execute(&mut *tx).await?;

        tx.commit().await?;
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

    async fn get_material_history(
        &self,
        school_id: &str,
        material_id: &str,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT * FROM material_history WHERE school_id = $1 AND material_id = $2 ORDER BY created_at DESC LIMIT 100")
            .bind(school_id)
            .bind(material_id)
            .fetch_all(&mut *conn)
            .await?;
        
        Ok(rows.into_iter().map(|h| json!({
            "id": h.get::<i32, _>("id"),
            "actionType": h.get::<String, _>("action_type"),
            "quantity": h.get::<i32, _>("quantity"),
            "unitPrice": h.get::<Option<bigdecimal::BigDecimal>, _>("unit_price").map(|b| b.to_f64().unwrap_or(0.0)),
            "totalAmount": h.get::<Option<bigdecimal::BigDecimal>, _>("total_amount").map(|b| b.to_f64().unwrap_or(0.0)),
            "actorId": h.get::<Option<String>, _>("actor_id"),
            "spaceId": h.get::<Option<String>, _>("space_id"),
            "notes": h.get::<Option<String>, _>("notes"),
            "createdAt": h.get::<chrono::DateTime<chrono::Utc>, _>("created_at")
        })).collect())
    }

    async fn get_materials_dashboard(&self, school_id: &str) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        // 1. Total Investment (Total value of current inventory)
        let total_inv_row = sqlx::query("SELECT SUM(quantity * unit_price) as total FROM materials WHERE school_id = $1")
            .bind(school_id).fetch_one(&mut *conn).await?;
        let total_investment = total_inv_row.get::<Option<bigdecimal::BigDecimal>, _>("total").map(|b| b.to_f64().unwrap_or(0.0)).unwrap_or(0.0);

        // 2. Shortage Items (Where need_unit > 0)
        let shortage_row = sqlx::query("SELECT COUNT(*) FROM materials WHERE school_id = $1 AND need_unit > 0")
            .bind(school_id).fetch_one(&mut *conn).await?;
        let shortage_count = shortage_row.get::<i64, _>(0);

        // 3. Out of Stock (Where extra_unit = 0)
        let out_row = sqlx::query("SELECT COUNT(*) FROM materials WHERE school_id = $1 AND extra_unit = 0")
            .bind(school_id).fetch_one(&mut *conn).await?;
        let out_count = out_row.get::<i64, _>(0);

        // 4. Low Stock (Where extra_unit < 5 AND extra_unit > 0)
        let low_row = sqlx::query("SELECT COUNT(*) FROM materials WHERE school_id = $1 AND extra_unit < 5 AND extra_unit > 0")
            .bind(school_id).fetch_one(&mut *conn).await?;
        let low_count = low_row.get::<i64, _>(0);

        Ok(json!({
            "success": true,
            "data": {
                "totalInvestment": total_investment,
                "shortageCount": shortage_count,
                "outOfStockCount": out_count,
                "lowStockCount": low_count
            }
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[tokio::test]
    async fn test_get_default_materials() {
        let mats = get_default_materials();
        assert!(mats.contains_key("classroom"));
        let classroom_mats = mats.get("classroom").unwrap();
        assert!(classroom_mats.iter().any(|m| m["materialName"] == "Ceiling Fan"));
    }
}
