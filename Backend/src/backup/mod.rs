use sqlx::{PgPool, Row, Column, TypeInfo};
use serde_json::{Value, json, Map};
use std::fs;
use std::error::Error;
use std::time::Duration;
use tokio::time::sleep;
use chrono::{Utc, Local, DateTime, NaiveDate};
use bigdecimal::BigDecimal;

pub struct BackupService {
    pool: PgPool,
    backup_dir: String,
}

impl BackupService {
    pub fn new(pool: PgPool, backup_dir: &str) -> Self {
        fs::create_dir_all(backup_dir).unwrap_or_default();
        Self {
            pool,
            backup_dir: backup_dir.to_string(),
        }
    }

    pub async fn run_auto_backup(&self) {
        loop {
            sleep(Duration::from_secs(15 * 60)).await;
            println!("[Backup] Starting automatic 15-minute backup...");
            if let Err(e) = self.perform_backup().await {
                eprintln!("[Backup Error] {}", e);
            } else {
                println!("[Backup] Auto-backup completed successfully at {}", Local::now().format("%Y-%m-%d %H:%M:%S"));
            }
        }
    }

    pub async fn perform_backup(&self) -> Result<(), Box<dyn Error + Send + Sync>> {
        let tables = vec![
            "super_admin", "schools", "auth", "students", "employees", 
            "classes", "subjects", "chapters", "academic_components", 
            "exams", "attendance", "awards", "tasks", "announcements", 
            "complaints", "responsibilities", "employee_responsibilities", 
            "spaces", "events", "materials", "reminders", "fees", "promo_codes",
            "school_promo_codes", "billing_ledger", "countries", "states", "districts"
        ];

        for table in tables {
            if let Err(e) = self.backup_table(table).await {
                eprintln!("[Backup Table Error] {}: {}", table, e);
            }
        }

        let metadata = json!({
            "last_backup": Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            "status": "success"
        });
        fs::write(format!("{}/metadata.json", self.backup_dir), metadata.to_string())?;

        Ok(())
    }

    async fn backup_table(&self, table_name: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        let query = format!("SELECT * FROM {}", table_name);
        
        let rows = match sqlx::query(&query).fetch_all(&self.pool).await {
            Ok(r) => r,
            Err(_) => return Ok(()),
        };
        
        let mut data = Vec::new();
        for row in rows {
            let mut map = Map::new();
            for column in row.columns() {
                let name = column.name();
                let type_info = column.type_info();
                let type_name = type_info.name().to_uppercase();
                
                let val: Value = match type_name.as_str() {
                    "VARCHAR" | "TEXT" | "BPCHAR" | "NAME" => {
                        row.try_get::<String, _>(name).map(|v| json!(v)).unwrap_or(Value::Null)
                    }
                    "INT4" | "SERIAL" | "INTEGER" => {
                        row.try_get::<i32, _>(name).map(|v| json!(v)).unwrap_or(Value::Null)
                    }
                    "INT8" | "BIGSERIAL" | "BIGINT" => {
                        row.try_get::<i64, _>(name).map(|v| json!(v)).unwrap_or(Value::Null)
                    }
                    "BOOL" | "BOOLEAN" => {
                        row.try_get::<bool, _>(name).map(|v| json!(v)).unwrap_or(Value::Null)
                    }
                    "FLOAT8" => {
                        row.try_get::<f64, _>(name).map(|v| json!(v)).unwrap_or(Value::Null)
                    }
                    "NUMERIC" | "DECIMAL" => {
                        row.try_get::<BigDecimal, _>(name).map(|v| json!(v.to_string())).unwrap_or(Value::Null)
                    }
                    "TIMESTAMPTZ" | "TIMESTAMP WITH TIME ZONE" | "TIMESTAMP" => {
                        row.try_get::<DateTime<Utc>, _>(name).map(|v| json!(v.to_rfc3339())).unwrap_or(Value::Null)
                    }
                    "DATE" => {
                        row.try_get::<NaiveDate, _>(name).map(|v| json!(v.to_string())).unwrap_or(Value::Null)
                    }
                    "JSONB" | "JSON" => {
                        row.try_get::<Value, _>(name).unwrap_or(Value::Null)
                    }
                    _ => {
                        if let Ok(v) = row.try_get::<String, _>(name) { json!(v) }
                        else if let Ok(v) = row.try_get::<i32, _>(name) { json!(v) }
                        else { Value::Null }
                    }
                };
                map.insert(name.to_string(), val);
            }
            data.push(Value::Object(map));
        }

        let content = serde_json::to_string_pretty(&data)?;
        fs::write(format!("{}/{}.json", self.backup_dir, table_name), content)?;
        
        Ok(())
    }

