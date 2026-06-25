# 06 - Payment (Razorpay) API

## 6A. Create Online Payment Order

### Endpoint: `POST /api/school/:schoolId/finance/payment/:schoolId/create-order`
**Handler:** `payment::create_order`  
**Auth:** None  
**Nested Route:** Mounted via `payment::router()` under `/payment`  
**Complete URL:** `/api/school/:schoolId/finance/payment/:schoolId/create-order`  
**Description:** Razorpay payment gateway ke saath order create karta hai. Razorpay API se `order_id` generate karta hai aur transaction DB mein save karta hai.

### Request Body (CreateOrderRequest struct)
```json
{
  "amount": 5000.0,
  "currency": "INR",
  "student_id": "STD-99882",
  "fee_type": "regular",
  "fee_id": "tuition_june"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| amount | f64 | Yes | Amount in INR (rupees, not paise) |
| currency | string | No | Currency code (default: "INR") |
| student_id | string | Yes | Student ID |
| fee_type | string | Yes | "regular" or "custom" |
| fee_id | string | Yes | Fee template ID or custom fee ID |

### Expected Success Response (200)
```json
{
  "orderId": "order_XYZ789123",
  "amount": 5000.0,
  "currency": "INR"
}
```

### Expected Error Responses

**Payment gateway not configured (500):**
```json
{
  "error": "Payment gateway not configured"
}
```
> Triggered when `RAZORPAY_KEY_ID` or `RAZORPAY_KEY_SECRET` env vars are empty.

**Gateway rejected order (400):**
```json
{
  "error": "Gateway rejected order creation"
}
```

**Failed to save transaction (500):**
```json
{
  "error": "Failed to save transaction"
}
```

**Failed to parse gateway response (500):**
```json
{
  "error": "Failed to parse gateway response"
}
```

**Failed to contact gateway (500):**
```json
{
  "error": "Failed to contact payment gateway"
}
```

### Internal Flow
1. Environment variables `RAZORPAY_KEY_ID` aur `RAZORPAY_KEY_SECRET` check karta hai
2. Amount ko rupees se paise mein convert karta hai (`amount * 100`)
3. Razorpay API (`POST https://api.razorpay.com/v1/orders`) ko call karta hai with Basic Auth
4. Razorpay se `order_id` milne par `transactions` table mein entry create karta hai
5. Response mein `orderId`, `amount`, `currency` return karta hai

### Environment Variables
| Variable | Description |
|----------|-------------|
| RAZORPAY_KEY_ID | Razorpay API Key ID |
| RAZORPAY_KEY_SECRET | Razorpay API Key Secret |
| RAZORPAY_WEBHOOK_SECRET | Webhook HMAC verification secret |

### Database Table: `transactions`
| Column | Type | Description |
|--------|------|-------------|
| school_id | VARCHAR | School tenant |
| student_id | VARCHAR | Student ID |
| fee_type | VARCHAR | "regular" or "custom" |
| fee_id | VARCHAR | Linked fee ID |
| amount | DECIMAL | Transaction amount |
| currency | VARCHAR | Currency code |
| gateway_order_id | VARCHAR | Razorpay order ID |
| gateway_payment_id | VARCHAR | Razorpay payment ID (set on webhook) |
| gateway_signature | VARCHAR | Webhook signature (set on webhook) |
| status | VARCHAR | pending/completed |
| created_at | TIMESTAMPTZ | Created timestamp |
| completed_at | TIMESTAMPTZ | Completion timestamp |

