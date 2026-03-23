use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresCouponRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::CouponRepository for PostgresCouponRepository {
    async fn create_coupon(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let coupon_id = format!("CPN{}", chrono::Utc::now().timestamp_millis());
        sqlx::query(
            "INSERT INTO coupons (coupon_id, school_id, coupon_name, discount_type, discount_value, data)
             VALUES ($1, $2, $3, $4, $5, $6)",
        )
        .bind(&coupon_id)
        .bind(school_id)
        .bind(data["couponName"].as_str())
        .bind(data["discountType"].as_str().unwrap_or("percentage"))
        .bind(data["discountValue"].as_f64().unwrap_or(0.0))
        .bind(&data)
        .execute(&mut *conn)
        .await?;
        
        let mut ret = data.clone();
        ret["couponId"] = json!(coupon_id);
        Ok(ret)
    }

    async fn get_coupons(&self, school_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT * FROM coupons WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;
        Ok(rows.into_iter().map(|r| json!({
            "couponId": r.get::<String, _>("coupon_id"),
            "couponName": r.get::<String, _>("coupon_name"),
            "discountType": r.get::<String, _>("discount_type"),
            "discountValue": r.get::<f64, _>("discount_value"),
            "isBlocked": r.get::<bool, _>("is_blocked"),
            "data": r.get::<Value, _>("data")
        })).collect())
    }

    async fn delete_coupon(&self, school_id: &str, coupon_id: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM coupons WHERE school_id = $1 AND coupon_id = $2")
            .bind(school_id).bind(coupon_id).execute(&mut *conn).await?;
        Ok(())
    }

    async fn block_coupon(
        &self,
        school_id: &str,
        coupon_id: &str,
        blocked: bool,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("UPDATE coupons SET is_blocked = $1 WHERE school_id = $2 AND coupon_id = $3")
            .bind(blocked).bind(school_id).bind(coupon_id).execute(&mut *conn).await?;
        Ok(())
    }

    async fn validate_coupon(
        &self,
        school_id: &str,
        coupon_name: &str,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM coupons WHERE school_id = $1 AND coupon_name = $2 AND is_blocked = FALSE")
            .bind(school_id).bind(coupon_name).fetch_optional(&mut *conn).await?;
        Ok(row.map(|r| json!({
            "couponId": r.get::<String, _>("coupon_id"),
            "couponName": r.get::<String, _>("coupon_name"),
            "discountType": r.get::<String, _>("discount_type"),
            "discountValue": r.get::<f64, _>("discount_value")
        })))
    }

    async fn use_coupon(
        &self,
        school_id: &str,
        coupon_id: &str,
        student_id: &str,
        discount: f64,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO student_coupons (school_id, student_id, coupon_id, discount_applied) VALUES ($1, $2, $3, $4)")
            .bind(school_id).bind(student_id).bind(coupon_id).bind(discount).execute(&mut *conn).await?;
        Ok(json!({"status": "used", "couponId": coupon_id, "studentId": student_id, "discount": discount}))
    }
}