    pub async fn auto_restore(&self) -> Result<bool, Box<dyn Error + Send + Sync>> {
        // Restore essential geo data from single geo.json backup
        let geo_file_path = format!("{}/geo.json", self.backup_dir);
        if let Ok(content) = fs::read_to_string(&geo_file_path) {
            if let Ok(countries) = serde_json::from_str::<Vec<Value>>(&content) {
                println!("[Restore] Found geo.json with {} countries. Syncing to DB...", countries.len());
                for country in countries {
                    if let (Some(name), Some(code), Some(phone_code)) = (
                        country.get("name").and_then(|v| v.as_str()),
                        country.get("code").and_then(|v| v.as_str()),
                        country.get("phone_code").and_then(|v| v.as_str()),
                    ) {
                        // 1. Insert/Update Country
                        let country_row: (i32,) = sqlx::query_as(
                            "INSERT INTO countries (name, code, phone_code) 
                             VALUES ($1, $2, $3) 
                             ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code, phone_code = EXCLUDED.phone_code 
                             RETURNING id"
                        )
                        .bind(name)
                        .bind(code)
                        .bind(phone_code)
                        .fetch_one(&self.pool)
                        .await?;
                        
                        let country_id = country_row.0;

                        // 2. Insert States
                        if let Some(states) = country.get("states").and_then(|v| v.as_array()) {
                            for state in states {
                                if let Some(state_name) = state.get("name").and_then(|v| v.as_str()) {
                                    let state_row: (i32,) = sqlx::query_as(
                                        "INSERT INTO states (country_id, name) 
                                         VALUES ($1, $2) 
                                         ON CONFLICT (country_id, name) DO UPDATE SET name = EXCLUDED.name 
                                         RETURNING id"
                                    )
                                    .bind(country_id)
                                    .bind(state_name)
                                    .fetch_one(&self.pool)
                                    .await?;
                                    
                                    let state_id = state_row.0;

                                    // 3. Insert Districts
                                    if let Some(districts) = state.get("districts").and_then(|v| v.as_array()) {
                                        for district in districts {
                                            if let Some(district_name) = district.as_str() {
                                                sqlx::query(
                                                    "INSERT INTO districts (state_id, name) 
                                                     VALUES ($1, $2) 
                                                     ON CONFLICT (state_id, name) DO NOTHING"
                                                )
                                                .bind(state_id)
                                                .bind(district_name)
                                                .execute(&self.pool)
                                                .await?;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Safety: update sequences to highest ID
        let _ = sqlx::query("SELECT setval('countries_id_seq', COALESCE((SELECT MAX(id)+1 FROM countries), 1), false)").execute(&self.pool).await;
        let _ = sqlx::query("SELECT setval('states_id_seq', COALESCE((SELECT MAX(id)+1 FROM states), 1), false)").execute(&self.pool).await;
        let _ = sqlx::query("SELECT setval('districts_id_seq', COALESCE((SELECT MAX(id)+1 FROM districts), 1), false)").execute(&self.pool).await;

        Ok(true)
    }
}
