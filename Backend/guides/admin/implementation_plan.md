# Platform Admin Implementation Plan

Use this plan when adding, changing, or fixing any admin endpoint under `rust/src/domain/admin/mod.rs`.

## 1. Read the route first

Start from:

```text
rust/src/domain/admin/mod.rs
```

The route table is the source of truth for:

- HTTP method
- Path
- Handler module
- Path params
- Query params
- Whether the route is public or admin-protected

Example:

```rust
.route("/schools/:schoolId/status", patch(school::set_school_status))
```

This means:

```text
PATCH /api/admin/schools/:schoolId/status
handler = school::set_school_status
```

## 2. Confirm handler behavior

Open the handler file:

- `auth.rs`
- `billing.rs`
- `promo.rs`
- `system.rs`
- `school.rs`
- `support.rs`

Check:

1. Does the handler call `require_admin!`?
2. Does it validate required fields?
3. Does it return `ok_json!` for success?
4. Does it return `err_json!` for service errors?
5. Does it return an explicit `StatusCode` for validation errors?

Most protected handlers should look like:

```rust
let svc = require_admin!(headers, state);
match svc.some_action().await {
    Ok(data) => ok_json!(data),
    Err(e) => err_json!(e),
}
```

## 3. Add or update the route

For a new endpoint, add it to the correct group in `rust/src/domain/admin/mod.rs`.

Example:

```rust
.route("/schools/:schoolId/session", patch(school::set_session_duration))
```

Keep routes grouped by domain:

- Auth
- Dashboard Stats
- Churn Radar
- Promos
- Config
- Schools CRUD
- Support
- Global Backup
- Global Notifications
- CMS Admin

## 4. Add handler and service logic

Typical folder flow:

```text
domain/admin/<module>.rs
services/admin/<module>.rs
repository/admin/<module>.rs or repository/traits/<module>.rs
models/<domain>.rs, if a typed request model is needed
```

Recommended flow:

1. Parse/validate request in the handler.
2. Keep business rules in `services/admin`.
3. Keep SQL/data access in repositories.
4. Use `AppError` where possible instead of raw string errors.
5. Avoid hardcoded admin credentials.
6. Never bulk-delete tenant data without checking school id and status.

## 5. Define expected response shape

Before writing tests, decide the response contract.

Most admin endpoints should return:

```json
{
  "success": true,
  "data": {}
}
```

Validation errors should usually return:

```json
{
  "success": false,
  "message": "Human readable error"
}
```

If an endpoint returns a file, document the real response:

```http
Content-Type: application/json
Content-Disposition: attachment; filename="school_SCH-00021_backup.json"
```

## 6. Update documentation

After changing routes or responses, update these files:

```text
guides/admin/endpoint_reference.md
guides/admin/test_cases.md
guides/admin/admin_guide.md, if architecture or feature purpose changes
```

For every changed endpoint, update:

- Method and path
- Handler name
- Auth requirement
- Request body or query params
- Success response
- Common error response
- Test case id and curl command

## 7. Add or update tests

Use `guides/admin/test_cases.md` as the manual test checklist.

Minimum test coverage for a new endpoint:

1. Success case with valid admin token.
2. Missing/invalid auth case.
3. Missing required field case, if the endpoint has a body.
4. Invalid field value case, if the endpoint validates values.
5. Service/database failure case, if easy to simulate.

For destructive endpoints like delete, backup restore, or session expiry:

- Run only in disposable test data.
- Document the destructive effect in the test case.

## 8. Run local checks

Use the Rust backend commands from the project setup. At minimum:

```bash
cargo fmt
cargo check
```

If tests are available for the workspace, run:

```bash
cargo test
```

If the project uses a specific test database setup, run those migrations/seeds before API tests.

## 9. Definition of done

A platform admin endpoint change is done when:

- Route exists in `rust/src/domain/admin/mod.rs`.
- Handler is in the correct admin module.
- Protected endpoints use `require_admin!`.
- Request validation is clear and tested.
- Success and error responses match `guides/admin/endpoint_reference.md`.
- Manual tests are added to `guides/admin/test_cases.md`.
- `cargo fmt` passes.
- `cargo check` passes.
- Destructive tests are clearly marked as disposable/test-only.
