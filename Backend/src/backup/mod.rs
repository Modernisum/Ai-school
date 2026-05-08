use bigdecimal::BigDecimal;
use chrono::{DateTime, Local, NaiveDate, Utc};
use serde_json::{json, Map, Value};
use sqlx::{Column, PgPool, Row, TypeInfo};
use std::error::Error;
use std::fs;
use std::time::Duration;
use tokio::time::sleep;

#[allow(dead_code)]
pub struct BackupService {
    pool: PgPool,
    backup_dir: String,
    storage: Option<std::sync::Arc<crate::logic::storage_engine::StorageEngine>>,
}

impl BackupService {
    pub fn new(
        pool: PgPool,
        backup_dir: &str,
        storage: Option<std::sync::Arc<crate::logic::storage_engine::StorageEngine>>,
    ) -> Self {
        fs::create_dir_all(backup_dir).unwrap_or_default();
        Self {
            pool,
            backup_dir: backup_dir.to_string(),
            storage,
        }
    }

    pub async fn run_auto_backup(&self) {
        loop {
            sleep(Duration::from_secs(15 * 60)).await;
            println!("[Backup] Starting automatic 15-minute backup...");
            if let Err(e) = self.perform_backup().await {
                eprintln!("[Backup Error] {}", e);
            } else {
                println!(
                    "[Backup] Auto-backup completed successfully at {}",
                    Local::now().format("%Y-%m-%d %H:%M:%S")
                );
            }
        }
    }

