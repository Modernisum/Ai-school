# 05 - Coupons API

## 5A. List Coupons

### Endpoint: `GET /api/school/:schoolId/finance/coupons`
**Handler:** `fees::list_coupons`  
**Service:** `CouponService::list_coupons`  
**Auth:** None  
**Description:** School ke sabhi referral/promo coupons ki list fetch karta hai.

### Expected Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "couponId": "CPN1719123456789",
      "couponName": "REF-JANE-99",
      "discountType": "percentage",
      "discountValue": 10.0,
      "isBlocked": false,
      "data": {
        "couponName": "REF-JANE-99",
        "discountType": "percentage",
        "discountValue": 10.0,
        "maxUses": 1,
        "expiryDate": "2026-08-31"
      }
    },
    {
      "couponId": "CPN1719123456790",
      "couponName": "REF-JOHN-50",
      "discountType": "flat",
      "discountValue": 1000.0,
      "isBlocked": true,
      "data": {
        "couponName": "REF-JOHN-50",
        "discountType": "flat",
        "discountValue": 1000.0
      }
    }
  ]
}
```

### Database Table: `coupons`
| Column | Type | Description |
|--------|------|-------------|
| coupon_id | VARCHAR | Auto-generated (CPN + timestamp) |
| school_id | VARCHAR | School tenant ID |
| coupon_name | VARCHAR | Unique coupon code |
| discount_type | VARCHAR | "percentage" or "flat" |
| discount_value | DECIMAL | Discount amount/percentage |
| is_blocked | BOOLEAN | Whether coupon is blocked |
| data | JSONB | Full payload (includes maxUses, expiryDate, etc.) |

### Rust Test Case
```rust
#[cfg(test)]
mod coupons_list_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_list_coupons() {
        let app = crate::test_utils::create_test_app_with_coupons().await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/coupons")
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
        for coupon in json["data"].as_array().unwrap() {
            assert!(coupon["couponId"].as_str().unwrap().starts_with("CPN"));
            assert!(coupon["couponName"].is_string());
            assert!(coupon["discountType"].is_string());
            assert!(coupon["isBlocked"].is_boolean());
        }
    }
}
```

---

## 5B. Create Coupon

### Endpoint: `POST /api/school/:schoolId/finance/coupons`
**Handler:** `fees::create_coupon`  
**Service:** `CouponService::create_coupon`  
**Auth:** Requires `TenantContext` (admin token)  
**Description:** Naya referral/promo coupon create karta hai.

### Request Body
```json
{
  "couponName": "REF-JANE-99",
  "code": "REF-JANE-99",
  "discountType": "percentage",
  "discount_type": "percentage",
  "discountValue": 10.0,
  "discount_value": 10.0,
  "maxUses": 1,
  "expiryDate": "2026-08-31"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| couponName | string | Yes | Coupon code name (also accepts `code`) |
| code | string | Yes* | Alternate field name for couponName |
| discountType | string | No | "percentage" or "flat" (also accepts `discount_type`) |
| discount_type | string | No* | Alternate field name for discountType |
| discountValue | number | No | Discount amount or percentage (also accepts `discount_value`) |
| discount_value | number | No* | Alternate field name for discountValue |
| maxUses | number | No | Maximum number of uses |
| expiryDate | string | No | Expiry date (ISO format) |

### Expected Success Response (200)
```json
{
  "success": true,
  "data": {
    "couponName": "REF-JANE-99",
    "code": "REF-JANE-99",
    "discountType": "percentage",
    "discountValue": 10.0,
    "maxUses": 1,
    "expiryDate": "2026-08-31",
    "couponId": "CPN1719123456789"
  }
}
```

### Rust Test Case
```rust
#[cfg(test)]
mod coupons_create_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode, header},
    };
    use serde_json::json;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_create_coupon_success() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        let payload = json!({
            "couponName": "REF-TEST-01",
            "discountType": "flat",
            "discountValue": 500.0
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/coupons")
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
        assert!(json["data"]["couponId"].as_str().unwrap().starts_with("CPN"));
        assert_eq!(json["data"]["couponName"], "REF-TEST-01");
        assert_eq!(json["data"]["discountValue"], 500.0);
    }

    #[tokio::test]
    async fn test_create_coupon_alternate_field_names() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        // Using "code" instead of "couponName", "discount_value" instead of "discountValue"
        let payload = json!({
            "code": "ALT-CODE-01",
            "discount_type": "percentage",
            "discount_value": 15.0
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/coupons")
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

        assert_eq!(json["data"]["couponName"], "ALT-CODE-01");
        assert_eq!(json["data"]["discountType"], "percentage");
        assert_eq!(json["data"]["discountValue"], 15.0);
    }
}
```

---

## 5C. Validate Coupon

### Endpoint: `POST /api/school/:schoolId/finance/coupons/validate`
**Handler:** `fees::validate_coupon`  
**Service:** `CouponService::validate_coupon`  
**Auth:** None  
**Description:** Coupon code valid hai ya nahi check karta hai. Blocked coupons ko ignore karta hai.

### Request Body
```json
{
  "couponName": "REF-JANE-99",
  "code": "REF-JANE-99",
  "studentId": "STD-00921"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| couponName | string | Yes | Coupon name to validate (also accepts `code`) |
| code | string | Yes* | Alternate field for couponName |
| studentId | string | No | Student ID for context |

### Expected Success Response (200) - Valid Coupon
```json
{
  "success": true,
  "data": {
    "couponId": "CPN1719123456789",
    "couponName": "REF-JANE-99",
    "discountType": "percentage",
    "discountValue": 10.0
  }
}
```

### Expected Error Response (404) - Not Found
```json
{
  "success": false,
  "message": "Coupon not found"
}
```
> **Note:** This endpoint returns 404 with `{"success": false}` instead of the standard `error_code` format. It's handled directly in the handler, not via `AppError`.

### SQL Query
```sql
SELECT * FROM coupons
WHERE school_id = $1 AND coupon_name = $2 AND is_blocked = FALSE
```

### Rust Test Case
```rust
#[cfg(test)]
mod coupons_validate_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode, header},
    };
    use serde_json::json;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_validate_coupon_found() {
        let app = crate::test_utils::create_test_app_with_active_coupon().await;

        let payload = json!({
            "couponName": "REF-VALID-01"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/coupons/validate")
                    .method("POST")
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
        assert_eq!(json["data"]["couponName"], "REF-VALID-01");
        assert!(json["data"]["couponId"].is_string());
    }

    #[tokio::test]
    async fn test_validate_coupon_not_found() {
        let app = crate::test_utils::create_test_app().await;

        let payload = json!({
            "couponName": "NONEXISTENT"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/coupons/validate")
                    .method("POST")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(serde_json::to_string(&payload).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["success"], false);
        assert_eq!(json["message"], "Coupon not found");
    }

    #[tokio::test]
    async fn test_validate_coupon_blocked() {
        let app = crate::test_utils::create_test_app_with_blocked_coupon().await;

        let payload = json!({
            "couponName": "REF-BLOCKED-01"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/coupons/validate")
                    .method("POST")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(serde_json::to_string(&payload).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        // Blocked coupons should return 404 (not found)
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_validate_coupon_alternate_code_field() {
        let app = crate::test_utils::create_test_app_with_active_coupon().await;

        // Using "code" instead of "couponName"
        let payload = json!({
            "code": "REF-VALID-01"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/coupons/validate")
                    .method("POST")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(serde_json::to_string(&payload).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }
}
```

---

## 5D. Delete Coupon

### Endpoint: `DELETE /api/school/:schoolId/finance/coupons/:couponId`
**Handler:** `fees::delete_coupon`  
**Service:** `CouponService::remove_coupon`  
**Auth:** Requires `TenantContext` (admin token)  
**Description:** Coupon ko permanently delete karta hai.

### Expected Success Response (200)
```json
{
  "success": true,
  "message": "Deleted"
}
```

### Rust Test Case
```rust
#[cfg(test)]
mod coupons_delete_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode, header},
    };
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_delete_coupon_success() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/coupons/CPN1719123456789")
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
}
```

---

## 5E. Block/Unblock Coupon

### Endpoint: `PUT /api/school/:schoolId/finance/coupons/:couponId/block`
**Handler:** `fees::block_coupon`  
**Service:** `CouponService::toggle_block_coupon`  
**Auth:** Requires `TenantContext` (admin token)  
**Description:** Coupon ko block ya unblock karta hai. Blocked coupons validate nahi hote.

### Request Body
```json
{
  "blocked": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| blocked | boolean | No | true=block, false=unblock (default: true) |

### Expected Success Response (200) - Blocked
```json
{
  "success": true,
  "message": "Blocked"
}
```

### Expected Success Response (200) - Unblocked
```json
{
  "success": true,
  "message": "Unblocked"
}
```

### Rust Test Case
```rust
#[cfg(test)]
mod coupons_block_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode, header},
    };
    use serde_json::json;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_block_coupon() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        let payload = json!({"blocked": true});

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/coupons/CPN1719123456789/block")
                    .method("PUT")
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
        assert_eq!(json["message"], "Blocked");
    }

    #[tokio::test]
    async fn test_unblock_coupon() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        let payload = json!({"blocked": false});

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/coupons/CPN1719123456789/block")
                    .method("PUT")
                    .header(header::AUTHORIZATION, format!("Bearer {}", admin_token))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(serde_json::to_string(&payload).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["message"], "Unblocked");
    }

    #[tokio::test]
    async fn test_block_coupon_default_value() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        // Empty body - defaults to blocked=true
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/coupons/CPN1719123456789/block")
                    .method("PUT")
                    .header(header::AUTHORIZATION, format!("Bearer {}", admin_token))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from("{}"))
                    .unwrap(),
            )
            .await
            .unwrap();

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["message"], "Blocked");
    }
}
```

---

## 5F. Use (Redeem) Coupon

### Endpoint: `POST /api/school/:schoolId/finance/coupons/:couponId/use`
**Handler:** `fees::use_coupon`  
**Service:** `CouponService::use_coupon`  
**Auth:** Requires `TenantContext` (admin token)  
**Description:** Student ke liye coupon redeem karta hai. `student_coupons` table mein entry create karta hai.

### Request Body
```json
{
  "studentId": "STD-00921",
  "student_id": "STD-00921",
  "discount": 500.0,
  "amount": 500.0
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| studentId | string | Yes | Student ID (also accepts `student_id`) |
| student_id | string | Yes* | Alternate field for studentId |
| discount | number | No | Discount amount to apply (also accepts `amount`) |
| amount | number | No* | Alternate field for discount |

### Expected Success Response (200)
```json
{
  "success": true,
  "data": {
    "status": "used",
    "couponId": "CPN1719123456789",
    "studentId": "STD-00921",
    "discount": 500.0
  }
}
```

### Rust Test Case
```rust
#[cfg(test)]
mod coupons_use_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode, header},
    };
    use serde_json::json;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_use_coupon_success() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        let payload = json!({
            "studentId": "STD-00921",
            "discount": 500.0
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/coupons/CPN1719123456789/use")
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
        assert_eq!(json["data"]["status"], "used");
        assert_eq!(json["data"]["couponId"], "CPN1719123456789");
        assert_eq!(json["data"]["studentId"], "STD-00921");
        assert_eq!(json["data"]["discount"], 500.0);
    }

    #[tokio::test]
    async fn test_use_coupon_alternate_fields() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        // Using student_id and amount instead of studentId and discount
        let payload = json!({
            "student_id": "STD-00921",
            "amount": 300.0
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/coupons/CPN1719123456789/use")
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

        assert_eq!(json["data"]["studentId"], "STD-00921");
        assert_eq!(json["data"]["discount"], 300.0);
    }
}
```

---

## Database Table: `student_coupons`
| Column | Type | Description |
|--------|------|-------------|
| school_id | VARCHAR | School tenant |
| student_id | VARCHAR | Student who redeemed |
| coupon_id | VARCHAR | FK to coupons.coupon_id |
| discount_applied | DECIMAL | Discount amount used |
| created_at | TIMESTAMPTZ | Redemption timestamp |