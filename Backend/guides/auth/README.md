# Auth Domain Guide

This folder is the single source of truth for the authentication, onboarding, token, device, and school self-management APIs.

## Why this guide exists

A new developer should be able to read this folder and understand:

- Which auth endpoints exist.
- Which handler and service owns each endpoint.
- What request body, path params, query params, and headers are expected.
- What success and error responses should look like.
- Which test cases should be written or run before changing auth behavior.

## Folder map

```md
guides/auth/
  auth_guide.md
  README.md
  implementation_plan.md
  api/
    00-index.md
    01-login.md
    02-profile-selection.md
    03-support.md
    04-token-logout-security.md
    05-password-recovery.md
    06-device-registration.md
    07-setup.md
    08-school-self-management.md
    09-test-case-format.md
    10-test-data.md
```

## Source files

- Routes: `rust/src/domain/auth/mod.rs`
- Auth handlers: `rust/src/domain/auth/auth.rs`
- Setup handlers: `rust/src/domain/auth/setup.rs`
- School handlers: `rust/src/domain/auth/school.rs`
- Auth models: `rust/src/models/auth.rs`
- Auth service: `rust/src/services/auth/auth_service.rs`
- Setup service: `rust/src/services/auth/setup_service.rs`
- RLS/public route middleware: `rust/src/middleware/rls.rs`
- Error response mapping: `rust/src/error.rs`

## Reading order for freshers

1. Read `api/00-index.md` first for the endpoint map.
2. Read `01-login.md` to understand the base auth flow.
3. Read `07-setup.md` to understand school onboarding.
4. Read `04-token-logout-security.md` and `05-password-recovery.md` for token and credential flows.
5. Read `08-school-self-management.md` for school profile and school admin password management.
6. Use `09-test-case-format.md` and `10-test-data.md` while writing or reviewing tests.

## Documentation conventions

- Use the actual backend path with `/api` prefix.
- Use `TC_AUTH_<AREA>_<NNN>` for test case IDs.
- Document both expected success response and expected error response.
- If current code behavior differs from ideal product behavior, write it under **Current code notes**.
- Do not put real production passwords, tokens, or school credentials in these docs.
