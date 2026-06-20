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

        if school_count.0 > 2 {
            println!("[Restore] Database already has {} schools — skipping full restore (geo sync only)", school_count.0);
        } else {
            println!("[Restore] Empty or system-only database detected — restoring all tables from backup files...");
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

        // Fetch schema columns and their types for precise binding
        let cols: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'"
        )
        .bind(table_name)
        .fetch_all(&self.pool)
        .await
        .unwrap_or_default();

        let mut count = 0u64;
        for record in &records {
            let mut obj = match record.as_object() {
                Some(o) => o.clone(),
                None => continue,
            };
            if obj.is_empty() {
                continue;
            }

            // Custom mapping for student_history table: map snapshot to data
            if table_name == "student_history" {
                if let Some(snapshot_val) = obj.remove("snapshot") {
                    obj.insert("data".to_string(), snapshot_val);
                }
            }

            // Custom mapping for spaces table to align space_name to name
            if table_name == "spaces" {
                if let Some(space_name_val) = obj.remove("space_name") {
                    if !space_name_val.is_null() && obj.get("name").map_or(true, |v| v.is_null()) {
                        obj.insert("name".to_string(), space_name_val);
                    }
                }
            }

            // Filter out Null values entirely to avoid type errors on parameter binding
            obj.retain(|_, v| !v.is_null());

            if obj.is_empty() {
                continue;
            }

            let col_keys: Vec<String> = obj.keys().map(|k| k.clone()).collect();
            let columns: Vec<&str> = col_keys.iter().map(|k| k.as_str()).collect();
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

                let pg_type = cols.iter()
                    .find(|(name, _)| name.eq_ignore_ascii_case(*col))
                    .map(|(_, ty)| ty.as_str())
                    .unwrap_or("");

                if pg_type.is_empty() {
                    query = match &val {
                        Value::Null => query.bind(Option::<String>::None),
                        Value::String(s) => {
                            if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
                                query.bind(dt.with_timezone(&Utc))
                            } else if let Ok(d) = NaiveDate::parse_from_str(s, "%Y-%m-%d") {
                                query.bind(d)
                            } else if s.eq_ignore_ascii_case("true") {
                                query.bind(true)
                            } else if s.eq_ignore_ascii_case("false") {
                                query.bind(false)
                            } else {
                                // Try parsing as number
                                let is_numeric = s.chars().all(|c| c.is_ascii_digit() || c == '.' || c == '-');
                                let has_leading_zero = s.starts_with('0') && s.len() > 1 && !s.starts_with("0.");
                                if is_numeric && !has_leading_zero && !s.is_empty() {
                                    if let Ok(i) = s.parse::<i64>() {
                                        query.bind(i)
                                    } else if let Ok(f) = s.parse::<f64>() {
                                        query.bind(f)
                                    } else {
                                        query.bind(s.clone())
                                    }
                                } else {
                                    query.bind(s.clone())
                                }
                            }
                        }
                        Value::Number(n) => {
                            if let Some(i) = n.as_i64() { 
                                query.bind(i) 
                            } else if let Some(f) = n.as_f64() {
                                query.bind(f)
                            } else {
                                query.bind(n.to_string())
                            }
                        }
                        Value::Bool(b) => query.bind(*b),
                        Value::Object(_) | Value::Array(_) => query.bind(sqlx::types::Json(val.clone())),
                        _ => query.bind(val.to_string()),
                    };
                } else {
                    query = match pg_type {
                        "integer" | "bigint" | "smallint" => {
                            match &val {
                                Value::Number(n) => {
                                    if let Some(i) = n.as_i64() {
                                        query.bind(i)
                                    } else {
                                        query.bind(Option::<i64>::None)
                                    }
                                }
                                Value::String(s) => {
                                    if let Ok(i) = s.parse::<i64>() {
                                        query.bind(i)
                                    } else {
                                        query.bind(Option::<i64>::None)
                                    }
                                }
                                _ => query.bind(Option::<i64>::None),
                            }
                        }
                        "numeric" | "decimal" | "double precision" | "real" => {
                            match &val {
                                Value::Number(n) => {
                                    if let Some(f) = n.as_f64() {
                                        query.bind(f)
                                    } else {
                                        query.bind(Option::<f64>::None)
                                    }
                                }
                                Value::String(s) => {
                                    if let Ok(f) = s.parse::<f64>() {
                                        query.bind(f)
                                    } else {
                                        query.bind(Option::<f64>::None)
                                    }
                                }
                                _ => query.bind(Option::<f64>::None),
                            }
                        }
                        "boolean" => {
                            match &val {
                                Value::Bool(b) => query.bind(*b),
                                Value::String(s) => {
                                    if s.eq_ignore_ascii_case("true") || s == "1" {
                                        query.bind(true)
                                    } else {
                                        query.bind(false)
                                    }
                                }
                                Value::Number(n) => {
                                    query.bind(n.as_i64().unwrap_or(0) != 0)
                                }
                                _ => query.bind(false),
                            }
                        }
                        "timestamp with time zone" | "timestamp without time zone" => {
                            match &val {
                                Value::String(s) => {
                                    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
                                        query.bind(dt.with_timezone(&Utc))
                                    } else if let Ok(d) = NaiveDate::parse_from_str(s, "%Y-%m-%d") {
                                        let dt = d.and_hms_opt(0, 0, 0).unwrap();
                                        query.bind(DateTime::<Utc>::from_naive_utc_and_offset(dt, Utc))
                                    } else {
                                        query.bind(Option::<DateTime<Utc>>::None)
                                    }
                                }
                                _ => query.bind(Option::<DateTime<Utc>>::None),
                            }
                        }
                        "date" => {
                            match &val {
                                Value::String(s) => {
                                    if let Ok(d) = NaiveDate::parse_from_str(s, "%Y-%m-%d") {
                                        query.bind(d)
                                    } else if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
                                        query.bind(dt.date_naive())
                                    } else {
                                        query.bind(Option::<NaiveDate>::None)
                                    }
                                }
                                _ => query.bind(Option::<NaiveDate>::None),
                            }
                        }
                        "jsonb" | "json" => {
                            query.bind(sqlx::types::Json(val.clone()))
                        }
                        _ => {
                            match &val {
                                Value::String(s) => query.bind(s.clone()),
                                Value::Null => query.bind(Option::<String>::None),
                                _ => query.bind(val.to_string()),
                            }
                        }
                    };
                }
            }

            if let Err(e) = query.execute(&self.pool).await {
                // Check if it's a conflict or a real error
                let err_msg = e.to_string();
                if !err_msg.contains("duplicate key value violates unique constraint") {
                    println!("[Restore Error] {}: {}", table_name, err_msg);
                }
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
        println!("[Restore] Updating all database serial sequences...");
        let seq_info_query = r#"
            SELECT 
                s.relname AS sequence_name,
                t.relname AS table_name,
                a.attname AS column_name
            FROM pg_class s
            JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass
            JOIN pg_class t ON t.oid = d.refobjid AND d.refclassid = 'pg_class'::regclass AND t.relkind = 'r'
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
            JOIN pg_namespace n ON n.oid = s.relnamespace
            WHERE s.relkind = 'S' AND n.nspname = 'public'
        "#;

        let seqs: Vec<(String, String, String)> = match sqlx::query_as::<_, (String, String, String)>(seq_info_query)
            .fetch_all(&self.pool)
            .await
        {
            Ok(rows) => rows,
            Err(e) => {
                eprintln!("[Restore Error] Failed to fetch sequences: {}", e);
                return;
            }
        };

        for (seq_name, table_name, col_name) in seqs {
            let val_query = format!("SELECT COALESCE(MAX({})::bigint + 1, 1) FROM {}", col_name, table_name);
            let max_val: i64 = match sqlx::query_scalar::<_, i64>(&val_query)
                .fetch_one(&self.pool)
                .await
            {
                Ok(v) => v,
                Err(e) => {
                    eprintln!("[Restore Warning] Failed to fetch MAX for {}.{}: {}", table_name, col_name, e);
                    1
                }
            };

            let setval_query = format!("SELECT setval('{}', {}, false)", seq_name, max_val);
            if let Err(e) = sqlx::query(&setval_query).execute(&self.pool).await {
                eprintln!("[Restore Warning] Failed to set sequence {} to {}: {}", seq_name, max_val, e);
            }
        }
        println!("[Restore] Sequences update complete.");
    }
}
