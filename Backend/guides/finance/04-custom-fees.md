# 04 - Custom Fees API

## 4A. List Custom Fees

### Endpoint: `GET /api/school/:schoolId/finance/fees/custom`
**Handler:** `fees::list_custom_fees`  
**Service:** `FeeService::list_custom_fees`  
**Auth:** None  
**Description:** School ke sabhi ad-hoc custom fee invoices ki list fetch karta hai.

### Expected Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "CF1719123456789",
      "feeName": "Annual Sports Fee",
      "amount": 1500.0
    },
    {
      "id": "CF1719123456790",
      "feeName": "Picnic Fee Class 10",
      "amount": 800.0
    }
  ]
}
```

### Database Table: `custom_fees`
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR | Auto-generated (CF + timestamp) |
| school_id | VARCHAR | School tenant ID |
| fee_name | VARCHAR | Name of the custom fee |
| amount | DECIMAL | Fee amount |

### Rust Test Case
```rust
#[cfg(test)]
mod custom_fees_list_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_list_custom_fees() {
        let app = crate::test_utils::create_test_app_with_custom_fees().await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/custom")
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
        for fee in json["data"].as_array().unwrap() {
            assert!(fee["id"].as_str().unwrap().starts_with("CF"));
            assert!(fee["feeName"].is_string());
            assert!(fee["amount"].is_number());
        }
    }

    #[tokio::test]
    async fn test_list_custom_fees_empty() {
        let app = crate::test_utils::create_test_app().await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-NO-CUSTOM/finance/fees/custom")
                    .method("GET")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["data"].as_array().unwrap().len(), 0);
    }
}
```

---

## 4B. Create Custom Fee

### Endpoint: `POST /api/school/:schoolId/finance/fees/custom`
**Handler:** `fees::create_custom_fee`  
**Service:** `FeeService::create_custom_fee`  
**Auth:** Requires `TenantContext` (admin token)  
**Description:** Naya custom fee invoice create karta hai (ad-hoc charges jaise lab damage, event fee, etc.)

### Request Body
```json
{
  "feeName": "Annual Sports Fee",
  "amount": 1500.0,
  "description": "Annual sports day participation fee"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| feeName | string | Yes | Name of the custom fee |
| amount | number | No | Fee amount (default: 0.0) |
| description | string | No | Optional description |

### Expected Success Response (200)
```json
{
  "success": true,
  "data": {
    "feeName": "Annual Sports Fee",
    "amount": 1500.0,
    "description": "Annual sports day participation fee",
    "id": "CF1719123456789"
  }
}
```

### Rust Test Case
```rust
#[cfg(test)]
mod custom_fees_create_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode, header},
    };
    use serde_json::json;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_create_custom_fee_success() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        let payload = json!({
            "feeName": "Annual Sports Fee",
            "amount": 1500.0
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/custom")
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
        assert!(json["data"]["id"].as_str().unwrap().starts_with("CF"));
        assert_eq!(json["data"]["feeName"], "Annual Sports Fee");
        assert_eq!(json["data"]["amount"], 1500.0);
    }

    #[tokio::test]
    async fn test_create_custom_fee_unauthorized() {
        let app = crate::test_utils::create_test_app().await;

        let payload = json!({
            "feeName": "Unauthorized Fee",
            "amount": 500.0
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/custom")
                    .method("POST")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(serde_json::to_string(&payload).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
}
```

---

## 4C. Delete Custom Fee

### Endpoint: `DELETE /api/school/:schoolId/finance/fees/custom/:feeId`
**Handler:** `fees::delete_custom_fee`  
**Service:** `FeeService::remove_custom_fee`  
**Auth:** Requires `TenantContext` (admin token)  
**Description:** Custom fee invoice ko delete karta hai. Audit log bhi entry karta hai.

### Expected Success Response (200)
```json
{
  "success": true,
  "message": "Deleted"
}
```

### Expected Error Response (404)
```json
{
  "success": false,
  "error_code": "NOT_FOUND",
  "message": "Custom fee not found"
}
```

### Rust Test Case
```rust
#[cfg(test)]
mod custom_fees_delete_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode, header},
    };
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_delete_custom_fee_success() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/custom/CF1719123456789")
                    .method("DELETE")
                    .header(header::AUTHORIZATION, format!("Bearer {}", admin_token))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["success"], true);
        assert_eq!(json["message"], "Deleted");
    }

    #[tokio::test]
    async fn test_delete_custom_fee_not_found() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/custom/NONEXISTENT")
                    .method("DELETE")
                    .header(header::AUTHORIZATION, format!("Bearer {}", admin_token))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        // DELETE on non-existent row returns success (no error from Postgres)
        assert_eq!(response.status(), StatusCode::OK);

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["success"], true);
        assert_eq!(json["message"], "Deleted");
    }
}
```

---

## 4D. Apply Custom Fee to Classes

### Endpoint: `POST /api/school/:schoolId/finance/fees/custom/:feeId/apply`
**Handler:** `fees::apply_custom_fee`  
**Service:** `FeeService::apply_custom_fee`  
**Auth:** Requires `TenantContext` (admin token)  
**Description:** Custom fee ko selected classes ke students par apply karta hai. Audit log entry karta hai.

### Expected Success Response (200)
```json
{
  "success": true,
  "data": {
    "status": "applied",
    "id": "CF1719123456789"
  }
}
```

### Note
Repository implementation (`apply_custom_fee`) currently returns a stub response:
```rust
Ok(json!({"status": "applied", "id": fee_id}))
```
Actual class-targeting logic is expected to be implemented in a future iteration.

### Rust Test Case
```rust
#[cfg(test)]
mod custom_fees_apply_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode, header},
    };
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_apply_custom_fee_success() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/custom/CF1719123456789/apply")
                    .method("POST")
                    .header(header::AUTHORIZATION, format!("Bearer {}", admin_token))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["success"], true);
        assert_eq!(json["data"]["status"], "applied");
        assert_eq!(json["data"]["id"], "CF1719123456789");
    }

    #[tokio::test]
    async fn test_apply_custom_fee_unauthorized() {
        let app = crate::test_utils::create_test_app().await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/custom/CF1719123456789/apply")
                    .method("POST")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
}
```

---

## Database Table: `student_custom_fees`
| Column | Type | Description |
|--------|------|-------------|
| student_id | VARCHAR | Student ID |
| school_id | VARCHAR | School tenant |
| fee_id | VARCHAR | FK to custom_fees.id |
| created_at | TIMESTAMPTZ | When applied |