use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::{Row, Acquire};
use std::sync::Arc;
use rand;
use bigdecimal::ToPrimitive;

pub struct PostgresResourceRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl ResourceRepository for PostgresResourceRepository {

    async fn add_item(
        &self,
        school_id: &str,
        space_name: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let item_id = format!(
            "{}-{}-{}",
            space_name,
            data["id"].as_str().unwrap_or(""),
            &school_id[..4]
        );
        // Resolve space_name to space_id for the items table
        let space_id: Option<String> = sqlx::query_scalar(
            "SELECT space_id FROM spaces WHERE school_id = $1 AND (name = $2 OR space_name = $2)"
        )
            .bind(school_id)
            .bind(space_name)
            .fetch_optional(&mut *conn)
            .await?;
        let sid = space_id.as_deref().unwrap_or(space_name);
        sqlx::query("INSERT INTO items (item_id, school_id, space_id, item_name, room_number, class_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (school_id, space_id, item_id) DO NOTHING")
            .bind(&item_id)
            .bind(school_id)
            .bind(sid)
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
        
        let unit = data["unit"].as_str().filter(|s| !s.is_empty());

        sqlx::query("INSERT INTO materials (school_id, name, quantity, unit_price, unit, description, attachment_path, extra_unit) VALUES ($1, $2, $3, $4, $5, $6, $7, $3) ON CONFLICT (school_id, name) DO UPDATE SET quantity = materials.quantity + EXCLUDED.quantity, extra_unit = materials.extra_unit + EXCLUDED.quantity, description = EXCLUDED.description, attachment_path = EXCLUDED.attachment_path, unit = COALESCE(EXCLUDED.unit, materials.unit), unit_price = EXCLUDED.unit_price")
            .bind(school_id)
            .bind(material_name)
            .bind(data["quantity"].as_i64())
            .bind(data["unitPrice"].as_f64())
            .bind(unit)
            .bind(data["description"].as_str())
            .bind(data["attachmentPath"].as_str())
            .execute(&mut *conn).await?;
        
        Ok(json!({
            "materialName": material_name,
            "quantity": data["quantity"].as_i64().unwrap_or(0),
            "unitPrice": data["unitPrice"].as_f64().unwrap_or(0.0),
            "unit": unit.unwrap_or(""),
            "description": data["description"].as_str().unwrap_or("")
        }))
    }

