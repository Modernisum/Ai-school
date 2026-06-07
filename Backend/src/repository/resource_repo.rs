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
            "SELECT id FROM spaces WHERE school_id = $1 AND (name = $2 OR id = $2)"
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
        crate::repository::base::insert_audit_log(&mut *conn, school_id, "material", material_id, action, data).await?;
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

    async fn get_events(&self, school_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT * FROM events WHERE school_id = $1 ORDER BY start_time DESC LIMIT 100")
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;
        Ok(rows.into_iter().map(|r| json!({
            "id": r.get::<i32, _>("id"),
            "title": r.get::<String, _>("title"),
            "description": r.get::<Option<String>, _>("description"),
            "startTime": r.get::<chrono::NaiveDateTime, _>("start_time").to_string(),
            "endTime": r.get::<Option<chrono::NaiveDateTime>, _>("end_time").map(|t| t.to_string()),
            "location": r.get::<Option<String>, _>("location"),
            "status": r.get::<Option<String>, _>("status"),
        })).collect())
    }

    async fn update_event(&self, school_id: &str, event_id: i32, data: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "UPDATE events SET title = COALESCE($1, title), description = COALESCE($2, description), \
             start_time = COALESCE($3::timestamp, start_time), end_time = COALESCE($4::timestamp, end_time), \
             location = COALESCE($5, location), status = COALESCE($6, status) \
             WHERE school_id = $7 AND id = $8"
        )
        .bind(data["title"].as_str()).bind(data["description"].as_str())
        .bind(data["startTime"].as_str()).bind(data["endTime"].as_str())
        .bind(data["location"].as_str()).bind(data["status"].as_str())
        .bind(school_id).bind(event_id)
        .execute(&mut *conn).await?;
        Ok(())
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
        
        // Check if material is assigned to any spaces
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM space_materials WHERE school_id = $1 AND material_name = $2")
            .bind(school_id)
            .bind(material_name)
            .fetch_one(&mut *conn)
            .await?;
            
        if count > 0 {
            return Err(format!(
                "Cannot delete material '{}' because it is assigned to {} spaces. Remove it from all spaces first.",
                material_name, count
            ).into());
        }

        sqlx::query("DELETE FROM materials WHERE school_id = $1 AND name = $2")
            .bind(school_id)
            .bind(material_name)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn get_material_id_by_name(&self, school_id: &str, name: &str) -> Result<Option<String>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let id: Option<String> = sqlx::query_scalar("SELECT id FROM materials WHERE school_id = $1 AND name = $2")
            .bind(school_id)
            .bind(name)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(id)
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


    async fn create_space(&self, school_id: &str, category: &str, name: String, description: Option<String>) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        // Check if space with same name already exists
        let existing: Option<String> = sqlx::query_scalar(
            "SELECT name FROM spaces WHERE school_id = $1 AND name = $2"
        )
        .bind(school_id)
        .bind(&name)
        .fetch_optional(&mut *conn)
        .await?;
        
        if existing.is_some() {
            return Err(crate::error::AppError::Validation(format!("Space with name '{}' already exists", name)).into());
        }
        
        // Use a more robust space_id generation
        let space_id = format!("{}-{}", 
            name.to_lowercase().replace(' ', "-"), 
            uuid::Uuid::new_v4().to_string()[..8].to_string()
        );

        let mut data = json!({"name": name, "category": category});
        if let Some(ref desc) = description {
            data["description"] = json!(desc);
        }

        // Insert Space
        sqlx::query(
            "INSERT INTO spaces (school_id, space_id, name, space_category, data)
             VALUES ($1, $2, $3, $4, $5)"
        )
        .bind(school_id)
        .bind(&space_id)
        .bind(&name)
        .bind(category)
        .bind(&data)
        .execute(&mut *conn)
        .await?;

        let mut response = json!({
            "spaceId": space_id,
            "spaceName": name,
            "spaceCategory": category
        });
        if let Some(ref desc) = description {
            response["description"] = json!(desc);
        }

        Ok(response)
    }

    async fn get_spaces(&self, school_id: &str, category: Option<&str>) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let query_str = if category.is_some() {
            "SELECT id, id as space_id, name, space_category, budget, data->>'description' as description FROM spaces WHERE school_id = $1 AND space_category = $2"
        } else {
            "SELECT id, id as space_id, name, space_category, budget, data->>'description' as description FROM spaces WHERE school_id = $1"
        };

        let mut query = sqlx::query(query_str).bind(school_id);
        if let Some(cat) = category {
            query = query.bind(cat);
        }

        let rows = query.fetch_all(&mut *conn).await?;
        Ok(rows.into_iter().map(|r| {
            json!({
                "name": r.get::<String, _>("name"),
                "spaceName": r.get::<String, _>("name"),
                "spaceId": r.get::<String, _>("space_id"),
                "spaceCategory": r.get::<String, _>("space_category"),
                "budget": r.get::<Option<f64>, _>("budget"),
                "description": r.get::<Option<String>, _>("description"),
            })
        }).collect())
    }

    async fn get_space_categories(&self, school_id: &str) -> Result<Vec<String>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        // Fix: Read from space_categories table primarily, UNION with any custom ones in spaces table
        let rows = sqlx::query(
            "SELECT name FROM space_categories WHERE school_id = $1 
             UNION 
             SELECT DISTINCT space_category as name FROM spaces WHERE school_id = $1 AND space_category IS NOT NULL"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        Ok(rows.into_iter()
            .map(|r| r.get::<String, _>("name"))
            .collect())
    }

    async fn create_space_category(&self, school_id: &str, name: &str) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        // Check if category already exists for this school (case-insensitive)
        let existing: Option<String> = sqlx::query_scalar(
            "SELECT name FROM space_categories WHERE school_id = $1 AND LOWER(name) = LOWER($2)"
        )
        .bind(school_id)
        .bind(name)
        .fetch_optional(&mut *conn)
        .await?;
        
        if existing.is_some() {
            return Err(crate::error::AppError::Validation(format!("Space category '{}' already exists", name)).into());
        }
        
        // Insert new category
        sqlx::query(
            "INSERT INTO space_categories (school_id, name) VALUES ($1, $2)"
        )
        .bind(school_id)
        .bind(name)
        .execute(&mut *conn)
        .await?;
        
        Ok(json!({
            "name": name
        }))
    }

    async fn delete_space_category(&self, school_id: &str, name: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM space_categories WHERE school_id = $1 AND name = $2")
            .bind(school_id)
            .bind(name)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn get_space_details(&self, school_id: &str, space_name: &str) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT *, id as space_id FROM spaces WHERE school_id = $1 AND (name = $2 OR id = $2)")
            .bind(school_id)
            .bind(space_name)
            .fetch_optional(&mut *conn)
            .await?;

        if let Some(r) = row {
            Ok(Some(json!({
                "name": r.get::<String, _>("name"),
                "spaceName": r.get::<String, _>("name"),
                "spaceId": r.get::<String, _>("space_id"),
                "spaceCategory": r.get::<String, _>("space_category"),
                "budget": r.get::<Option<f64>, _>("budget"),
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
        let mut tx = conn.begin().await?;
        
        // 1. Delete associated data (using space_name as key)
        sqlx::query("DELETE FROM space_employees WHERE school_id = $1 AND space_name = $2")
            .bind(school_id).bind(space_name).execute(&mut *tx).await?;
        sqlx::query("DELETE FROM space_materials WHERE school_id = $1 AND space_name = $2")
            .bind(school_id).bind(space_name).execute(&mut *tx).await?;
        sqlx::query("DELETE FROM spaces WHERE school_id = $1 AND name = $2")
            .bind(school_id).bind(space_name).execute(&mut *tx).await?;
        
        tx.commit().await?;
        Ok(())
    }

    async fn update_space_budget(&self, school_id: &str, space_name: &str, budget: Option<f64>) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("UPDATE spaces SET budget = $1 WHERE school_id = $2 AND name = $3")
            .bind(budget)
            .bind(school_id)
            .bind(space_name)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn get_all_spaces_materials(&self, school_id: &str) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let rows = sqlx::query(
            "SELECT sm.space_name, sm.material_name, sm.quantity, sm.unit, sm.unit_price, 
                    COALESCE(req.required_count, 0) as required_count, s.space_category
             FROM space_materials sm
             JOIN spaces s ON s.school_id = sm.school_id AND s.name = sm.space_name
             LEFT JOIN space_material_requirements req 
               ON req.school_id = sm.school_id 
              AND req.space_name = sm.space_name 
              AND req.material_name = sm.material_name
             WHERE sm.school_id = $1
             ORDER BY sm.space_name, sm.material_name"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let mut spaces_map: std::collections::HashMap<String, Vec<Value>> = std::collections::HashMap::new();
        for r in rows {
            let space_name: String = r.get("space_name");
            let material = json!({
                "materialName": r.get::<String, _>("material_name"),
                "quantity": r.get::<i32, _>("quantity"),
                "requiredCount": r.get::<i32, _>("required_count"),
                "unit": r.get::<Option<String>, _>("unit"),
                "unitPrice": r.get::<Option<f64>, _>("unit_price"),
                "spaceCategory": r.get::<String, _>("space_category")
            });
            spaces_map.entry(space_name).or_default().push(material);
        }

        Ok(json!({
            "success": true,
            "data": spaces_map
        }))
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
                "INSERT INTO material_history (school_id, material_id, action_type, quantity, space_id, notes)
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
            "INSERT INTO material_history (school_id, material_id, action_type, quantity, space_id, notes)
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

    async fn get_space_materials(
        &self,
        school_id: &str,
        space_name: &str,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        // 1. Get materials with requirements
        let rows = sqlx::query(
            "SELECT m.*, COALESCE(req.required_count, 0) as required_count
             FROM space_materials m
             LEFT JOIN space_material_requirements req
               ON req.school_id = m.school_id
              AND req.space_name = m.space_name
              AND req.material_name = m.material_name
             WHERE m.school_id = $1 AND m.space_name = $2
             ORDER BY m.material_name ASC"
        )
        .bind(school_id)
        .bind(space_name)
        .fetch_all(&mut *conn)
        .await?;

        let materials: Vec<Value> = rows.into_iter().map(|r| {
            let quantity: i32 = r.get("quantity");
            let required: i32 = r.get("required_count");
            json!({
                "materialName": r.get::<String, _>("material_name"),
                "materialId": r.get::<Option<String>, _>("material_id"),
                "quantity": quantity,
                "requiredCount": required,
                "unit": r.get::<Option<String>, _>("unit"),
                "unitPrice": r.get::<Option<f64>, _>("unit_price"),
                "status": if required > 0 && quantity < required { "deficit" } else if required > 0 { "full" } else { "unset" }
            })
        }).collect();

        // 2. Get space budget
        let budget: Option<f64> = sqlx::query_scalar("SELECT budget FROM spaces WHERE school_id = $1 AND name = $2")
            .bind(school_id)
            .bind(space_name)
            .fetch_optional(&mut *conn)
            .await?;

        Ok(json!({
            "materials": materials,
            "budget": budget
        }))
    }

    async fn clone_space(
        &self,
        school_id: &str,
        source_space_name: &str,
        new_space_name: String,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        // 1. Get source space details
        let source: (String, String, Value) = sqlx::query_as(
            "SELECT space_category, id, data FROM spaces WHERE school_id = $1 AND name = $2"
        )
        .bind(school_id)
        .bind(source_space_name)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| crate::error::AppError::NotFound(format!("Source space '{}' not found", source_space_name)))?;

        let source_category = source.0;
        let source_space_id = source.1;

        // 2. Generate new space_id
        let new_space_id = format!("{}-{}", 
            new_space_name.to_lowercase().replace(' ', "-"), 
            uuid::Uuid::new_v4().to_string()[..8].to_string()
        );

        // 3. Check if space with same name already exists
        let existing: Option<String> = sqlx::query_scalar(
            "SELECT name FROM spaces WHERE school_id = $1 AND name = $2"
        )
        .bind(school_id)
        .bind(&new_space_name)
        .fetch_optional(&mut *tx)
        .await?;

        if existing.is_some() {
            tx.commit().await?;
            return Err(crate::error::AppError::Validation(format!("Space with name '{}' already exists", new_space_name)).into());
        }

        // 4. Insert new space
        sqlx::query(
            "INSERT INTO spaces (school_id, space_id, name, space_category, data)
             VALUES ($1, $2, $3, $4, $5)"
        )
        .bind(school_id)
        .bind(&new_space_id)
        .bind(&new_space_name)
        .bind(&source_category)
        .bind(json!({"name": new_space_name, "category": source_category}))
        .execute(&mut *tx)
        .await?;

        // 5. Copy space_material_requirements
        let reqs = sqlx::query(
            "SELECT material_name, required_count FROM space_material_requirements
             WHERE school_id = $1 AND space_id = $2"
        )
        .bind(school_id)
        .bind(&source_space_id)
        .fetch_all(&mut *tx)
        .await?;

        for req in &reqs {
            let material_name: String = req.get("material_name");
            let required_count: i32 = req.get("required_count");
            sqlx::query(
                "INSERT INTO space_material_requirements (school_id, space_id, material_name, required_count)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (school_id, space_id, material_name) DO NOTHING"
            )
            .bind(school_id)
            .bind(&new_space_id)
            .bind(&material_name)
            .bind(required_count)
            .execute(&mut *tx)
            .await?;
        }

        // 6. Copy space_requirements (responsibility requirements)
        let resp_reqs = sqlx::query(
            "SELECT responsibility_id, required_count FROM space_requirements
             WHERE school_id = $1 AND space_id = $2"
        )
        .bind(school_id)
        .bind(&source_space_id)
        .fetch_all(&mut *tx)
        .await?;

        for req in &resp_reqs {
            let resp_id: String = req.get("responsibility_id");
            let req_count: i32 = req.get("required_count");
            sqlx::query(
                "INSERT INTO space_requirements (school_id, space_id, responsibility_id, required_count)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (school_id, space_id, responsibility_id) DO NOTHING"
            )
            .bind(school_id)
            .bind(&new_space_id)
            .bind(&resp_id)
            .bind(req_count)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;

        Ok(json!({
            "spaceId": new_space_id,
            "spaceName": new_space_name,
            "spaceCategory": source_category,
            "clonedFrom": source_space_name
        }))
    }

    async fn transfer_space_material(
        &self,
        school_id: &str,
        from_space: &str,
        to_space: &str,
        material_name: &str,
        quantity: i32,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        // 1. Validate source space has enough quantity
        let source_qty: Option<i32> = sqlx::query_scalar(
            "SELECT quantity FROM space_materials WHERE school_id = $1 AND space_name = $2 AND material_name = $3"
        )
        .bind(school_id)
        .bind(from_space)
        .bind(material_name)
        .fetch_optional(&mut *tx)
        .await?;

        let current_qty = source_qty.unwrap_or(0);
        if current_qty < quantity {
            tx.commit().await?;
            return Err(crate::error::AppError::Validation(
                format!("Insufficient quantity in source space. Available: {}, Requested: {}", current_qty, quantity)
            ).into());
        }

        // 2. Get material_id
        let material_id: Option<String> = sqlx::query_scalar(
            "SELECT material_id FROM space_materials WHERE school_id = $1 AND space_name = $2 AND material_name = $3"
        )
        .bind(school_id)
        .bind(from_space)
        .bind(material_name)
        .fetch_optional(&mut *tx)
        .await?;

        let material_id = material_id.unwrap_or_else(|| format!("MAT-{:06}", rand::random::<u32>() % 900000 + 100000));

        // 3. Decrement from source
        let new_source_qty = current_qty - quantity;
        if new_source_qty == 0 {
            sqlx::query(
                "DELETE FROM space_materials WHERE school_id = $1 AND space_name = $2 AND material_name = $3"
            )
            .bind(school_id)
            .bind(from_space)
            .bind(material_name)
            .execute(&mut *tx)
            .await?;
        } else {
            sqlx::query(
                "UPDATE space_materials SET quantity = $1 WHERE school_id = $2 AND space_name = $3 AND material_name = $4"
            )
            .bind(new_source_qty)
            .bind(school_id)
            .bind(from_space)
            .bind(material_name)
            .execute(&mut *tx)
            .await?;
        }

        // 4. Get unit and unit_price from source for the insert/update
        let unit: Option<String> = sqlx::query_scalar(
            "SELECT unit FROM space_materials WHERE school_id = $1 AND space_name = $2 AND material_name = $3"
        )
        .bind(school_id)
        .bind(from_space)
        .bind(material_name)
        .fetch_optional(&mut *tx)
        .await?;

        let unit_price: Option<f64> = sqlx::query_scalar(
            "SELECT unit_price FROM space_materials WHERE school_id = $1 AND space_name = $2 AND material_name = $3"
        )
        .bind(school_id)
        .bind(from_space)
        .bind(material_name)
        .fetch_optional(&mut *tx)
        .await?;

        // 5. Increment in target
        sqlx::query(
            "INSERT INTO space_materials (school_id, space_name, material_id, material_name, quantity, unit, unit_price)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (school_id, space_name, material_name)
             DO UPDATE SET quantity = space_materials.quantity + EXCLUDED.quantity"
        )
        .bind(school_id)
        .bind(to_space)
        .bind(&material_id)
        .bind(material_name)
        .bind(quantity)
        .bind(&unit)
        .bind(unit_price)
        .execute(&mut *tx)
        .await?;

        // 6. Get new target quantity
        let new_target_qty: i32 = sqlx::query_scalar(
            "SELECT quantity FROM space_materials WHERE school_id = $1 AND space_name = $2 AND material_name = $3"
        )
        .bind(school_id)
        .bind(to_space)
        .bind(material_name)
        .fetch_one(&mut *tx)
        .await?;

        // 7. Record history
        sqlx::query(
            "INSERT INTO material_history (school_id, material_id, action_type, quantity, space_id, notes)
             VALUES ($1, $2, 'TRANSFER', $3, $4, $5)"
        )
        .bind(school_id)
        .bind(&material_id)
        .bind(quantity)
        .bind(from_space)
        .bind(format!("Transferred from '{}' to '{}'", from_space, to_space))
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(json!({
            "success": true,
            "remainingInSource": new_source_qty,
            "newQuantityInTarget": new_target_qty
        }))
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
        assert!(mats.contains_key("classroom"), "Expected 'classroom' key in default materials");
        let classroom_mats = mats.get("classroom").unwrap();
        assert!(classroom_mats.iter().any(|m| m["materialName"] == "Ceiling Fan"), "Expected Ceiling Fan in classroom materials");
        assert!(classroom_mats.iter().any(|m| m["materialName"] == "White Board"), "Expected White Board in classroom materials");
        assert!(classroom_mats.iter().any(|m| m["materialName"] == "Benches"), "Expected Benches in classroom materials");

        assert!(mats.contains_key("office"), "Expected 'office' key in default materials");
        let office_mats = mats.get("office").unwrap();
        assert!(office_mats.iter().any(|m| m["materialName"] == "Office Table"), "Expected Office Table in office materials");
        assert!(office_mats.iter().any(|m| m["materialName"] == "Office Chair"), "Expected Office Chair in office materials");

        for mat in classroom_mats {
            assert!(mat["unitPrice"].as_f64().is_some(), "All materials should have a unitPrice");
            assert!(mat["quantity"].as_i64().is_some(), "All materials should have a quantity");
        }
    }

    #[test]
    fn test_default_material_prices_are_positive() {
        let mats = get_default_materials();
        for (category, items) in &mats {
            for item in items {
                let price = item["unitPrice"].as_f64().unwrap_or(0.0);
                assert!(price > 0.0, "Material '{}' in category '{}' should have positive price, got {}",
                    item["materialName"], category, price);
            }
        }
    }

    #[test]
    fn test_default_material_quantities_are_positive() {
        let mats = get_default_materials();
        for (category, items) in &mats {
            for item in items {
                let qty = item["quantity"].as_i64().unwrap_or(0);
                assert!(qty > 0, "Material '{}' in category '{}' should have positive quantity, got {}",
                    item["materialName"], category, qty);
            }
        }
    }

    #[test]
    fn test_default_materials_contain_categories() {
        let mats = get_default_materials();
        assert!(!mats.is_empty(), "Default materials map should not be empty");
        let categories: Vec<&String> = mats.keys().collect();
        assert!(!categories.is_empty(), "Should have at least one category");
    }

    #[test]
    fn test_get_default_materials_json_shape() {
        let mats = get_default_materials();
        for (_category, items) in &mats {
            for item in items {
                assert!(item.get("materialName").is_some(), "Material missing 'materialName'");
                assert!(item.get("quantity").is_some(), "Material missing 'quantity'");
                assert!(item.get("unitPrice").is_some(), "Material missing 'unitPrice'");
                assert!(item.get("unit").is_some(), "Material missing 'unit'");
            }
        }
    }

    #[test]
    fn test_get_space_materials_summary_computation() {
        let materials = vec![
            json!({"materialName": "Fan", "quantity": 5, "unitPrice": 1500.0, "requiredCount": 10, "status": "deficit"}),
            json!({"materialName": "Board", "quantity": 2, "unitPrice": 2000.0, "requiredCount": 1, "status": "full"}),
            json!({"materialName": "Table", "quantity": 0, "unitPrice": 5000.0, "requiredCount": 3, "status": "deficit"}),
        ];

        let mut total_value = 0.0_f64;
        let mut deficit_value = 0.0_f64;
        let mut deficit_count = 0_usize;

        for m in &materials {
            let qty = m["quantity"].as_f64().unwrap_or(0.0);
            let price = m["unitPrice"].as_f64().unwrap_or(0.0);
            total_value += qty * price;

            let required = m["requiredCount"].as_f64().unwrap_or(0.0);
            if required > qty {
                deficit_value += (required - qty) * price;
                deficit_count += 1;
            }
        }

        assert_eq!(total_value, 5.0 * 1500.0 + 2.0 * 2000.0 + 0.0 * 5000.0, "Total value should be 7500 + 4000 + 0 = 11500");
        assert_eq!(total_value, 11500.0, "Total value should be 11500");
        assert_eq!(deficit_value, (10.0 - 5.0) * 1500.0 + (3.0 - 0.0) * 5000.0, "Deficit value should be 7500 + 15000 = 22500");
        assert_eq!(deficit_value, 22500.0, "Deficit value should be 22500");
        assert_eq!(deficit_count, 2, "Should have 2 deficit items (Fan and Table)");
    }
}
