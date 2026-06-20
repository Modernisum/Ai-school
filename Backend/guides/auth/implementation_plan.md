# Auth Guide Implementation Plan

This plan explains how the auth documentation was split and how future updates should be maintained.

## Goal

Create readable `.md` files under `guides/auth/` so a fresher developer can understand the auth backend without reading every Rust handler first.

## Source of truth

The real implementation lives in:

- `rust/src/domain/auth/mod.rs`
- `rust/src/domain/auth/auth.rs`
- `rust/src/domain/auth/setup.rs`
- `rust/src/domain/auth/school.rs`
- `rust/src/services/auth/auth_service.rs`
- `rust/src/services/auth/setup_service.rs`
- `rust/src/middleware/rls.rs`
- `rust/src/error.rs`

## Implementation phases

### Phase 1: Route inventory

Create `api/00-index.md` with every route from `rust/src/domain/auth/mod.rs:19-34`.

Covered routes:

- `POST /api/auth/:userType/login`
- `POST /api/auth/school/login`
- `POST /api/auth/:schoolId/user/select-profile`
- `POST /api/auth/school/support`
- `POST /api/auth/school/verify-token`
- `POST /api/auth/school/logout`
- `POST /api/auth/school/set-security`
- `POST /api/auth/school/forgot-password`
- `POST /api/auth/school/change-password`
- `POST /api/auth/school/verify-otp`
- `POST /api/auth/register-device`
- `POST /api/auth/setup/school`
- `GET /api/school/:schoolId`
- `PUT /api/school/:schoolId`
- `PATCH /api/school/:schoolId`

### Phase 2: Split endpoint contracts

Create grouped files:

- `01-login.md`
- `02-profile-selection.md`
- `03-support.md`
- `04-token-logout-security.md`
- `05-password-recovery.md`
- `06-device-registration.md`
- `07-setup.md`
- `08-school-self-management.md`

Each file should contain:

- Endpoint.
- Handler reference.
- Purpose.
- Auth requirement.
- Request body/path/query params.
- Expected success response.
- Expected error response.
- Important rules.
- Test cases.

### Phase 3: Shared test guidance

Create:

- `09-test-case-format.md`
- `10-test-data.md`

These files standardize test case IDs, curl style, assertions, and disposable test data rules.

### Phase 4: Link from overview

Update `auth_guide.md` so readers know the split API contract files are the detailed source of truth.

## Maintenance rules

- When a route is added to `rust/src/domain/auth/mod.rs`, update `api/00-index.md`.
- When request/response behavior changes, update the matching contract file and expected test cases.
- When a handler returns a new error status, document it.
- If production behavior intentionally differs from ideal behavior, document it under **Current code notes**.
- If docs mention public auth routes, verify `rust/src/middleware/rls.rs` before publishing.
- If docs mention tenant isolation, verify the handler/service actually compares token school with path `schoolId`.
- Never add real production credentials to docs.
