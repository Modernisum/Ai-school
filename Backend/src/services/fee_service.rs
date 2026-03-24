use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use chrono::Local;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct PostgresFeeService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl FeeService for PostgresFeeService {
    async fn create_school_fee(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.repos.fee.add_school_fee(school_id, data.clone()).await?;
        let fee_id = res["id"].as_str().or(res["feeId"].as_str()).unwrap_or("unknown");
        let _ = self.repos.audit.log_action(school_id, admin_id, "SCHOOL_FEE", fee_id, "CREATE", data).await;
        Ok(res)
    }

    async fn get_school_fees(&self, school_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.fee.get_school_fees(school_id).await?)
    }

    async fn get_pending_fees(
        &self,
        school_id: &str,
        min_percentage: f64,
        class_name: Option<String>,
    ) -> AppResult<Vec<Value>> {
        Ok(self.repos.fee.get_pending_fees(school_id, min_percentage, class_name).await?)
    }

    async fn get_student_fee(&self, school_id: &str, student_id: &str) -> AppResult<Value> {
        self.repos.fee.get_student_fee(school_id, student_id).await?
            .ok_or_else(|| AppError::NotFound("Student fee record not found".to_string()))
    }

    async fn add_fee_to_student(
        &self,
        school_id: &str,
        student_id: &str,
        amount: f64,
        fee_id: &str,
        admin_id: &str,
    ) -> AppResult<Value> {
        let mut fee_record = self.repos.fee.get_student_fee(school_id, student_id).await?.unwrap_or(json!({
            "studentId": student_id,
            "totalFees": 0.0,
            "pendingAmount": 0.0,
            "discount": 0.0
        }));

        let current_total = fee_record["totalFees"].as_f64().unwrap_or(0.0);
        let current_pending = fee_record["pendingAmount"].as_f64().unwrap_or(0.0);

        fee_record["totalFees"] = json!(current_total + amount);
        fee_record["pendingAmount"] = json!(current_pending + amount);

        self.repos.fee.update_student_fee(school_id, student_id, fee_record.clone()).await?;
        self.repos.fee.add_fee_history(school_id, student_id, "fee_added", json!({"amount": amount, "feeId": fee_id})).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "STUDENT_FEE_ADDITION", student_id, "ADD_FEE", json!({"amount": amount, "feeId": fee_id})).await;
        Ok(fee_record)
    }

    async fn apply_discount(
        &self,
        school_id: &str,
        student_id: &str,
        discount: f64,
        admin_id: &str,
    ) -> AppResult<Value> {
        let mut fee_record = self.get_student_fee(school_id, student_id).await?;
        let pending = fee_record["pendingAmount"].as_f64().unwrap_or(0.0);
        let old_discount = fee_record["discount"].as_f64().unwrap_or(0.0);
        let new_pending = pending - (discount - old_discount);

        fee_record["discount"] = json!(discount);
        fee_record["pendingAmount"] = json!(new_pending);

        self.repos.fee.update_student_fee(school_id, student_id, fee_record.clone()).await?;
        self.repos.fee.add_fee_history(school_id, student_id, "discount_applied", json!({
            "newDiscount": discount,
            "previousDiscount": old_discount,
            "newPending": new_pending
        })).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "STUDENT_FEE_DISCOUNT", student_id, "APPLY_DISCOUNT", json!({"discount": discount})).await;
        Ok(fee_record)
    }

    async fn pay_fee(
        &self,
        school_id: &str,
        student_id: &str,
        admin_id: &str,
        payload: Value,
    ) -> AppResult<Value> {
        let mut fee_record = self.get_student_fee(school_id, student_id).await?;
        let amount = payload["amount"].as_f64().unwrap_or(0.0);
        let penalty_paid = payload["penaltyAmount"].as_f64().unwrap_or(0.0);
        let pending = fee_record["pendingAmount"].as_f64().unwrap_or(0.0);

        if amount > pending {
            return Err(AppError::Validation("Pay amount exceeds pending amount".to_string()));
        }

        let new_pending = pending - amount;
        fee_record["pendingAmount"] = json!(new_pending);

        self.repos.fee.update_student_fee(school_id, student_id, fee_record.clone()).await?;
        self.repos.fee.add_fee_history(school_id, student_id, "payment", json!({
            "payAmount": amount,
            "penaltyPaid": penalty_paid,
            "previousPending": pending,
            "newPending": new_pending,
            "date": Local::now().to_rfc3339()
        })).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "STUDENT_FEE_PAYMENT", student_id, "PAY", payload).await;
        Ok(fee_record)
    }

    async fn create_custom_fee(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.repos.fee.add_custom_fee(school_id, data.clone()).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "CUSTOM_FEE", &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()), "CREATE", data).await;
        Ok(res)
    }

    async fn list_custom_fees(&self, school_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.fee.get_custom_fees(school_id).await?)
    }

    async fn remove_custom_fee(&self, school_id: &str, fee_id: &str, admin_id: &str) -> AppResult<()> {
        self.repos.fee.delete_custom_fee(school_id, fee_id).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "CUSTOM_FEE", fee_id, "DELETE", json!({})).await;
        Ok(())
    }

    async fn apply_custom_fee(&self, school_id: &str, fee_id: &str, admin_id: &str) -> AppResult<Value> {
        let res = self.repos.fee.apply_custom_fee(school_id, fee_id).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "CUSTOM_FEE_APPLY", fee_id, "APPLY", json!({})).await;
        Ok(res)
    }

    async fn generate_fee_reminder(&self, school_id: &str, student_id: &str) -> AppResult<Value> {
        let profile = self.repos.student.get_student_profile(school_id, student_id).await?;
        let fee = self.repos.fee.get_student_fee(school_id, student_id).await?.unwrap_or(json!({}));
        let student_name = profile.as_ref().and_then(|p| p["name"].as_str()).unwrap_or("Student");
        let amount = fee["pendingAmount"].as_f64().unwrap_or(0.0);
        let risk_score = profile.as_ref().and_then(|p| p["risk_score"].as_f64()).unwrap_or(0.0);
        let tone = if risk_score > 70.0 { "urgent" } else { "polite" };
        let message = format!("AI Reminder ({tone}): Dear Parent of {student_name}, we noticed an outstanding balance of ₹{amount:.2}. Please clear this at your earliest convenience. Thank you!");
        Ok(json!({ "success": true, "student_id": student_id, "message": message, "risk_score": risk_score, "tone": tone }))
    }
}

