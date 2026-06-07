use crate::db::DbClient;
use crate::repository::traits::AppError;
use sqlx::{Postgres, Transaction, Connection, Row, Column, TypeInfo};
use std::sync::Arc;
use serde_json::{json, Value, Map};

#[allow(dead_code)]
pub struct PostgresBaseRepository {
    pub client: Arc<DbClient>,
}

#[allow(dead_code)]
impl PostgresBaseRepository {
    pub fn new(client: Arc<DbClient>) -> Self {
        Self { client }
    }

    pub async fn with_tenant_tx<F, T>(&self, school_id: &str, f: F) -> Result<T, AppError>
    where
        F: for<'c> FnOnce(&'c mut Transaction<'_, Postgres>) -> futures_util::future::BoxFuture<'c, Result<T, AppError>>,
    {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;
        let result = f(&mut tx).await;
        if result.is_ok() {
            tx.commit().await?;
        }
        result
    }

    pub async fn insert_row(
        &self,
        school_id: &str,
        table: &str,
        data: Value,
    ) -> Result<Value, AppError> {
        let obj = data.as_object().ok_or_else(|| {
            Box::new(crate::error::AppError::Validation("Insert data must be a JSON object".to_string()))
        })?;

        let mut query = sqlx::QueryBuilder::<Postgres>::new("INSERT INTO ");
        query.push(table);
        query.push(" (school_id");

        for key in obj.keys() {
            query.push(", ");
            query.push(key);
        }

        query.push(") VALUES (");
        query.push_bind(school_id.to_string());

        for val in obj.values() {
            query.push(", ");
            Self::bind_val(&mut query, val);
        }

        query.push(") RETURNING *");

        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = query.build().fetch_one(&mut *conn).await?;
        Self::row_to_json(&row)
    }

    pub async fn select_all(
        &self,
        school_id: &str,
        table: &str,
    ) -> Result<Vec<Value>, AppError> {
        let mut query = sqlx::QueryBuilder::<Postgres>::new("SELECT * FROM ");
        query.push(table);
        query.push(" WHERE school_id = ");
        query.push_bind(school_id.to_string());

        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = query.build().fetch_all(&mut *conn).await?;
        
        let mut results = Vec::new();
        for row in rows {
            results.push(Self::row_to_json(&row)?);
        }
        Ok(results)
    }

    pub async fn select_by_id(
        &self,
        school_id: &str,
        table: &str,
        id_col: &str,
        id_val: Value,
    ) -> Result<Option<Value>, AppError> {
        let mut query = sqlx::QueryBuilder::<Postgres>::new("SELECT * FROM ");
        query.push(table);
        query.push(" WHERE school_id = ");
        query.push_bind(school_id.to_string());
        query.push(" AND ");
        query.push(id_col);
        query.push(" = ");
        Self::bind_val(&mut query, &id_val);

        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row_opt = query.build().fetch_optional(&mut *conn).await?;
        
        match row_opt {
            Some(row) => Ok(Some(Self::row_to_json(&row)?)),
            None => Ok(None),
        }
    }

    pub async fn update_row(
        &self,
        school_id: &str,
        table: &str,
        id_col: &str,
        id_val: Value,
        data: Value,
    ) -> Result<Value, AppError> {
        let obj = data.as_object().ok_or_else(|| {
            Box::new(crate::error::AppError::Validation("Update data must be a JSON object".to_string()))
        })?;

        if obj.is_empty() {
            return Err(Box::new(crate::error::AppError::Validation("Update data cannot be empty".to_string())));
        }

        let mut query = sqlx::QueryBuilder::<Postgres>::new("UPDATE ");
        query.push(table);
        query.push(" SET ");

        let mut first = true;
        for (key, val) in obj {
            if !first {
                query.push(", ");
            }
            first = false;
            query.push(key);
            query.push(" = ");
            Self::bind_val(&mut query, val);
        }

        query.push(" WHERE school_id = ");
        query.push_bind(school_id.to_string());
        query.push(" AND ");
        query.push(id_col);
        query.push(" = ");
        Self::bind_val(&mut query, &id_val);
        query.push(" RETURNING *");

        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = query.build().fetch_one(&mut *conn).await?;
        Self::row_to_json(&row)
    }

    pub async fn delete_row(
        &self,
        school_id: &str,
        table: &str,
        id_col: &str,
        id_val: Value,
    ) -> Result<(), AppError> {
        let mut query = sqlx::QueryBuilder::<Postgres>::new("DELETE FROM ");
        query.push(table);
        query.push(" WHERE school_id = ");
        query.push_bind(school_id.to_string());
        query.push(" AND ");
        query.push(id_col);
        query.push(" = ");
        Self::bind_val(&mut query, &id_val);

        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        query.build().execute(&mut *conn).await?;
        Ok(())
    }

