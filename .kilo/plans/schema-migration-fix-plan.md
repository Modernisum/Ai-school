# Backend Schema Migration Fix Plan — `202607010000_initial_schema.sql`

## Goal

Fix the initial PostgreSQL schema dump so it can be safely used as a backend migration. The current file is a `pg_dump`-style schema with psql meta-commands, role grants, broken views, broken PL/pgSQL functions/triggers, security leaks, missing RLS coverage, and data-model integrity gaps.

Target outcome:

1. Migration applies cleanly to a fresh PostgreSQL 16 database.
2. No psql-only meta-commands remain in executable SQL.
3. No broken views/functions/triggers remain.
4. Sensitive data is not exposed through grants or plaintext storage.
5. Tenant isolation is enforced through RLS.
6. Missing FKs, duplicate constraints, and duplicate indexes are cleaned up.
7. Backend can run against the migrated schema without runtime trigger/function failures.

---

## Phase 0 — Preparation and Safe Baseline

### 0.1 Create backup and branch

**Action**

- Take a DB backup before touching production/staging:

```bash
pg_dump --schema-only --no-owner --no-privileges -f backup_initial_schema.sql <db>
pg_dump --data-only --exclude-table=schema_migrations -f backup_data.sql <db>
```

- Work on a dedicated Git branch, for example:

```text
fix/initial-schema-migration
```

### 0.2 Do not edit the dump directly

**Reason**

`migrations/202607010000_initial_schema.sql` is a generated dump. Direct edits are hard to maintain.

**Plan**

- Keep the dump as reference only.
- Generate a cleaned migration set from it.
- Recommended file split:

```text
migrations/
  202607010000_initial_schema.sql              # keep as historical reference only
  202607010001_roles_extensions.sql
  202607010002_types_functions.sql
  202607010003_tables_constraints.sql
  202607010004_views_indexes_triggers.sql
  202607010005_rls_policies.sql
  202607010006_grants.sql
  202607010007_security_integrity_fixes.sql
```

If the backend migration runner only supports one file, combine these into one migration but keep sections clearly separated.

### 0.3 Define migration execution rules

**Rules**

- Run PostgreSQL migrations with error-stop behavior.
- Do not run partial migrations manually in production.
- Wrap schema changes in transactions where PostgreSQL DDL supports rollback.
- For large index creation on existing data, use `CREATE INDEX CONCURRENTLY` only when the table is already live and migration framework allows it.

---

## Phase 1 — Make the Dump Migration-Safe

### 1.1 Remove psql meta-commands

**Current issue**

Lines 5 and 14278 contain:

```sql
\restrict ...
\unrestrict ...
```

These are `psql` meta-commands, not SQL.

**Fix**

Remove both lines from executable migration SQL.

**Validation**

Search for remaining meta-commands:

```sql
-- no \restrict, \unrestrict, \set, \i, \copy should remain
```

### 1.2 Remove or separate ownership statements

**Current issue**

The dump contains many statements like:

```sql
ALTER TABLE public.foo OWNER TO postgres;
ALTER SEQUENCE public.foo_id_seq OWNER TO postgres;
ALTER VIEW public.foo OWNER TO postgres;
```

These can fail under a non-superuser migration user.

**Fix**

- Remove ownership changes from normal migration.
- If ownership is required, handle separately with a DBA/admin migration.

### 1.3 Remove or separate ACL/grant statements

**Current issue**

The dump grants `SELECT` on sensitive tables to roles that may not exist and may be too broad.

Examples:

- `encryption_keys` grants key material access.
- `auth` grants password access.
- `webhook_endpoints` grants webhook secret access.

**Fix**

- Remove all `GRANT` statements from the main schema migration.
- Create a separate `005_grants.sql` after security review.
- Create roles explicitly before granting.

Roles currently referenced:

```text
ai_readonly_role
developer_audit
developer_readonly
developer_data_engineer
developer_emergency
```

### 1.4 Create required roles explicitly

**Plan**

In `001_roles_extensions.sql`:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ai_readonly_role') THEN
    CREATE ROLE ai_readonly_role NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'developer_audit') THEN
    CREATE ROLE developer_audit NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'developer_readonly') THEN
    CREATE ROLE developer_readonly NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'developer_data_engineer') THEN
    CREATE ROLE developer_data_engineer NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'developer_emergency') THEN
    CREATE ROLE developer_emergency NOLOGIN;
  END IF;
