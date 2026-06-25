# 01 - Fee Templates API

## Endpoint: `GET /api/school/:schoolId/finance/fees`
**Handler:** `fees::get_school_fees`  
**Service:** `FeeService::get_school_fees`  
**Auth:** None (public)  
**Description:** School ke sabhi fee templates (tuition, transport, etc.) ki list fetch karta hai.

### Expected Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "F1719123456789",
      "feesName": "Standard 10 Tuition Fee",
      "feesReason": "Annual tuition for Grade 10",
      "feesPeriod": "quarterly",
      "feesAmount": 12000.0,
      "createdAt": "2026-06-21T12:00:00+00:00"
    },
    {
      "id": "F1719123456790",
      "feesName": "Transport Fee",
      "feesReason": "Bus service for 2026-27",
      "feesPeriod": "monthly",
      "feesAmount": 2500.0,
      "createdAt": "2026-06-20T10:30:00+00:00"
    }
  ]
}
```

### Expected Error Response (500)
```json
{
  "success": false,
  "error_code": "DB_ERR",
  "message": "An internal database error occurred"
}
```

### Database Table: `fee_templates`
| Column | Type | Description |
|--------|------|-------------|
| fee_id | VARCHAR | Auto-generated ID (F + timestamp) |
| school_id | VARCHAR | School tenant ID |
| name | VARCHAR | Fee display name |
| reason | VARCHAR | Reason/description |
| period | VARCHAR | Billing frequency (monthly/quarterly/yearly/one-time) |
| amount | DECIMAL | Fee amount |
| created_at | TIMESTAMPTZ | Creation timestamp |

### Rust Test Case
```rust
#[cfg(test)]
mod fee_template_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use serde_json::json;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_get_school_fees_success() {
        let app = crate::test_utils::create_test_app().await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees")
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
        assert!(json["data"].is_array());
    }

    #[tokio::test]
    async fn test_get_school_fees_empty_list() {
        let app = crate::test_utils::create_test_app_with_empty_db().await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-EMPTY/finance/fees")
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
        assert_eq!(json["data"].as_array().unwrap().len(), 0);
    }
}
```

---

## Endpoint: `POST /api/school/:schoolId/finance/fees`
**Handler:** `fees::create_school_fee`  
**Service:** `FeeService::create_school_fee`  
**Auth:** Requires `TenantContext` (admin token)  
**Description:** Naya fee template create karta hai. Audit log bhi entry karta hai.

### Request Body
```json
{
  "feesName": "Standard 10 Tuition Fee",
  "feesReason": "Annual tuition for Grade 10",
  "feesPeriod": "quarterly",
  "feesAmount": 12000.0
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| feesName | string | Yes | Fee display name |
| feesReason | string | No | Reason/description |
| feesPeriod | string | No | Frequency (monthly/quarterly/yearly/One Time) |
| feesAmount | number | No | Fee amount |

### Expected Success Response (200)
```json
{
  "success": true,
  "data": {
    "feesName": "Standard 10 Tuition Fee",
    "feesReason": "Annual tuition for Grade 10",
    "feesPeriod": "quarterly",
    "feesAmount": 12000.0,
    "id": "F1719123456789",
    "createdAt": "2026-06-21T12:00:00+00:00"
  }
}
```

### Expected Error Responses

**Missing admin token (401):**
```json
{
  "success": false,
  "error_code": "UNAUTHORIZED",
  "message": "Missing or invalid tenant token"
}
```

**Validation error (400):**
```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "Fee name is required"
}
```

### Rust Test Case
```rust
#[cfg(test)]
mod create_fee_template_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode, header},
    };
    use serde_json::json;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_create_school_fee_success() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        let payload = json!({
            "feesName": "Test Fee",
            "feesReason": "Test reason",
            "feesPeriod": "monthly",
            "feesAmount": 5000.0
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees")
                    .method("POST")
                    .header(header::AUTHORIZATION, format!("Bearer {}", admin_token))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(serde_json::to_string(&payload).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["success"], true);
        assert!(json["data"]["id"].as_str().unwrap().starts_with("F"));
        assert_eq!(json["data"]["feesName"], "Test Fee");
        assert_eq!(json["data"]["feesAmount"], 5000.0);
    }

    #[tokio::test]
    async fn test_create_school_fee_unauthorized() {
        let app = crate::test_utils::create_test_app().await;

        let payload = json!({
            "feesName": "Test Fee",
            "feesAmount": 5000.0
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees")
                    .method("POST")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(serde_json::to_string(&payload).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_create_school_fee_default_values() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        // Send only feesName, rest should use defaults
        let payload = json!({
            "feesName": "Minimal Fee"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees")
                    .method("POST")
                    .header(header::AUTHORIZATION, format!("Bearer {}", admin_token))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(serde_json::to_string(&payload).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["data"]["feesPeriod"], "One Time");
        assert_eq!(json["data"]["feesAmount"], 0.0);
        assert_eq!(json["data"]["feesReason"], "");
    }
}
```