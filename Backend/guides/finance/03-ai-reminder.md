# 03 - AI Fee Reminder API

## Endpoint: `GET /api/school/:schoolId/finance/fees/student/:studentId/ai-reminder`
**Handler:** `fees::generate_fee_reminder`  
**Service:** `FeeService::generate_fee_reminder`  
**Auth:** None  
**Description:** AI-powered personalized fee reminder generate karta hai. Student ke risk score ke hisaab se tone (urgent/polite) decide karta hai.

### How It Works
1. `student_repo.get_student_profile(school_id, student_id)` se student profile fetch karta hai
2. `fee_repo.get_student_fee(school_id, student_id)` se pending amount fetch karta hai
3. Profile ke `risk_score` field ke basis par tone decide karta hai:
   - `risk_score > 70` → `"urgent"` tone
   - `risk_score <= 70` → `"polite"` tone
4. Formatted reminder message string generate karta hai

### Expected Success Response (200) - Polite Tone
```json
{
  "success": true,
  "data": {
    "success": true,
    "student_id": "STD-99882",
    "message": "AI Reminder (polite): Dear Parent of Jane Doe, we noticed an outstanding balance of ₹5000.00. Please clear this at your earliest convenience. Thank you!",
    "risk_score": 45.0,
    "tone": "polite"
  }
}
```

### Expected Success Response (200) - Urgent Tone (risk_score > 70)
```json
{
  "success": true,
  "data": {
    "success": true,
    "student_id": "STD-99883",
    "message": "AI Reminder (urgent): Dear Parent of John Smith, we noticed an outstanding balance of ₹12000.00. Please clear this at your earliest convenience. Thank you!",
    "risk_score": 85.0,
    "tone": "urgent"
  }
}
```

### Expected Success Response (200) - Zero Pending / No Fee Record
```json
{
  "success": true,
  "data": {
    "success": true,
    "student_id": "STD-99999",
    "message": "AI Reminder (polite): Dear Parent of Student, we noticed an outstanding balance of ₹0.00. Please clear this at your earliest convenience. Thank you!",
    "risk_score": 0.0,
    "tone": "polite"
  }
}
```

### Response Fields
| Field | Type | Description |
|-------|------|-------------|
| success (outer) | boolean | Always true |
| data.success | boolean | Always true |
| data.student_id | string | Student ID |
| data.message | string | Generated reminder message with tone prefix |
| data.risk_score | number | Student's risk score from profile |
| data.tone | string | "polite" or "urgent" |

### Error Scenarios
- **Student not found:** `student_repo.get_student_profile` returns `None` → student_name defaults to `"Student"`, risk_score to `0.0`
- **No fee record:** fee defaults to empty JSON `{}`, pendingAmount to `0.0`
- **Database error:** Returns standard 500 error response

### Service Implementation Reference
```rust
// src/services/finance/fee_service.rs:168-177
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
```

### Rust Test Case
```rust
#[cfg(test)]
mod ai_reminder_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_generate_fee_reminder_polite_tone() {
        let app = crate::test_utils::create_test_app_with_low_risk_student().await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-LOW-RISK/ai-reminder")
                    .method("GET")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["success"], true);
        assert_eq!(json["data"]["tone"], "polite");
        assert!(json["data"]["risk_score"].as_f64().unwrap() <= 70.0);
        assert!(json["data"]["message"].as_str().unwrap().contains("polite"));
    }

    #[tokio::test]
    async fn test_generate_fee_reminder_urgent_tone() {
        let app = crate::test_utils::create_test_app_with_high_risk_student().await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-HIGH-RISK/ai-reminder")
                    .method("GET")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["data"]["tone"], "urgent");
        assert!(json["data"]["risk_score"].as_f64().unwrap() > 70.0);
        assert!(json["data"]["message"].as_str().unwrap().contains("urgent"));
    }

    #[tokio::test]
    async fn test_generate_fee_reminder_unknown_student() {
        let app = crate::test_utils::create_test_app().await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/NONEXISTENT/ai-reminder")
                    .method("GET")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        // Should still return 200 even if student doesn't exist
        // (uses defaults: name="Student", risk=0.0, amount=0.0)
        assert_eq!(response.status(), StatusCode::OK);

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["success"], true);
        assert_eq!(json["data"]["student_id"], "NONEXISTENT");
        assert_eq!(json["data"]["tone"], "polite");
        assert_eq!(json["data"]["risk_score"], 0.0);
        assert!(json["data"]["message"].as_str().unwrap().contains("Student"));
        assert!(json["data"]["message"].as_str().unwrap().contains("₹0.00"));
    }

    #[tokio::test]
    async fn test_generate_fee_reminder_exact_boundary_score() {
        // risk_score exactly 70.0 should be polite
        let app = crate::test_utils::create_test_app_with_risk_score(70.0).await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-BOUNDARY/ai-reminder")
                    .method("GET")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["data"]["tone"], "polite");
        assert_eq!(json["data"]["risk_score"], 70.0);
    }

    #[tokio::test]
    async fn test_generate_fee_reminder_just_above_threshold() {
        // risk_score 70.01 should be urgent
        let app = crate::test_utils::create_test_app_with_risk_score(70.01).await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-BOUNDARY2/ai-reminder")
                    .method("GET")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["data"]["tone"], "urgent");
        assert!(json["data"]["risk_score"].as_f64().unwrap() > 70.0);
    }
}
```