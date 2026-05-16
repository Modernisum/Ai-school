# Test Suite Documentation

## Overview
This directory contains a **one‑click** test suite for all backend API routes of the Vidhyam School Management System. The suite is implemented in Bash using `curl` and can be run with a single command.

## Prerequisites
- **Running backend server** (`cargo run` or equivalent) listening on the URL defined in `test_config.sh`.
- **Environment variables** set in `test_config.sh`:
  - `BASE_URL` – Base URL of the API (e.g., `http://localhost:8080`).
  - `SCHOOL_ID` – Identifier of the school you are testing against.
  - Authentication credentials for:
    - **Admin** (`ADMIN_USERNAME`, `ADMIN_PASSWORD`)
    - **School** (`SCHOOL_USERNAME`, `SCHOOL_PASSWORD`)
    - **Student** (`STUDENT_USERNAME`, `STUDENT_PASSWORD`)
- **Test data** seeded in the database (run any migration/seed scripts provided by the project).

## Running the Tests
```bash
# From the repository root
chmod +x Backend/tests/*.sh   # Ensure scripts are executable
./Backend/tests/test_all_routes.sh
```
The script will:
1. Load configuration (`test_config.sh`).
2. Authenticate each user role and store JWT tokens.
3. Execute health checks, authentication, CRUD, file‑upload, WebSocket, and security tests.
4. Output clear **PASS/FAIL** messages with a summary at the end.

## Test Structure
- `test_config.sh` – Holds URLs, IDs, and credentials.
- `test_utils.sh` – Helper functions for logging, assertions, and authentication.
- `test_all_routes.sh` – Master runner that sources the above files and sequentially calls each module test.
- Individual module test files (e.g., `test_auth.sh`, `test_student.sh`, `test_attendance.sh`, …) are sourced by `test_all_routes.sh` and focus on a specific functional area.

## Adding New Tests
1. Create a new `test_<feature>.sh` file in this directory.
2. Follow the existing pattern:
   ```bash
   source "$(dirname "$0")/test_utils.sh"
   
   function test_new_feature() {
       log "Testing New Feature..."
       # Example request
       response=$(curl -s -X GET "$BASE_URL/new_feature/$SCHOOL_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
       assert_status 200 "$response"
   }
   ```
3. Add a call to `test_new_feature` in `test_all_routes.sh` under the appropriate section.

## Debugging Failing Tests
- The script prints the request and response details for any failed assertion.
- Check that the server is running and the correct `BASE_URL` is set.
- Verify that the required test data exists in the database.
- Use `./Backend/tests/test_<module>.sh` directly to isolate failures.

## Continuous Integration
The test suite can be integrated into CI pipelines:
```yaml
- name: Run Backend API Tests
  run: |
    chmod +x Backend/tests/*.sh
    ./Backend/tests/test_all_routes.sh
```
Ensure the CI environment provides the same environment variables as `test_config.sh`.

---
**Happy testing!**