    async fn get_material(
        &self,
        school_id: &str,
        material_name: &str,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        // 1. Fetch basic material info
        let row = sqlx::query("SELECT * FROM materials WHERE school_id = $1 AND name = $2")
            .bind(school_id)
            .bind(material_name)
            .fetch_optional(&mut *conn)
            .await?;
            
        if let Some(r) = row {
            let material_id = r.get::<String, _>("id");
            // 2. Fetch occupied spaces
            let spaces = sqlx::query("SELECT space_name, quantity FROM space_materials WHERE school_id = $1 AND material_id = $2")
                .bind(school_id).bind(&material_id).fetch_all(&mut *conn).await?;
            
            let occupied_spaces: Vec<Value> = spaces.into_iter().map(|s| json!({
                "spaceName": s.get::<String, _>("space_name"),
                "quantity": s.get::<i32, _>("quantity")
            })).collect();

            // 3. Fetch history
            let history_rows = sqlx::query("SELECT * FROM material_history WHERE school_id = $1 AND material_id = $2 ORDER BY created_at DESC LIMIT 50")
                .bind(school_id).bind(&material_id).fetch_all(&mut *conn).await?;
            
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
        material_name: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        // 1. Handle Purchase logic if this is a "buy" operation (identified by quantity > 0 and perUnit)
        if let (Some(buy_qty), Some(unit_price)) = (data["quantity"].as_i64(), data["unitPrice"].as_f64()) {
            // Get current needUnit to decide where to allocate
            let current: (i32, i32) = sqlx::query_as("SELECT need_unit, extra_unit FROM materials WHERE school_id = $1 AND name = $2")
                .bind(school_id).bind(material_name).fetch_one(&mut *tx).await?;
            
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
                 WHERE school_id = $5 AND name = $6"
            )
            .bind(buy_qty as i32)
            .bind(filled_need)
            .bind(remaining_purchase)
            .bind(unit_price)
            .bind(school_id).bind(material_name).execute(&mut *tx).await?;

            // Record in material_history (Note: We might need a material_id if the table relates by ID, 
            // but let's see if we can use name for now or fetch the ID first)
            // Wait, the material_history table likely has a material_id column. 
            // Better to fetch the ID here if needed or use name if possible.
            // Actually, I'll fetch the ID at the start of update/delete/get if I want to keep DB clean.
            // But the user didn't ask to change DB schema, just identifier in code.
            
            let material_id: String = sqlx::query("SELECT id FROM materials WHERE school_id = $1 AND name = $2")
                .bind(school_id).bind(material_name).fetch_one(&mut *tx).await?.get("id");
            
            sqlx::query(
                "INSERT INTO material_history (school_id, material_id, action_type, quantity, unit_price, total_amount, actor_id, notes)
                 VALUES ($1, $2, 'PURCHASE', $3, $4, $5, $6, $7)"
            )
            .bind(school_id).bind(&material_id).bind(buy_qty as i32).bind(unit_price)
            .bind(buy_qty as f64 * unit_price).bind(admin_id).bind(data["notes"].as_str().unwrap_or("Inventory Purchase"))
            .execute(&mut *tx).await?;
        } else if let Some(new_qty) = data["quantity"].as_i64() {
            // Standard manual quantity update
            sqlx::query(
                "UPDATE materials 
                 SET quantity = $1, 
                     extra_unit = $1 - need_unit 
                 WHERE school_id = $2 AND name = $3"
            )
            .bind(new_qty)
            .bind(school_id)
            .bind(material_name)
            .execute(&mut *tx)
            .await?;
        }

        // Update other descriptive fields
        if let Some(unit) = data["unit"].as_str() {
            sqlx::query("UPDATE materials SET unit = $1 WHERE school_id = $2 AND name = $3")
                .bind(unit).bind(school_id).bind(material_name).execute(&mut *tx).await?;
        }
        if let Some(desc) = data["description"].as_str() {
            sqlx::query("UPDATE materials SET description = $1 WHERE school_id = $2 AND name = $3")
                .bind(desc).bind(school_id).bind(material_name).execute(&mut *tx).await?;
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
        search: Option<String>,
        filter: Option<String>,
        page: i64,
        limit: i64,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let mut where_clause = "WHERE school_id = $1".to_string();
        let mut params_count = 1;

        if let Some(ref s) = search {
            if !s.is_empty() {
                where_clause.push_str(&format!(" AND (name ILIKE ${} OR description ILIKE ${})", params_count + 1, params_count + 1));
                params_count += 1;
            }
        }

        if let Some(ref f) = filter {
            match f.as_str() {
                "Shortage" => {
                    where_clause.push_str(" AND need_unit > 0");
                }
                "Low Stock" => {
                    where_clause.push_str(" AND extra_unit < 5 AND extra_unit > 0");
                }
                "Out of Stock" => {
                    where_clause.push_str(" AND extra_unit = 0");
                }
                _ => {}
            }
        }

        // 1. Get total count
        let count_query = format!("SELECT COUNT(*) FROM materials {}", where_clause);
        let mut q = sqlx::query_scalar::<_, i64>(&count_query).bind(school_id);
        if let Some(ref s) = search {
            if !s.is_empty() {
                q = q.bind(format!("%{}%", s));
            }
        }
        let total_count = q.fetch_one(&mut *conn).await?;

        // 2. Get paginated data
        let offset = (page - 1) * limit;
        let data_query = format!(
            "SELECT id, name, quantity, unit_price::FLOAT as unit_price, unit, extra_unit, need_unit, description, attachment_path 
             FROM materials 
             {} 
             ORDER BY name ASC 
             LIMIT ${} OFFSET ${}", 
            where_clause, params_count + 1, params_count + 2
        );

        let mut q = sqlx::query(&data_query).bind(school_id);
        if let Some(ref s) = search {
            if !s.is_empty() {
                q = q.bind(format!("%{}%", s));
            }
        }
        let rows = q.bind(limit).bind(offset).fetch_all(&mut *conn).await?;

        let materials: Vec<Value> = rows
            .into_iter()
            .map(|r| {
                json!({
                    "materialName": r.get::<String, _>("name"),
                    "quantity": r.get::<i32, _>("quantity"),
                    "unitPrice": r.get::<Option<f64>, _>("unit_price"),
                    "unit": r.get::<Option<String>, _>("unit"),
                    "extraUnit": r.get::<i32, _>("extra_unit"),
                    "needUnit": r.get::<i32, _>("need_unit"),
                    "description": r.get::<Option<String>, _>("description"),
                    "attachmentPath": r.get::<Option<String>, _>("attachment_path")
                })
            })
            .collect();

        Ok(json!({
            "materials": materials,
            "metadata": {
                "totalCount": total_count,
                "currentPage": page,
                "itemsPerPage": limit,
                "totalPages": (total_count as f64 / limit as f64).ceil() as i64
            }
        }))
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

    async fn delete_material(&self, school_id: &str, material_name: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM materials WHERE school_id = $1 AND name = $2")
            .bind(school_id)
            .bind(material_name)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn sell_material(
        &self,
        school_id: &str,
        admin_id: &str,
        material_name: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        let sell_qty = data["quantity"].as_i64().ok_or_else(|| crate::error::AppError::Validation("Quantity is required for selling".to_string()))? as i32;
        let unit_price = data["unitPrice"].as_f64().ok_or_else(|| crate::error::AppError::Validation("Unit price is required for selling".to_string()))?;

        // 1. Get current stock and ID
        let row: (String, i32) = sqlx::query_as("SELECT id, extra_unit FROM materials WHERE school_id = $1 AND name = $2")
            .bind(school_id).bind(material_name).fetch_one(&mut *tx).await?;
        
        let material_id = row.0;
        let extra_avail = row.1;

        if extra_avail < sell_qty {
            return Err(crate::error::AppError::Validation(format!("Insufficient stock for sale. Available: {}, Requested: {}", extra_avail, sell_qty)).into());
        }

        // 2. Update material counts
        sqlx::query(
            "UPDATE materials 
             SET quantity = quantity - $1,
                 extra_unit = extra_unit - $1
             WHERE school_id = $2 AND id = $3"
        )
        .bind(sell_qty)
        .bind(school_id).bind(&material_id).execute(&mut *tx).await?;

        // 3. Record in material_history
        sqlx::query(
            "INSERT INTO material_history (school_id, material_id, action_type, quantity, unit_price, total_amount, actor_id, notes)
             VALUES ($1, $2, 'SELL', $3, $4, $5, $6, $7)"
        )
        .bind(school_id).bind(&material_id).bind(sell_qty).bind(unit_price)
        .bind(sell_qty as f64 * unit_price).bind(admin_id).bind(data["notes"].as_str().unwrap_or("Inventory Sale"))
        .execute(&mut *tx).await?;

        tx.commit().await?;
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


    async fn create_space(&self, school_id: &str, category: &str, name: String) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let space_id = format!("{}-{}", name.to_lowercase().replace(' ', "-"), &school_id[..4]);

        // Insert Space (space_id is school-scoped for global uniqueness)
        sqlx::query(
            "INSERT INTO spaces (school_id, space_id, name, space_category, data)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (school_id, space_id) DO NOTHING"
        )
        .bind(school_id)
        .bind(&space_id)
        .bind(&name)
        .bind(category)
        .bind(json!({"name": name, "category": category}))
        .execute(&mut *conn)
        .await?;

        Ok(json!({
            "spaceName": name,
            "spaceCategory": category
        }))
    }

    async fn get_spaces(&self, school_id: &str, category: Option<&str>) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let query = if let Some(cat) = category {
            sqlx::query("SELECT * FROM spaces WHERE school_id = $1 AND space_category = $2")
                .bind(school_id)
                .bind(cat)
        } else {
            sqlx::query("SELECT * FROM spaces WHERE school_id = $1")
                .bind(school_id)
        };

        let rows = query.fetch_all(&mut *conn).await?;
        Ok(rows.into_iter().map(|r| {
            json!({
                "name": r.get::<String, _>("name"),
                "spaceName": r.get::<String, _>("name"),
                "spaceCategory": r.get::<String, _>("space_category")
            })
        }).collect())
    }

    async fn get_space_categories(&self, school_id: &str) -> Result<Vec<String>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT DISTINCT space_category FROM spaces WHERE school_id = $1 AND space_category IS NOT NULL")
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;

        Ok(rows.into_iter()
            .map(|r| r.get::<String, _>("space_category"))
            .collect())
    }

    async fn get_space_details(&self, school_id: &str, space_name: &str) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM spaces WHERE school_id = $1 AND (name = $2 OR space_id = $2 OR space_name = $2)")
            .bind(school_id)
            .bind(space_name)
            .fetch_optional(&mut *conn)
            .await?;

        if let Some(r) = row {
            Ok(Some(json!({
                "name": r.get::<String, _>("name"),
                "spaceName": r.get::<String, _>("name"),
                "spaceCategory": r.get::<String, _>("space_category"),
                "data": r.get::<Value, _>("data")
            })))
        } else {
            Ok(None)
        }
    }