END
$$;
```

**Security note**

Only grant least-privilege access after sensitive columns are protected or masked.

---

## Phase 2 — Fix Migration-Blocking SQL Objects

### 2.1 Fix `ai_provider_status` view

**Current issue**

- View: `public.ai_provider_status`, lines 1540-1559.
- Table column: `ai_provider_health.is_healthy`, line 1420.
- View incorrectly references `h.healthy`.

**Fix**

Replace:

```sql
h.healthy
```

with:

```sql
h.is_healthy
```

Also update `GROUP BY` to use `h.is_healthy`.

### 2.2 Fix `developer_students_view`

**Current issue**

- View: `public.developer_students_view`, lines 3381-3417.
- Students table has `is_transport_enabled`, line 3344.
- View references non-existent `transport_enabled`, line 3417.

**Fix**

Replace:

```sql
transport_enabled,
```

with:

```sql
is_transport_enabled AS transport_enabled,
```

or change the API to use `is_transport_enabled`.

### 2.3 Review developer views for write grants

**Current issue**

`developer_students_view` and `developer_employees_view` are granted `SELECT,INSERT,UPDATE` to `developer_emergency`.

**Fix**

- Remove `INSERT,UPDATE` grants from complex views unless the views are intentionally updatable.
- Prefer direct table access through backend services.

---

## Phase 3 — Fix Broken Functions and Triggers

### 3.1 Fix `log_developer_access_activity()`

**Current issue**

Function lines 721-759 uses columns that do not exist on `developer_access_grants`:

```text
NEW.target_school_id
NEW.role
NEW.duration_minutes
```

`developer_access_grants` has:

```text
id
request_id
developer_id
granted_role
pg_role_name
start_time
end_time
is_active
revoked_at
revocation_reason
created_at
```

**Fix options**

Option A — Use existing columns:

```sql
COALESCE('system'::text, 'system') AS target_school_id
jsonb_build_object(
  'role', NEW.granted_role,
  'duration_minutes', EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60
)
```

Option B — Add missing columns to `developer_access_grants` if business logic needs them:

```sql
target_school_id character varying(255)
role character varying(50)
duration_minutes integer
```

Recommended: Option A unless backend already depends on these columns.

### 3.2 Fix `log_encryption_key_usage()`

**Current issue**

Function lines 768-804 uses missing columns:

```text
NEW.key_name
NEW.algorithm
NEW.key_size
```

`encryption_keys` has:

```text
key_id
key_material
key_material_encrypted_with
key_type
key_usage
key_status
metadata
created_by
```

**Fix**

Use existing fields:

```sql
NEW.key_id,
jsonb_build_object(
  'algorithm', NEW.key_type,
  'key_size', octet_length(NEW.key_material) * 8,
  'metadata', NEW.metadata
)
```

### 3.3 Fix `apply_retention_policies()`

**Current issues**

1. Sets `dsar_requests.status = 'archived'`, but `dsar_requests` status check does not allow `archived`.
2. Ignores `retention_policies.retention_period_months`.
3. Hardcodes retention periods:
   - audit logs: 6 months
   - DSAR: 1 year
   - consent: 7 years

**Fix**

- Add `archived` to `dsar_requests` status check only if product requires archived DSAR state.
- Or better, add a separate `archived_at timestamp with time zone` column and keep `status` as `completed`.
- Use `retention_policies.retention_period_months` instead of hardcoded intervals.

Example direction:

```sql
ALTER TABLE public.dsar_requests
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;
```

Then:

```sql
UPDATE dsar_requests
SET status = 'completed',
    archived_at = NOW()
WHERE school_id = r.school_id
  AND status = 'completed'
  AND completed_date < NOW() - (r.retention_period_months || ' months')::interval;