    fn bind_val<'a>(query: &mut sqlx::QueryBuilder<'a, Postgres>, val: &'a Value) {
        match val {
            Value::Null => {
                query.push_bind(None::<String>);
            }
            Value::Bool(b) => {
                query.push_bind(*b);
            }
            Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    query.push_bind(i);
                } else if let Some(f) = n.as_f64() {
                    query.push_bind(f);
                } else {
                    query.push_bind(n.to_string());
                }
            }
            Value::String(s) => {
                query.push_bind(s.clone());
            }
            Value::Array(arr) => {
                let strings: Vec<String> = arr.iter().map(|v| match v {
                    Value::String(s) => s.clone(),
                    _ => v.to_string()
                }).collect();
                query.push_bind(strings);
            }
            Value::Object(_) => {
                query.push_bind(val.clone());
            }
        }
    }

    fn row_to_json(row: &sqlx::postgres::PgRow) -> Result<Value, AppError> {
        let mut map = Map::new();
        for col in row.columns() {
            let name = col.name();
            let type_name = col.type_info().name();
            
            let val: Value = match type_name {
                "BOOL" => {
                    let v: Option<bool> = row.try_get(name).unwrap_or(None);
                    json!(v)
                }
                "INT2" | "SMALLINT" => {
                    let v: Option<i16> = row.try_get(name).unwrap_or(None);
                    json!(v)
                }
                "INT4" | "INTEGER" | "INT" => {
                    let v: Option<i32> = row.try_get(name).unwrap_or(None);
                    json!(v)
                }
                "INT8" | "BIGINT" => {
                    let v: Option<i64> = row.try_get(name).unwrap_or(None);
                    json!(v)
                }
                "FLOAT4" | "REAL" => {
                    let v: Option<f32> = row.try_get(name).unwrap_or(None);
                    json!(v)
                }
                "FLOAT8" | "DOUBLE PRECISION" => {
                    let v: Option<f64> = row.try_get(name).unwrap_or(None);
                    json!(v)
                }
                "NUMERIC" | "DECIMAL" => {
                    let v: Option<sqlx::types::BigDecimal> = row.try_get(name).unwrap_or(None);
                    if let Some(dec) = v {
                        json!(dec.to_string().parse::<f64>().unwrap_or(0.0))
                    } else {
                        Value::Null
                    }
                }
                "VARCHAR" | "CHAR" | "TEXT" | "BPCHAR" | "NAME" => {
                    let v: Option<String> = row.try_get(name).unwrap_or(None);
                    json!(v)
                }
                "JSON" | "JSONB" => {
                    let v: Option<Value> = row.try_get(name).unwrap_or(None);
                    v.unwrap_or(Value::Null)
                }
                "TIMESTAMP" | "TIMESTAMPTZ" => {
                    let v: Option<chrono::DateTime<chrono::Utc>> = row.try_get(name).unwrap_or(None);
                    if let Some(dt) = v {
                        json!(dt.to_rfc3339())
                    } else {
                        let v_naive: Option<chrono::NaiveDateTime> = row.try_get(name).unwrap_or(None);
                        if let Some(ndt) = v_naive {
                            json!(ndt.to_string())
                        } else {
                            Value::Null
                        }
                    }
                }
                "DATE" => {
                    let v: Option<chrono::NaiveDate> = row.try_get(name).unwrap_or(None);
                    if let Some(d) = v {
                        json!(d.to_string())
                    } else {
                        Value::Null
                    }
                }
                "TEXT[]" | "VARCHAR[]" => {
                    let v: Option<Vec<String>> = row.try_get(name).unwrap_or(None);
                    json!(v)
                }
                _ => {
                    if let Ok(s) = row.try_get::<Option<String>, _>(name) {
                        json!(s)
                    } else if let Ok(json_val) = row.try_get::<Option<Value>, _>(name) {
                        json_val.unwrap_or(Value::Null)
                    } else {
                        Value::Null
                    }
                }
            };
            map.insert(name.to_string(), val);
        }
        Ok(Value::Object(map))
    }
}

pub async fn insert_audit_log<'a, E>(
    executor: E,
    school_id: &str,
    target_type: &str,
    target_id: &str,
    action: &str,
    data: Value,
) -> Result<(), AppError>
where
    E: sqlx::Executor<'a, Database = sqlx::Postgres>,
{
    sqlx::query(
        "INSERT INTO audit_logs (school_id, target_type, target_id, action, data) 
         VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(school_id)
    .bind(target_type)
    .bind(target_id)
    .bind(action)
    .bind(data)
    .execute(executor)
    .await?;
    Ok(())
}