    pub async fn perform_backup(&self) -> Result<(), Box<dyn Error + Send + Sync>> {
        let tables = vec![
            "super_admin",
            "schools",
            "auth",
            "students",
            "employees",
            "classes",
            "subjects",
            "chapters",
            "academic_components",
            "exams",
            "attendance",
            "awards",
            "tasks",
            "announcements",
            "complaints",
            "responsibilities",
            "employee_responsibilities",
            "spaces",
            "events",
            "materials",
            "reminders",
            "fees",
            "promo_codes",
            "school_promo_codes",
            "billing_ledger",
            "support_requests",
            "system_config",
            "countries",
            "states",
            "districts",
            "student_history",
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
        fs::write(
            format!("{}/metadata.json", self.backup_dir),
            metadata.to_string(),
        )?;

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
                    "VARCHAR" | "TEXT" | "BPCHAR" | "NAME" => row
                        .try_get::<String, _>(name)
                        .map(|v| json!(v))
                        .unwrap_or(Value::Null),
                    "INT4" | "SERIAL" | "INTEGER" => row
                        .try_get::<i32, _>(name)
                        .map(|v| json!(v))
                        .unwrap_or(Value::Null),
                    "INT8" | "BIGSERIAL" | "BIGINT" => row
                        .try_get::<i64, _>(name)
                        .map(|v| json!(v))
                        .unwrap_or(Value::Null),
                    "BOOL" | "BOOLEAN" => row
                        .try_get::<bool, _>(name)
                        .map(|v| json!(v))
                        .unwrap_or(Value::Null),
                    "FLOAT8" => row
                        .try_get::<f64, _>(name)
                        .map(|v| json!(v))
                        .unwrap_or(Value::Null),
                    "NUMERIC" | "DECIMAL" => row
                        .try_get::<BigDecimal, _>(name)
                        .map(|v| json!(v.to_string()))
                        .unwrap_or(Value::Null),
                    "TIMESTAMPTZ" | "TIMESTAMP WITH TIME ZONE" | "TIMESTAMP" => row
                        .try_get::<DateTime<Utc>, _>(name)
                        .map(|v| json!(v.to_rfc3339()))
                        .unwrap_or(Value::Null),
                    "DATE" => row
                        .try_get::<NaiveDate, _>(name)
                        .map(|v| json!(v.to_string()))
                        .unwrap_or(Value::Null),
                    "JSONB" | "JSON" => row.try_get::<Value, _>(name).unwrap_or(Value::Null),
                    _ => {
                        if let Ok(v) = row.try_get::<String, _>(name) {
                            json!(v)
                        } else if let Ok(v) = row.try_get::<i32, _>(name) {
                            json!(v)
                        } else {
                            Value::Null
                        }
                    }
                };
                map.insert(name.to_string(), val);
            }
            data.push(Value::Object(map));
        }

        // Skip writing empty tables to avoid clutter (empty array = 2 bytes)
        if data.is_empty() {
            return Ok(());
        }

        let content = serde_json::to_string_pretty(&data)?;
        let local_path = format!("{}/{}.json", self.backup_dir, table_name);
        fs::write(&local_path, &content)?;

        Ok(())
    }

    pub async fn auto_restore(&self) -> Result<bool, Box<dyn Error + Send + Sync>> {
        println!("[Restore] Checking for backup data to restore...");

        // Check if DB already has data (schools > 0 means we skip full restore)
        let school_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM schools")
            .fetch_one(&self.pool)
            .await
            .unwrap_or((0,));

        if school_count.0 > 0 {
            println!("[Restore] Database already has {} schools — skipping full restore (geo sync only)", school_count.0);
        } else {
            println!("[Restore] Empty database detected — restoring all tables from backup files...");
            // Restore in dependency-safe order
            let restore_order = vec![
                "super_admin",
                "system_config",
                "schools",
                "auth",
                "countries",
                "states",
                "districts",
                "students",
                "employees",
                "classes",
                "subjects",
                "chapters",
                "academic_components",
                "exams",
                "attendance",
                "awards",
                "tasks",
                "announcements",
                "complaints",
                "responsibilities",
                "employee_responsibilities",
                "spaces",
                "events",
                "materials",
                "reminders",
                "fees",
                "promo_codes",
                "school_promo_codes",
                "billing_ledger",
                "support_requests",
                "student_history",
            ];

            let mut total_restored = 0u64;
            for table in &restore_order {
                match self.restore_flat_table(table).await {
                    Ok(count) => {
                        if count > 0 {
                            println!("[Restore]   {} — {} records restored", table, count);
                            total_restored += count;
                        }
                    }
                    Err(e) => {
                        println!("[Restore]   {} — skipped ({})", table, e);
                    }
                }
            }
            println!("[Restore] Full restore complete — {} records restored across all tables", total_restored);
        }

        // Always restore geo data (handles nested geo.json separately)
        let _ = self.restore_geo_data().await;

        // Update all SERIAL sequences to match current data
        self.update_sequences().await;

        Ok(true)
    }

    async fn restore_flat_table(&self, table_name: &str) -> Result<u64, Box<dyn Error + Send + Sync>> {
        let path = format!("{}/{}.json", self.backup_dir, table_name);
        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => return Ok(0),
        };

        let records: Vec<Value> = match serde_json::from_str(&content) {
            Ok(r) => r,
            Err(e) => {
                println!("[Restore]   {} — parse error: {}", table_name, e);
                return Ok(0);
            }
        };

        if records.is_empty() {
            return Ok(0);
        }

        let mut count = 0u64;
        for record in &records {
            let obj = match record.as_object() {
                Some(o) => o,
                None => continue,
            };
            if obj.is_empty() {
                continue;
            }

            let columns: Vec<&str> = obj.keys().map(|k| k.as_str()).collect();
            let placeholders: Vec<String> = (1..=columns.len()).map(|i| format!("${}", i)).collect();

            let sql = format!(
                "INSERT INTO {} ({}) VALUES ({}) ON CONFLICT DO NOTHING",
                table_name,
                columns.join(", "),
                placeholders.join(", ")
            );

            let mut query = sqlx::query(&sql);
            for col in &columns {
                let val = obj.get(*col).cloned().unwrap_or(Value::Null);
                query = match &val {
                    Value::Null => query.bind(Option::<String>::None),
                    Value::String(s) => query.bind(s.clone()),
                    Value::Number(n) => {
                        if let Some(i) = n.as_i64() { query.bind(i) }
                        else if let Some(f) = n.as_f64() { query.bind(format!("{}", f)) }
                        else { query.bind(n.to_string()) }
                    }
                    Value::Bool(b) => query.bind(*b),
                    _ => query.bind(val.to_string()),
                };
            }

            if let Err(e) = query.execute(&self.pool).await {
                // Silently skip individual row conflicts
                let _ = e;
            } else {
                count += 1;
            }
        }

        Ok(count)
    }

    async fn restore_geo_data(&self) -> Result<(), Box<dyn Error + Send + Sync>> {
        let local_geo_path = format!("{}/geo.json", self.backup_dir);
        let content = match fs::read_to_string(&local_geo_path) {
            Ok(c) => c,
            Err(_) => return Ok(()),
        };

        let countries: Vec<Value> = match serde_json::from_str(&content) {
            Ok(c) => c,
            Err(_) => return Ok(()),
        };

        println!("[Restore] Syncing geo.json — {} countries...", countries.len());

        for country in countries {
            if let (Some(name), Some(code), Some(phone_code)) = (
                country.get("name").and_then(|v| v.as_str()),
                country.get("code").and_then(|v| v.as_str()),
                country.get("phone_code").and_then(|v| v.as_str()),
            ) {
                let country_row: (i32,) = sqlx::query_as(
                    "INSERT INTO countries (name, code, phone_code)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code, phone_code = EXCLUDED.phone_code
                     RETURNING id",
                )
                .bind(name)
                .bind(code)
                .bind(phone_code)
                .fetch_one(&self.pool)
                .await?;

                let country_id = country_row.0;

                if let Some(states) = country.get("states").and_then(|v| v.as_array()) {
                    for state in states {
                        if let Some(state_name) = state.get("name").and_then(|v| v.as_str()) {
                            let state_row: (i32,) = sqlx::query_as(
                                "INSERT INTO states (country_id, name)
                                 VALUES ($1, $2)
                                 ON CONFLICT (country_id, name) DO UPDATE SET name = EXCLUDED.name
                                 RETURNING id",
                            )
                            .bind(country_id)
                            .bind(state_name)
                            .fetch_one(&self.pool)
                            .await?;

                            let state_id = state_row.0;

                            if let Some(districts) = state.get("districts").and_then(|v| v.as_array())
                            {
                                for district in districts {
                                    if let Some(district_name) = district.as_str() {
                                        sqlx::query(
                                            "INSERT INTO districts (state_id, name)
                                             VALUES ($1, $2)
                                             ON CONFLICT (state_id, name) DO NOTHING",
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

        Ok(())
    }

    async fn update_sequences(&self) {
        let ser_tables = vec![
            "countries", "states", "districts", "super_admin",
            "promo_codes", "support_requests",
        ];
        for t in ser_tables {
            let sql = format!(
                "SELECT setval('{}_id_seq', COALESCE((SELECT MAX(id)+1 FROM {}), 1), false)",
                t, t
            );
            let _ = sqlx::query(&sql).execute(&self.pool).await;
        }
    }
}