### Rust Test Case
```rust
#[cfg(test)]
mod payment_create_order_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode, header},
    };
    use serde_json::json;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_create_order_gateway_not_configured() {
        // Clear Razorpay env vars to trigger error
        std::env::remove_var("RAZORPAY_KEY_ID");
        std::env::remove_var("RAZORPAY_KEY_SECRET");

        let app = crate::test_utils::create_test_app().await;

        let payload = json!({
            "amount": 5000.0,
            "student_id": "STD-99882",
            "fee_type": "regular",
            "fee_id": "tuition_june"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/payment/SCHOOL-001/create-order")
                    .method("POST")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(serde_json::to_string(&payload).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["error"], "Payment gateway not configured");
    }

    #[tokio::test]
    async fn test_create_order_missing_required_fields() {
        let app = crate::test_utils::create_test_app().await;

        // Missing student_id and fee_id
        let payload = json!({
            "amount": 5000.0,
            "fee_type": "regular"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/payment/SCHOOL-001/create-order")
                    .method("POST")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(serde_json::to_string(&payload).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        // Should fail with 422 (Axum deserialization error for missing required fields)
        assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    }

    #[tokio::test]
    async fn test_create_order_default_currency() {
        // Test with mock Razorpay server
        let mock_server = crate::test_utils::start_mock_razorpay_server().await;
        let app = crate::test_utils::create_test_app_with_razorpay_config(
            "test_key", "test_secret", &mock_server.uri()
        ).await;

        let payload = json!({
            "amount": 1000.0,
            "student_id": "STD-99882",
            "fee_type": "regular",
            "fee_id": "tuition_june"
            // currency omitted - should default to INR
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/payment/SCHOOL-001/create-order")
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

        assert!(json["orderId"].is_string());
        assert_eq!(json["amount"], 1000.0);
        assert_eq!(json["currency"], "INR");
    }
}
```

---

## 6B. Razorpay Payment Webhook

### Endpoint: `POST /api/school/:schoolId/finance/payment/webhook`
**Handler:** `payment::razorpay_webhook`  
**Auth:** HMAC-SHA256 signature verification (header: `x-razorpay-signature`)  
**Description:** Razorpay se payment success event receive karta hai. Signature verify karta hai, transaction complete karta hai, aur fee payment process karta hai.

### Request Headers
| Header | Required | Description |
|--------|----------|-------------|
| x-razorpay-signature | Yes | HMAC-SHA256 signature of the request body |
| Content-Type | Yes | application/json |

### Request Body (Razorpay Event Payload)
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_ABC123XYZ",
        "order_id": "order_XYZ789123",
        "amount": 500000,
        "currency": "INR",
        "status": "captured"
      }
    }
  }
}
```

### Expected Success Response (200)
```
OK
```
or
```
Duplicate webhook - already processed
```

### Expected Error Responses

**Missing signature (400):**
```
Missing signature
```

**Invalid signature (400):**
```
Invalid signature
```

**Invalid MAC setup (500):**
```
Invalid MAC setup
```

### Internal Flow
1. `x-razorpay-signature` header se signature extract karta hai
2. `RAZORPAY_WEBHOOK_SECRET` se HMAC-SHA256 signature verify karta hai
3. Event type check karta hai (`payment.captured` ya `order.paid`)
4. **Idempotency check:** `is_payment_processed(payment_id)` se check karta hai ki yeh payment already processed to nahi
5. `complete_online_transaction()` se transaction status `pending` → `completed` karta hai
6. `fee_service.pay_fee()` call karta hai webhook payment ke liye
7. `WebhookEngine.trigger("fee.paid")` se downstream webhooks fire karta hai

### Idempotency Guarantee
```rust
let already_processed = state.repos.transaction
    .is_payment_processed(payment_id)
    .await
    .unwrap_or(false);