    async fn update_space(
        &self,
        school_id: &str,
        space_name: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let new_name = data["spaceName"].as_str();
        let category = data["spaceCategory"].as_str();

        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "UPDATE spaces SET 
                name = COALESCE($1, name),
                space_category = COALESCE($2, space_category),
                data = data || $3
             WHERE school_id = $4 AND name = $5",
        )
        .bind(new_name)
        .bind(category)
        .bind(&data)
        .bind(school_id)
        .bind(space_name)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    async fn delete_space(&self, school_id: &str, space_name: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        // 1. Delete associated data (using space_name as key)
        sqlx::query("DELETE FROM space_employees WHERE school_id = $1 AND space_name = $2")
            .bind(school_id).bind(space_name).execute(&mut *conn).await?;
        sqlx::query("DELETE FROM space_materials WHERE school_id = $1 AND space_name = $2")
            .bind(school_id).bind(space_name).execute(&mut *conn).await?;
        sqlx::query("DELETE FROM spaces WHERE school_id = $1 AND name = $2")
            .bind(school_id).bind(space_name).execute(&mut *conn).await?;
        
        Ok(())
    }



    async fn assign_space_materials(
        &self,
        school_id: &str,
        space_name: &str,
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
                "INSERT INTO space_materials (school_id, space_name, material_id, material_name, quantity, unit, unit_price)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (school_id, space_name, material_name) 
                 DO UPDATE SET 
                    quantity = space_materials.quantity + EXCLUDED.quantity,
                    unit_price = EXCLUDED.unit_price,
                    unit = COALESCE(EXCLUDED.unit, space_materials.unit)",
            )
            .bind(school_id).bind(space_name).bind(&real_material_id).bind(name).bind(qty).bind(unit).bind(unit_price)
            .execute(&mut *tx).await?;

