# 02 - Student Billing API

## 2A. List Students with Outstanding Fees

### Endpoint: `GET /api/school/:schoolId/finance/fees/pending`
**Handler:** `fees::get_pending_fees`  
**Service:** `FeeService::get_pending_fees`  
**Auth:** None  
**Query Params:** `minPercentage` (required, f64), `className` (optional, string)  
**Description:** Unpaid fees wale students ki list fetch karta hai. `minPercentage` ke hisaab se filter karta hai. `className` optional filter hai.

### Expected Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "studentId": "STD-99882",
      "studentName": "Jane Doe",
      "className": "10-A",
      "section": "A",
      "totalFees": 15000.0,
      "pendingAmount": 5000.0
    },
    {
      "studentId": "STD-99883",
      "studentName": "John Smith",
      "className": "10-B",
      "section": "B",
      "totalFees": 12000.0,
      "pendingAmount": 8000.0
    }
  ]
}
```

### Query Parameters Detail
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| minPercentage | float | Yes | Minimum pending percentage. `0.0` = all, `20.0` = 20%+ pending |
| className | string | No | Filter by class name (e.g. `10-A`) |

### SQL Logic
```sql
-- Without className filter:
SELECT sf.student_id, sf.total_fees, sf.pending_amount,
       s.name, s.class_name, s.section
FROM student_invoices sf
JOIN students s ON sf.student_id = s.student_id AND sf.school_id = s.school_id
WHERE sf.school_id = $1
  AND (sf.pending_amount / NULLIF(sf.total_fees, 0) * 100) >= $2