if already_processed {
    return (StatusCode::OK, "Duplicate webhook - already processed").into_response();
}
```
Duplicate webhook events ko safely ignore karta hai. Agar Razorpay same event dubara bhejta hai, to 200 OK return karta hai bina double-processing ke.

### Rust Test Case
```rust
#[cfg(test)]
mod payment_webhook_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode, header},
    };
    use hex;
    use hmac::{Hmac, Mac};
    use serde_json::json;
    use sha2::Sha256;
    use tower::ServiceExt;

    fn compute_razorpay_signature(secret: &str, body: &[u8]) -> String {
        let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(body);
        hex::encode(mac.finalize().into_bytes())
    }

    #[tokio::test]
    async fn test_webhook_missing_signature() {
        let app = crate::test_utils::create_test_app().await;

        let payload = json!({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_test",
                        "order_id": "order_test"
                    }
                }
            }
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/payment/webhook")
                    .method("POST")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(serde_json::to_string(&payload).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_webhook_invalid_signature() {
        std::env::set_var("RAZORPAY_WEBHOOK_SECRET", "test_secret_123");
        let app = crate::test_utils::create_test_app().await;

        let payload = json!({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_test",
                        "order_id": "order_test"
                    }
                }
            }
        });

        let body_bytes = serde_json::to_vec(&payload).unwrap();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/payment/webhook")
                    .method("POST")
                    .header(header::CONTENT_TYPE, "application/json")
                    .header("x-razorpay-signature", "invalid_signature_here")
                    .body(Body::from(body_bytes))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_webhook_valid_signature() {
        let secret = "test_webhook_secret";
        std::env::set_var("RAZORPAY_WEBHOOK_SECRET", secret);
        let app = crate::test_utils::create_test_app_with_pending_transaction().await;

        let payload = json!({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_ABC123",
                        "order_id": "order_XYZ789",
                        "amount": 500000
                    }
                }
            }
        });

        let body_bytes = serde_json::to_vec(&payload).unwrap();
        let signature = compute_razorpay_signature(secret, &body_bytes);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/payment/webhook")
                    .method("POST")
                    .header(header::CONTENT_TYPE, "application/json")
                    .header("x-razorpay-signature", signature)
                    .body(Body::from(body_bytes))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_webhook_duplicate_idempotency() {
        let secret = "test_webhook_secret";
        std::env::set_var("RAZORPAY_WEBHOOK_SECRET", secret);
        let app = crate::test_utils::create_test_app_with_processed_payment().await;

        let payload = json!({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_ALREADY_DONE",
                        "order_id": "order_ALREADY_DONE"
                    }
                }
            }
        });

        let body_bytes = serde_json::to_vec(&payload).unwrap();
        let signature = compute_razorpay_signature(secret, &body_bytes);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/payment/webhook")
                    .method("POST")
                    .header(header::CONTENT_TYPE, "application/json")
                    .header("x-razorpay-signature", signature)
                    .body(Body::from(body_bytes))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let text = String::from_utf8(body.to_vec()).unwrap();

        assert!(text.contains("Duplicate webhook") || text.contains("already processed"));
    }

    #[tokio::test]
    async fn test_webhook_non_payment_event_ignored() {
        let secret = "test_webhook_secret";
        std::env::set_var("RAZORPAY_WEBHOOK_SECRET", secret);
        let app = crate::test_utils::create_test_app().await;

        // Event that is NOT payment.captured or order.paid
        let payload = json!({
            "event": "payment.failed",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_failed",
                        "order_id": "order_failed"
                    }
                }
            }
        });

        let body_bytes = serde_json::to_vec(&payload).unwrap();
        let signature = compute_razorpay_signature(secret, &body_bytes);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/school/SCHOOL-001/finance/payment/webhook")
                    .method("POST")
                    .header(header::CONTENT_TYPE, "application/json")
                    .header("x-razorpay-signature", signature)
                    .body(Body::from(body_bytes))
                    .unwrap(),
            )
            .await
            .unwrap();

        // Should still return 200 but not process payment
        assert_eq!(response.status(), StatusCode::OK);
    }
}
```

---

## 6C. User Dashboard Order Generation

### Endpoint: `POST /api/school/:schoolId/finance/user/order`
**Handler:** `payment::create_order` (same handler as 6A)  
**Auth:** None  
**Description:** Parent/User portal se payment order create karne ke liye dedicated route. Same behavior as 6A.

### Request/Response
Same as 6A - Create Online Payment Order. Uses same `CreateOrderRequest` struct and same handler function.

---

## Architecture: Payment Lifecycle

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Client   │────▶│ POST /order  │────▶│  Razorpay    │
│  (Parent) │     │ create_order │     │  API Gateway │
└──────────┘     └──────────────┘     └──────┬───────┘
                    │                        │
                    │ INSERT transactions    │
                    │ (status=pending)       │
                    ▼                        │
              ┌──────────┐                  │
              │ Postgres │                  │ payment.captured
              │   DB     │                  │ event
              └──────────┘                  │
                    ▲                        │
                    │                        ▼
                    │                 ┌──────────────┐
                    │ UPDATE          │ POST /webhook│
                    │ transactions    │ HMAC verify  │
                    │ (completed)     └──────────────┘
                    │
              ┌──────────┐
              │ IS idempotent check
              │ (is_payment_processed)
              └──────────┘
                    │
                    ▼
              ┌──────────┐
              │ pay_fee() │──▶ update student_invoices
              │ service   │    (pending -= amount)
              └──────────┘
                    │
                    ▼
              ┌──────────┐
              │ Webhook  │──▶ trigger("fee.paid")
              │ Engine   │
              └──────────┘
```