```

### 3.4 Fix `check_conditional_approval_expiration()`

**Current issue**

Function lines 239-249 uses:

```sql
ca.auto_reject = TRUE
```

But column is:

```text
is_auto_reject_enabled
```

**Fix**

Replace:

```sql
ca.auto_reject = TRUE
```

with:

```sql
ca.is_auto_reject_enabled = TRUE
```

### 3.5 Fix `check_ssl_enabled()`

**Current issue**

Function lines 294-313 checks `information_schema.views` for `pg_stat_ssl`. `pg_stat_ssl` is a PostgreSQL system view.

**Fix**

Use:

```sql
IF to_regclass('pg_catalog.pg_stat_ssl') IS NOT NULL THEN
```

or query `pg_stat_ssl` directly and handle permission errors.

### 3.6 Fix `generate_ssl_recommendations()`

**Current issue**

Function returns invalid PostgreSQL setting:

```sql
ALTER SYSTEM SET require_ssl = on;
```

PostgreSQL does not have `require_ssl`.

**Fix**

Remove that recommendation. Keep valid settings:

```sql
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_min_protocol_version = 'TLSv1.2';
ALTER SYSTEM SET ssl_ciphers = 'HIGH:!aNULL:!MD5';
```

---

## Phase 4 — Security Hardening

### 4.1 Stop exposing encryption keys

**Current issue**

`encryption_keys.key_material` stores raw key material in plaintext, and the table is granted to readonly/audit roles.

**Fix**

- Remove all grants on `encryption_keys`.
- Do not expose raw key material to app roles.
- Store only encrypted key material or KMS reference.
- Add rotation/backfill plan for existing plaintext keys.

Recommended schema direction:

```sql
ALTER TABLE public.encryption_keys
ADD COLUMN key_material_encrypted bytea,
ADD COLUMN kms_key_id character varying(255),
ADD COLUMN key_material_plaintext_removed_at timestamp with time zone;
```

Then migrate existing keys out of DB and null out `key_material` after backend supports the new flow.

### 4.2 Fix `auth` table

**Current issue**

`auth.password` is `text` and granted to readonly/audit roles.

**Fix**

- If this stores plaintext passwords, replace with `password_hash`.
- Remove grants on `auth`.
- Add migration path:

```sql
ALTER TABLE public.auth
ADD COLUMN password_hash text,
ADD COLUMN password_migrated_at timestamp with time zone;
```

- Backfill only if existing values are already hashes.
- If existing values are plaintext, force password reset flow instead of hashing in migration.

### 4.3 Protect webhook secrets

**Current issue**

`webhook_endpoints.secret` is granted to readonly/audit roles.

**Fix**

- Remove grants on `webhook_endpoints`.
- If UI needs to display secrets, return one-time masked values through backend only.
- Consider storing encrypted secret or KMS reference.

### 4.4 Rebuild grants with least privilege

**Plan**

Create a new grant file after all sensitive tables are reviewed.

Recommended baseline:

- `ai_readonly_role`: only non-sensitive operational tables/views.
- `developer_audit`: audit logs and non-secret metadata only.
- `developer_readonly`: masked developer views only.
- `developer_data_engineer`: masked developer views only.
- `developer_emergency`: no direct table grants unless approved and time-bound.

Do not grant:

```text
encryption_keys
auth
webhook_endpoints.secret
students direct sensitive columns
employees direct sensitive columns
```

### 4.5 Fix dynamic SQL role creation

**Current issue**

`grant_developer_access()` and `revoke_developer_access()` build unquoted role names.

**Fix**

- Validate role name format.
- Use `format('%I', role_name)` for identifiers.
- Never concatenate raw user input into DDL.

---

## Phase 5 — RLS and Tenant Isolation

### 5.1 Standardize RLS setting names

**Current issue**

Some policies use:

```sql
app.current_school_id
```

Some use:

```sql
app.school_id
```

**Fix**

Standardize on one setting:

```text
app.current_school_id
```

Update policies that currently use `app.school_id`.

### 5.2 Add missing RLS policies

**Tables needing review/addition**

At minimum:

```text
complaints
global_users
webhook_endpoints
webhook_delivery_logs
user_device_tokens
user_activity_logs
retention_policies
report_generation_logs
school_access_requests
support_requests
billing_ledger
auth
auth_logs
tokens
plagiarism_cache
reminder_items
```

### 5.3 Add explicit `WITH CHECK` policies

For insert/update-capable tenant tables, avoid relying on implicit behavior.

Pattern:

```sql
CREATE POLICY tenant_isolation_policy ON public.example_table
USING (school_id = current_setting('app.current_school_id', true))
WITH CHECK (school_id = current_setting('app.current_school_id', true));
```

For super-admin access:

```sql
USING (
  school_id = current_setting('app.current_school_id', true)
  OR current_setting('app.is_super_admin', true) = 'true'
)
WITH CHECK (
  school_id = current_setting('app.current_school_id', true)
  OR current_setting('app.is_super_admin', true) = 'true'
);
```

### 5.4 Enable and force RLS consistently

**Plan**

For tenant-scoped tables:

```sql
ALTER TABLE public.example_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.example_table FORCE ROW LEVEL SECURITY;
```

Use `FORCE` only when table owners must also be constrained.

### 5.5 RLS validation tests

Create test roles and verify:

```sql
SET ROLE tenant_role;
SET app.current_school_id = 'school_a';

