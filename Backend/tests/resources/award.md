# Resources API — Award Tests

> Base URL: `/api/school/{schoolId}/resources/awards`
> Auth: `X-School-ID` + `X-Admin-ID` headers (RLS middleware)
> Test school: `689225`

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│  routes/award.rs              HTTP Handler       │
│  (src/routes/award.rs)       Parse request       │
├──────────────────────────────────────────────────┤
│  services/award.rs           AwardService        │
│  (src/services/award.rs)    Business logic       │
├──────────────────────────────────────────────────┤
│  repository/award_repo.rs    SQL queries         │
│  (src/repository/award.rs)                       │
└──────────────────────────────────────────────────┘
```

---

## Award: List

- **Endpoint**: `GET /api/school/689225/resources/awards`
- **Method**: GET
- **Handler**: `award::list_awards` (`src/routes/award.rs:11`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/award.rs` | 17 | `service.award.list_awards(&school_id, student_id)` |
| 2. AwardService | `services/award.rs` | (search) | `self.repos.award.list_awards(school_id, student_id)` |
| 3. Repo impl | `repository/award.rs` | (search) | SQL: `SELECT * FROM awards WHERE school_id = $1` |

### Action Check — Bug Found! ❌
- **Worth it?** ✅ Yes — student achievement tracking
- **Bug?** ❌ **`create_award` handler is DEAD CODE** — exists at `routes/award.rs:22` but NOT registered in `domain/resources.rs`. The route is missing.
- **Bug?** ❌ Awards module is in `resources` domain but logically belongs to `people` or `academic` domain
- **Fix**: Either register the `create_award` route or remove the dead code

### Usage
```bash
# All awards
curl -s "http://localhost:8080/api/school/689225/resources/awards" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .

# By student
curl -s "http://localhost:8080/api/school/689225/resources/awards?student_id=STU001" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## ⚠️ All Issues Found

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | `create_award` handler exists but route NOT registered | **High** | Register it or remove dead code |
| 2 | Awards in "resources" domain but belong to "people" | Medium | Move to `people` module |
| 3 | No update/delete award endpoints | Low | May not be needed (immutable records) |