#[async_trait]
impl CouponService for PostgresFeeService {
    async fn create_coupon(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value> {
        let res = self.repos.coupon.create_coupon(school_id, data.clone()).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "COUPON", &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()), "CREATE", data).await;
        Ok(res)
    }

    async fn list_coupons(&self, school_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.coupon.get_coupons(school_id).await?)
    }

    async fn remove_coupon(&self, school_id: &str, coupon_id: &str, admin_id: &str) -> AppResult<()> {
        self.repos.coupon.delete_coupon(school_id, coupon_id).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "COUPON", coupon_id, "DELETE", json!({})).await;
        Ok(())
    }

    async fn toggle_block_coupon(&self, school_id: &str, coupon_id: &str, admin_id: &str, blocked: bool) -> AppResult<()> {
        self.repos.coupon.block_coupon(school_id, coupon_id, blocked).await?;
        let action = if blocked { "BLOCK" } else { "UNBLOCK" };
        let _ = self.repos.audit.log_action(school_id, admin_id, "COUPON_BLOCK", coupon_id, action, json!({})).await;
        Ok(())
    }

    async fn validate_coupon(&self, school_id: &str, coupon_name: &str) -> AppResult<Option<Value>> {
        Ok(self.repos.coupon.validate_coupon(school_id, coupon_name).await?)
    }

    async fn use_coupon(&self, school_id: &str, coupon_id: &str, student_id: &str, admin_id: &str, discount: f64) -> AppResult<Value> {
        let res = self.repos.coupon.use_coupon(school_id, coupon_id, student_id, discount).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "COUPON_USE", coupon_id, "USE", json!({"studentId": student_id, "discount": discount})).await;
        Ok(res)
    }
}