SELECT count(*) FROM public.students WHERE school_id = 'school_b'; -- must be 0
INSERT INTO public.students (...) VALUES (... school_id='school_b' ...); -- must fail
```

Also test super-admin bypass:

```sql
SET app.is_super_admin = 'true';
```

---

## Phase 6 — Data Integrity and FK Cleanup

### 6.1 Add missing foreign keys

Add FKs where safe.

Priority list:

| Table | Missing relationship | Recommended FK |
|---|---|---|
| `reminder_items` | reminder | `(school_id, reminder_id)` to `reminders(school_id, reminder_id)` after adding unique constraint |
| `responsibility_coverage` | responsibility | `(school_id, responsibility_id)` to `responsibilities(school_id, responsibility_id)` |
| `leave_notifications` | leave application | `(school_id, leave_id)` to `leave_applications(school_id, leave_id)` after adding leave_id if needed |
| `space_employees` | space/employee | `(school_id, space_name)` to `spaces(school_id, name)` or canonical space_id |
| `space_material_requirements` | space/material | `(school_id, space_name)` and `(school_id, material_name)` |
| `space_materials` | space/material | `(school_id, space_name)` and `(school_id, material_name)` |
| `space_requirements` | space/responsibility | `(school_id, space_name)` and `(school_id, responsibility_id)` |

### 6.2 Fix identifier inconsistency

**Current issues**

- `spaces.id` is varchar with integer sequence.
- `spaces.space_id` exists but is nullable and not unique.
- `items` primary key uses `space_name`, while unique index uses `space_id`.
- `school_id` length varies: `varchar(50)`, `varchar(100)`, `varchar(255)`, `text`, and plain `character varying`.

**Fix plan**

- Decide canonical identifiers:
  - `spaces.id` vs `spaces.space_id`
  - `items.space_name` vs `items.space_id`
- Add unique constraints on canonical IDs.
- Normalize `school_id` length across tenant tables if feasible.
- For existing production DB, do this in backward-compatible steps:
  1. Add canonical column nullable.
  2. Backfill from existing column.
  3. Add unique index.
  4. Update backend.
  5. Drop old column later.

### 6.3 Remove duplicate constraints and indexes

Remove or skip creation of duplicates:

```text
employee_responsibilities_pkey vs uk_employee_responsibilities_unique_assignment
employees_school_id_employee_id_key vs uk_employees_school_employee
idx_ai_query_cache_embedding vs idx_ai_query_cache_embedding_hnsw
idx_ai_bg_jobs_status vs idx_ai_background_jobs_status
idx_global_users_phone vs user_activity_logs_phone_idx / idx_user_activity_phone
idx_classes_school_id_unique vs classes_pkey
idx_subjects_school_id_unique vs subjects_pkey
idx_materials_school_name_unique vs unique_school_material_name
idx_space_materials_composite_unique vs space_materials_school_space_mat_unique
idx_space_categories_school_name vs space_categories_school_id_name_key
```

### 6.4 Review redundant unique constraints

`responsibilities.responsibility_id` is globally unique, so this may be redundant:

```sql
UNIQUE (school_id, responsibility_id)
```

Decide whether responsibility IDs should be global or school-scoped.

---

## Phase 7 — Migration Execution Strategy

### 7.1 Validate on empty database first

Use a temporary database:

```bash
createdb modernisum_schema_test
psql -d modernisum_schema_test -v ON_ERROR_STOP=1 -f migrations/202607010001_roles_extensions.sql
psql -d modernisum_schema_test -v ON_ERROR_STOP=1 -f migrations/202607010002_types_functions.sql
psql -d modernisum_schema_test -v ON_ERROR_STOP=1 -f migrations/202607010003_tables_constraints.sql
psql -d modernisum_schema_test -v ON_ERROR_STOP=1 -f migrations/202607010004_views_indexes_triggers.sql
psql -d modernisum_schema_test -v ON_ERROR_STOP=1 -f migrations/202607010005_rls_policies.sql
psql -d modernisum_schema_test -v ON_ERROR_STOP=1 -f migrations/202607010006_grants.sql
psql -d modernisum_schema_test -v ON_ERROR_STOP=1 -f migrations/202607010007_security_integrity_fixes.sql
```

### 7.2 Validate on cloned production-like data

After empty DB passes:

1. Restore sanitized production-like data.
2. Run migration.
3. Run smoke tests:
   - Insert `encryption_keys`.
   - Insert `developer_access_grants`.
   - Insert `dsar_requests`.
   - Insert `conditional_approvals`.
   - Query all fixed views.
   - Query RLS-protected tables as tenant role.
   - Query RLS-protected tables as super-admin role.

### 7.3 Backend smoke tests

Minimum backend checks:

```text
POST/PUT developer access grant
POST/PUT encryption key
POST DSAR request
POST conditional approval
GET ai_provider_status
GET developer_students_view through backend-safe query/view
GET student attendance pattern
GET compliance dashboard
```

### 7.4 Rollback plan

For each migration file, document rollback SQL.

For destructive changes:

- Do not drop columns in first migration.
- Use `ADD COLUMN`, backfill, switch backend, then drop later.
- For revoked grants, keep rollback grant statements in migration history.
- For key rotation, keep old keys decryptable until all data is re-encrypted.

---

## Phase 8 — Performance and Maintainability Cleanup

### 8.1 Remove unused sequences

Review and remove if truly unused:

```text
employee_id_seq
student_id_seq
school_code_seq
```

Only remove after confirming no backend or manual process depends on them.

### 8.2 Add partitioning plan for high-volume tables

High-volume tables needing partitioning/retention strategy:

```text
audit_events
attendance
ai_usage_logs
encryption_audit_log
developer_activity_audit
webhook_delivery_logs
```

Initial approach:

- Add retention policies.
- Add partitioning only after migration stability.
- Avoid combining partitioning with security fixes in the same high-risk migration.

### 8.3 Add indexes only where needed

After duplicate index cleanup:

- Run `EXPLAIN ANALYZE` for core tenant queries.
- Add missing indexes for RLS-filtered queries:
  - `(school_id, created_at DESC)`
  - `(school_id, status, due_date)`
  - `(school_id, user_id, date)`
  - `(school_id, student_id, academic_year, term)`

---

## Phase 9 — Acceptance Criteria

Migration is ready only when all criteria pass.

### Schema validation

- No `\` psql meta-commands remain.
- No `OWNER TO` statements remain in normal migration.
- All referenced roles exist before grants.
- All views compile.
- All functions compile.
- All triggers can fire successfully.

### Runtime validation

- Inserting `developer_access_grants` succeeds.
- Inserting `encryption_keys` succeeds.
- `apply_retention_policies()` runs without status constraint errors.
- `check_conditional_approval_expiration()` runs without missing-column errors.
- `ai_provider_status` view returns rows.
- `developer_students_view` returns rows.

### Security validation

- Readonly roles cannot read:
  - encryption key material
  - auth passwords/password hashes
  - webhook secrets
- Tenant role cannot read another school's rows.
- Tenant role cannot insert rows for another school.
- Super-admin can access all schools only when explicitly allowed.

### Integrity validation

- Missing FKs are added or documented with reason.
- Duplicate constraints/indexes are removed.
- Canonical identifier strategy is documented.
- Migration has rollback SQL for each destructive or security-sensitive change.

---

## Recommended Implementation Order

1. Split dump into migration-safe files.
2. Remove psql meta-commands, owner statements, and unsafe grants.
3. Create roles/extensions.
4. Fix broken views.
5. Fix broken functions/triggers.
6. Harden secrets and auth storage.
7. Add/fix RLS policies.
8. Add missing FKs and remove duplicate constraints/indexes.
9. Validate on empty DB.
10. Validate on sanitized production-like DB.
11. Run backend smoke tests.
12. Deploy to staging.
13. Deploy to production with backup and rollback ready.