-- With className filter (adds: AND s.class_name = $2, min_percentage becomes $3)
```

### Rust Test Case
```rust
#[cfg(test)]
mod pending_fees_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use serde_json::json;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_get_pending_fees_with_filter() {
        let app = crate::test_utils::create_test_app_with_students().await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/pending?minPercentage=20&className=10-A")
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
        let data = json["data"].as_array().unwrap();
        for student in data {
            // sabhi students ka className "10-A" hona chahiye
            assert_eq!(student["className"], "10-A");
            // pending amount > 0 hona chahiye
            assert!(student["pendingAmount"].as_f64().unwrap() > 0.0);
        }
    }

    #[tokio::test]
    async fn test_get_pending_fees_all() {
        let app = crate::test_utils::create_test_app_with_students().await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/pending?minPercentage=0")
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
        // minPercentage=0 means all students with any pending
        assert!(!json["data"].as_array().unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_get_pending_fees_fully_paid() {
        let app = crate::test_utils::create_test_app_with_fully_paid_students().await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/pending?minPercentage=0.1")
                    .method("GET")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        // Fully paid students should not appear
        let data = json["data"].as_array().unwrap();
        for student in data {
            assert!(student["pendingAmount"].as_f64().unwrap() > 0.0);
        }
    }
}
```

---

## 2B. Get Student Billing Details

### Endpoint: `GET /api/school/:schoolId/finance/fees/student/:studentId`
**Handler:** `fees::get_student_fee`  
**Service:** `FeeService::get_student_fee`  
**Auth:** None  
**Description:** Kisi ek student ka complete fee ledger fetch karta hai. Agar student ka koi fee record nahi hai, to default empty record return karta hai.

### Expected Success Response (200) - Existing Record
```json
{
  "success": true,
  "data": {
    "studentId": "STD-99882",
    "totalFees": 15000.0,
    "pendingAmount": 5000.0,
    "discount": 500.0
  }
}
```

### Expected Success Response (200) - No Record (Default)
```json
{
  "success": true,
  "data": {
    "studentId": "STD-99999",
    "totalFees": 0.0,
    "pendingAmount": 0.0,
    "discount": 0.0
  }
}
```

### Expected Error Response (404) - Student Not Found
```json
{
  "success": false,
  "error_code": "NOT_FOUND",
  "message": "Student fee record not found"
}
```

### Rust Test Case
```rust
#[cfg(test)]
mod student_fee_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_get_student_fee_with_record() {
        let app = crate::test_utils::create_test_app_with_student_fee().await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-99882")
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
        assert_eq!(json["data"]["studentId"], "STD-99882");
        assert!(json["data"]["totalFees"].as_f64().unwrap() > 0.0);
        assert!(json["data"]["pendingAmount"].as_f64().unwrap() >= 0.0);
    }

    #[tokio::test]
    async fn test_get_student_fee_default_for_new_student() {
        let app = crate::test_utils::create_test_app_with_student_no_fee().await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-NEW-001")
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
        assert_eq!(json["data"]["studentId"], "STD-NEW-001");
        assert_eq!(json["data"]["totalFees"], 0.0);
        assert_eq!(json["data"]["pendingAmount"], 0.0);
        assert_eq!(json["data"]["discount"], 0.0);
    }

    #[tokio::test]
    async fn test_get_student_fee_not_found() {
        let app = crate::test_utils::create_test_app().await;

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/NONEXISTENT")
                    .method("GET")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["success"], false);
        assert_eq!(json["error_code"], "NOT_FOUND");
    }
}
```

---

## 2C. Fetch Student Billing (User Access Portal)

### Endpoint: `GET /api/school/:schoolId/finance/user/fees/:studentId`
**Handler:** `fees::get_student_fee` (same handler)  
**Auth:** None  
**Description:** Same as 2B, but parent/user portal ke liye dedicated route. Same response and behavior.

### Rust Test Case
```rust
#[tokio::test]
async fn test_user_portal_get_student_fee() {
    let app = crate::test_utils::create_test_app_with_student_fee().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/school/SCHOOL-001/finance/user/fees/STD-99882")
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
    assert_eq!(json["data"]["studentId"], "STD-99882");
}
```

---

## 2D. Charge Ad-Hoc Fee to Student

### Endpoint: `POST /api/school/:schoolId/finance/fees/student/:studentId/add`
**Handler:** `fees::add_fee_to_student_route`  
**Service:** `FeeService::add_fee_to_student`  
**Auth:** Requires `TenantContext` (admin token)  
**Description:** Student ke ledger mein extra fee charge add karta hai (e.g., lab damage, picnic fee).

### Request Body
```json
{
  "amount": 800.0,
  "feeId": "tuition",
  "feeType": "lab_breakage",
  "description": "Broke chemistry flask on 2026-06-05"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| amount | number | Yes | Fee amount to charge |
| feeId | string | No | Fee template ID (default: "") |
| feeType | string | No | Type of fee (arbitrary string) |
| description | string | No | Reason for charge |

### Expected Success Response (200)
```json
{
  "success": true,
  "data": {
    "studentId": "STD-99882",
    "totalFees": 15800.0,
    "pendingAmount": 5800.0,
    "discount": 500.0
  }
}
```

### Business Logic
1. Student ka existing fee record fetch karta hai (agar nahi hai to default empty record)
2. `totalFees += amount` aur `pendingAmount += amount` karta hai
3. `student_invoices` table update karta hai
4. Fee history table mein `fee_added` action ke saath entry karta hai
5. Audit log create karta hai

### Rust Test Case
```rust
#[cfg(test)]
mod add_fee_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode, header},
    };
    use serde_json::json;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_add_fee_to_student_success() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        let payload = json!({
            "amount": 800.0,
            "feeId": "tuition",
            "feeType": "lab_breakage",
            "description": "Broke chemistry flask"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-99882/add")
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
        assert_eq!(json["data"]["studentId"], "STD-99882");
        // total aur pending dono 800 se badhne chahiye
        assert!(json["data"]["totalFees"].as_f64().unwrap() >= 800.0);
        assert!(json["data"]["pendingAmount"].as_f64().unwrap() >= 800.0);
    }

    #[tokio::test]
    async fn test_add_fee_to_new_student_creates_record() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        let payload = json!({
            "amount": 5000.0,
            "feeId": "tuition"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-NEW-001/add")
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
        assert_eq!(json["data"]["totalFees"], 5000.0);
        assert_eq!(json["data"]["pendingAmount"], 5000.0);
    }

    #[tokio::test]
    async fn test_add_fee_with_zero_amount() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        let payload = json!({
            "amount": 0.0,
            "feeId": "tuition"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-99882/add")
                    .method("POST")
                    .header(header::AUTHORIZATION, format!("Bearer {}", admin_token))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(serde_json::to_string(&payload).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        // zero amount still accepted, totalFees unchanged
    }
}
```

---

## 2E. Log Manual Student Cash Payment

### Endpoint: `POST /api/school/:schoolId/finance/fees/student/:studentId/pay`
**Handler:** `fees::pay_fee`  
**Service:** `FeeService::pay_fee`  
**Auth:** Requires `TenantContext` (admin token)  
**Description:** Student ke pending balance mein se manual payment (cash/cheque/online) deduct karta hai.

### Request Body
```json
{
  "amount": 2500.0,
  "paymentMethod": "cash",
  "paymentReference": "MANUAL-0081",
  "penaltyAmount": 0.0,
  "date": "2026-06-21"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| amount | number | Yes | Payment amount |
| paymentMethod | string | No | cash/cheque/online/razorpay_webhook |
| paymentReference | string | No | Receipt or reference number |
| penaltyAmount | number | No | Additional penalty paid |
| date | string | No | Payment date (ISO format) |

### Expected Success Response (200)
```json
{
  "success": true,
  "data": {
    "studentId": "STD-99882",
    "totalFees": 15000.0,
    "pendingAmount": 2500.0,
    "discount": 500.0
  }
}
```

### Validation Rules
- `amount` must not exceed `pendingAmount` - returns 400: `"Pay amount exceeds pending amount"`

### Expected Error Response (400)
```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "Pay amount exceeds pending amount"
}
```

### Rust Test Case
```rust
#[cfg(test)]
mod pay_fee_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode, header},
    };
    use serde_json::json;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_pay_fee_success() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        // First get current pending
        let get_resp = app.clone()
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-99882")
                    .method("GET")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await.unwrap();
        let get_body = hyper::body::to_bytes(get_resp.into_body()).await.unwrap();
        let get_json: serde_json::Value = serde_json::from_slice(&get_body).unwrap();
        let current_pending = get_json["data"]["pendingAmount"].as_f64().unwrap();

        let payload = json!({
            "amount": 1000.0,
            "paymentMethod": "cash",
            "paymentReference": "MANUAL-001",
            "date": "2026-06-21"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-99882/pay")
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
        assert_eq!(json["data"]["pendingAmount"], current_pending - 1000.0);
    }

    #[tokio::test]
    async fn test_pay_fee_exceeds_pending() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        let payload = json!({
            "amount": 999999.0,
            "paymentMethod": "cash"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-99882/pay")
                    .method("POST")
                    .header(header::AUTHORIZATION, format!("Bearer {}", admin_token))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(serde_json::to_string(&payload).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["success"], false);
        assert_eq!(json["error_code"], "VALIDATION_ERR");
        assert!(json["message"].as_str().unwrap().contains("exceeds"));
    }

    #[tokio::test]
    async fn test_pay_fee_full_settlement() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        // Get current pending amount
        let get_resp = app.clone()
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-99882")
                    .method("GET")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await.unwrap();
        let get_body = hyper::body::to_bytes(get_resp.into_body()).await.unwrap();
        let get_json: serde_json::Value = serde_json::from_slice(&get_body).unwrap();
        let current_pending = get_json["data"]["pendingAmount"].as_f64().unwrap();

        let payload = json!({
            "amount": current_pending,
            "paymentMethod": "online"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-99882/pay")
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

        // Full payment - pending should be 0
        assert_eq!(json["data"]["pendingAmount"], 0.0);
    }
}
```

---

## 2F. Grant Discount / Waiver

### Endpoint: `POST /api/school/:schoolId/finance/fees/student/:studentId/discount`
**Handler:** `fees::apply_discount`  
**Service:** `FeeService::apply_discount`  
**Auth:** Requires `TenantContext` (admin token)  
**Description:** Student ke pending fees par discount/waiver apply karta hai.

### Request Body
```json
{
  "discount": 500.0,
  "discount_amount": 500.0,
  "reason": "Economic waiver concession"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| discount | number | Yes* | Discount amount (field name: `discount` or `discount_amount`) |
| discount_amount | number | Yes* | Alternate field name for discount |
| reason | string | No | Reason for discount |

### Expected Success Response (200)
```json
{
  "success": true,
  "data": {
    "studentId": "STD-99882",
    "totalFees": 15000.0,
    "pendingAmount": 4500.0,
    "discount": 500.0
  }
}
```

### Business Logic
1. Student ka current fee record fetch karta hai
2. `new_pending = pending - (discount - old_discount)` calculate karta hai
3. Fee history mein `discount_applied` entry karta hai
4. Audit log create karta hai

### Rust Test Case
```rust
#[cfg(test)]
mod discount_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode, header},
    };
    use serde_json::json;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_apply_discount_success() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        let payload = json!({
            "discount": 500.0,
            "reason": "Need-based waiver"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-99882/discount")
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
        assert_eq!(json["data"]["discount"], 500.0);
    }

    #[tokio::test]
    async fn test_apply_discount_alternate_field_name() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        // Using discount_amount instead of discount
        let payload = json!({
            "discount_amount": 300.0
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-99882/discount")
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

        assert_eq!(json["data"]["discount"], 300.0);
    }

    #[tokio::test]
    async fn test_apply_discount_increases_pending_reduction() {
        let app = crate::test_utils::create_test_app_with_admin().await;
        let admin_token = crate::test_utils::get_test_admin_token();

        // Apply first discount
        let p1 = json!({"discount": 200.0});
        app.clone().oneshot(
            Request::builder()
                .uri("/api/school/SCHOOL-001/finance/fees/student/STD-99882/discount")
                .method("POST")
                .header(header::AUTHORIZATION, format!("Bearer {}", admin_token))
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(serde_json::to_string(&p1).unwrap()))
                .unwrap(),
        ).await.unwrap();

        // Apply larger discount - difference should further reduce pending
        let p2 = json!({"discount": 500.0});
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/fees/student/STD-99882/discount")
                    .method("POST")
                    .header(header::AUTHORIZATION, format!("Bearer {}", admin_token))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(serde_json::to_string(&p2).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["data"]["discount"], 500.0);
        // pending should have reduced by (500 - 200) = 300 more
    }
}
```

---

## Database Table: `student_invoices`
| Column | Type | Description |
|--------|------|-------------|
| student_id | VARCHAR | Student ID |
| school_id | VARCHAR | School tenant ID |
| fee_id | VARCHAR | Linked fee template ID |
| total_fees | DECIMAL | Total fees charged |
| pending_amount | DECIMAL | Remaining unpaid amount |
| discount | DECIMAL | Applied discount amount |
| status | VARCHAR | pending/paid/partial |

## Database Table: `fee_audit_log` (via `base::insert_audit_log`)
| Column | Type | Description |
|--------|------|-------------|
| school_id | VARCHAR | Tenant |
| entity_type | VARCHAR | "fee" |
| entity_id | VARCHAR | Student ID or fee ID |
| action | VARCHAR | fee_added/payment/discount_applied |
| data | JSONB | Action payload |