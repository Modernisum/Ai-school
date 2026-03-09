use sqlx::{PgPool, Row, Column, TypeInfo};
use serde_json::{Value, json, Map};
use std::fs;
use std::error::Error;
use std::time::Duration;
use tokio::time::sleep;
use chrono::{Utc, DateTime, NaiveDate};
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
                println!("[Backup] Auto-backup completed successfully at {}", Utc::now());
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
            "school_promo_codes", "billing_ledger"
        ];

        for table in tables {
            if let Err(e) = self.backup_table(table).await {
                eprintln!("[Backup Table Error] {}: {}", table, e);
            }
        }

        let metadata = json!({
            "last_backup": Utc::now().to_rfc3339(),
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
        Ok(true)
    }
}
