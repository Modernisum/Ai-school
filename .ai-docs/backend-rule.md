# Backend Architecture & Development Rules

## 1. Overview
**Tech Stack:** Rust (2021), Axum Framework, PostgreSQL (with pgvector & RLS), Redis.
**Architecture:** Hexagonal Architecture.
**Constraint:** Strict 500-line limit per file. Clean Code principles apply.
**Automation:** "Test-Driven Fixes" using Bruno CLI and Roo Code.

## 2. Core Structure
- **Location**: `Backend/`
- **Framework**: Axum web framework
- **Database**: PostgreSQL (Primary), Redis (Cache), pgvector (AI Embeddings)

## 3. Key Directories
- `src/routes/` - API route handlers (The "Drivers")
- `src/services/` - Business logic services (The "Core")
- `src/repository/` - Database repositories (The "Adapters")
- `src/db.rs` - Database connection pool configuration
- `migrations/` - SQLx migration files
- `tests/bruno/` - **CRITICAL:** The Single Source of Truth for API testing. Contains all `.bru` files.

## 4. Testing & Automation Rules (Strict)
- **The "Bru-First" Mandate:** Whenever an API is created or modified, a corresponding test file MUST be created in `tests/bruno/`.
- **Format:** Use `.bru` extension (NOT .burn).
- **Assertions:** Every test must verify:
  1. `res.status` (HTTP Codes)
  2. `res.body` structure (JSON Schema)
  3. Business Logic (e.g., "Balance cannot be negative")
- **No Manual Testing:** Do not use cURL or Postman UI manually.
- **Command:** Tests are verified via `bru run tests/bruno/ --env local`.

## 5. Agent Protocol (Instructions for Roo Code/AI)
*This section dictates how the AI Agent must behave.*

1. **TRIGGER:** After writing or modifying code, you MUST run the verification suite.
2. **ACTION:** Execute command: `bru run tests/bruno/ --env local`
3. **LOOP LOGIC:**
   - **IF FAIL:** Read the CLI error log -> Identify the Rust file causing the break -> Fix the code -> **RE-RUN** `bru run` immediately.
   - **IF PASS:** Only then is the task considered "Complete".
4. **CONSTRAINT:** Do not ask for user verification. Rely on the green checkmarks from Bruno.

## 6. Multi-tenancy & Database
- **Isolation:** Each school operates in a separate PostgreSQL Schema.
- **Security:** RLS (Row Level Security) policies MUST enforce data separation.
- **AI Data:** Use `pgvector` for semantic search within the same Postgres instance.

## 7. API Design & Error Handling
- **Style:** RESTful endpoints with standardized JSON responses.
- **Auth:** JWT Tokens (with expiration).
- **Errors:** 
  - Use `thiserror` crate for typed definitions.
  - Map `AppError` enum to correct HTTP Status Codes.
  - **Response Format:** `{ "status": "error", "message": "..." }`

## 8. Performance & Security
- **Async:** Use `tokio` and `async/await` for all I/O operations.
- **Safety:** All SQL queries MUST use SQLx prepared statements (No string concatenation).
- **Validation:** Input validation occurs before the Service layer.