### Service Test Case (Unit)
```rust
#[cfg(test)]
mod payment_service_unit_tests {
    use super::*;
    use mockall::predicate::*;
    use serde_json::json;

    #[tokio::test]
    async fn test_pay_fee_via_webhook_service() {
        // Unit test for the fee service pay_fee method
        let mut mock_fee_repo = MockFeeRepository::new();
        let mut mock_student_repo = MockStudentRepository::new();
        let mut mock_audit_repo = MockAuditRepository::new();

        mock_fee_repo
            .expect_get_student_fee()
            .with(eq("SCHOOL-001"), eq("STD-99882"))
            .returning(|_, _| Ok(Some(json!({
                "studentId": "STD-99882",
                "totalFees": 15000.0,
                "pendingAmount": 5000.0,
                "discount": 0.0
            }))));

        mock_fee_repo
            .expect_update_student_fee()
            .with(eq("SCHOOL-001"), eq("STD-99882"), always())
            .returning(|_, _, _| Ok(()));

        mock_fee_repo
            .expect_add_fee_history()
            .returning(|_, _, _, _| Ok(()));

        mock_audit_repo
            .expect_insert_audit_log()
            .returning(|_, _, _, _, _, _| Ok(()));

        let repos = Repositories {
            fee: Arc::new(mock_fee_repo),
            student: Arc::new(mock_student_repo),
            audit: Arc::new(mock_audit_repo),
            ..Default::default()
        };

        let service = PostgresFeeService {
            repos: Arc::new(repos),
        };

        let result = service
            .pay_fee(
                "SCHOOL-001",
                "STD-99882",
                "razorpay_webhook",
                json!({
                    "amount": 5000.0,
                    "paymentMethod": "online",
                    "paymentReference": "pay_ABC123",
                    "date": "2026-06-21"
                }),
            )
            .await;

        assert!(result.is_ok());

        let fee_record = result.unwrap();
        assert_eq!(fee_record["pendingAmount"], 0.0);
    }

    #[tokio::test]
    async fn test_pay_fee_validation_exceeds_pending() {
        let mut mock_fee_repo = MockFeeRepository::new();
        mock_fee_repo
            .expect_get_student_fee()
            .returning(|_, _| Ok(Some(json!({
                "studentId": "STD-99882",
                "totalFees": 1000.0,
                "pendingAmount": 500.0,
                "discount": 0.0
            }))));

        let repos = Repositories {
            fee: Arc::new(mock_fee_repo),
            ..Default::default()
        };

        let service = PostgresFeeService {
            repos: Arc::new(repos),
        };

        let result = service
            .pay_fee(
                "SCHOOL-001",
                "STD-99882",
                "admin",
                json!({ "amount": 1000.0 }),
            )
            .await;

        assert!(result.is_err());

        match result.unwrap_err() {
            AppError::Validation(msg) => {
                assert!(msg.contains("exceeds"));
            }
            _ => panic!("Expected Validation error"),
        }
    }
}
```