            // 4. Record history
            sqlx::query(
                "INSERT INTO material_history (school_id, material_id, action_type, quantity, space_name, notes)
                 VALUES ($1, $2, 'BORROW', $3, $4, $5)"
            )
            .bind(school_id).bind(&real_material_id).bind(qty).bind(space_name).bind(format!("Borrowed by Space: {}", space_name))
            .execute(&mut *tx).await?;
        }
        tx.commit().await?;
        Ok(())
    }

    async fn remove_space_material(
        &self,
        school_id: &str,
        space_name: &str,
        material_name: &str,
        quantity: i32,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;
        
        // 1. Get material_id from space_materials first
        let material_id: String = sqlx::query("SELECT material_id FROM space_materials WHERE school_id = $1 AND space_name = $2 AND material_name = $3")
            .bind(school_id).bind(space_name).bind(material_name).fetch_one(&mut *tx).await?.get("material_id");
        
        // 2. Remove from space_materials
        sqlx::query("DELETE FROM space_materials WHERE school_id = $1 AND space_name = $2 AND material_name = $3")
            .bind(school_id).bind(space_name).bind(material_name).execute(&mut *tx).await?;

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
            "INSERT INTO material_history (school_id, material_id, action_type, quantity, space_name, notes)
             VALUES ($1, $2, 'RETURN', $3, $4, $5)"
        )
        .bind(school_id).bind(&material_id).bind(quantity).bind(space_name).bind(format!("Returned from Space: {}", space_name))
        .execute(&mut *tx).await?;

        tx.commit().await?;
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

pub fn get_default_materials() -> std::collections::HashMap<String, Vec<Value>> {
    let mut map = std::collections::HashMap::new();
    
    map.insert("classroom".to_string(), vec![
        json!({ "materialName": "Ceiling Fan", "quantity": 2, "unitPrice": 1500.0, "unit": "pcs" }),
        json!({ "materialName": "White Board", "quantity": 1, "unitPrice": 2000.0, "unit": "pcs" }),
        json!({ "materialName": "Benches", "quantity": 20, "unitPrice": 800.0, "unit": "pcs" }),
    ]);
    
    map.insert("office".to_string(), vec![
        json!({ "materialName": "Office Table", "quantity": 1, "unitPrice": 5000.0, "unit": "pcs" }),
        json!({ "materialName": "Office Chair", "quantity": 2, "unitPrice": 2500.0, "unit": "pcs" }),
    ]);

    map
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
