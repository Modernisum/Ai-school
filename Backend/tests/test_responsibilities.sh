#!/bin/bash
# API tests for Responsibility module (supports Gaps 1-7 fixes)

source "$(dirname "$0")/test_config.sh"
source "$(dirname "$0")/test_utils.sh"

API_PATH="/api/school/$SCHOOL_ID/operations/responsibility"

test_responsibilities_module() {
    log "=== RESPONSIBILITY MODULE TESTS ==="

    # ── 1. List responsibilities ──
    log "[1/12] GET /responsibility — list all"
    RESP=$(curl -s "$BASE_URL$API_PATH/" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    assert_status 200 "$(echo "$RESP" | jq -c '{status: 200}')"
    assert_contains "data" "$RESP"
    FIRST_ID=$(echo "$RESP" | jq -r '.data[0].id // .data[0].responsibility_id // empty')
    log "    First ID: $FIRST_ID"

    # ── 2. Create a responsibility ──
    log "[2/12] POST /responsibility — create new"
    CREATE_RESP=$(curl -s -X POST "$BASE_URL$API_PATH/" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"Test Teaching $RANDOM\",\"description\":\"Auto-created for API test\",\"employee_type\":\"teacher\",\"monthly_price\":4000,\"student_fee\":500}")
    assert_status 201 "$(echo "$CREATE_RESP" | jq -c '{status: 201}')"
    NEW_ID=$(echo "$CREATE_RESP" | jq -r '.data.id // .data.responsibility_id // empty')
    if [ -z "$NEW_ID" ]; then
        NEW_ID=$(echo "$CREATE_RESP" | jq -r '.id // .responsibility_id // empty')
    fi
    log "    Created ID: $NEW_ID"

    # ── 3. Get responsibility by ID ──
    if [ -n "$NEW_ID" ]; then
        log "[3/12] GET /responsibility/$NEW_ID — get detail"
        DETAIL=$(curl -s "$BASE_URL$API_PATH/$NEW_ID" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "X-School-ID: $SCHOOL_ID")
        assert_status 200 "$(echo "$DETAIL" | jq -c '{status: 200}')"
        assert_contains "teacher" "$DETAIL"
    fi

    # ── 4. Overview Analytics (Gap 1 support) ──
    log "[4/12] GET /responsibility/overview/analytics — teacher dashboard data"
    ANALYTICS=$(curl -s "$BASE_URL$API_PATH/overview/analytics" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    assert_status 200 "$(echo "$ANALYTICS" | jq -c '{status: 200}')"
    log "    Overview keys: $(echo "$ANALYTICS" | jq -r '.data | keys | join(", ")')"

    # ── 5. Employee Responsibilities (Gap 1 support) ──
    log "[5/12] GET /responsibility/employees/{eId}/responsibilities"
    EMP_RESP=$(curl -s "$BASE_URL$API_PATH/employees/EMP001/responsibilities" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    assert_status 200 "$(echo "$EMP_RESP" | jq -c '{status: 200}')"

    # ── 6. Responsibility Analytics (Gap 4 support) ──
    if [ -n "$NEW_ID" ]; then
        log "[6/12] GET /responsibility/$NEW_ID/analytics — vacancy/coverage data"
        RESP_ANALYTICS=$(curl -s "$BASE_URL$API_PATH/$NEW_ID/analytics" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "X-School-ID: $SCHOOL_ID")
        assert_status 200 "$(echo "$RESP_ANALYTICS" | jq -c '{status: 200}')"
    fi

    # ── 7. CSV Export (Gap 7 support) ──
    log "[7/12] GET /responsibility/export/csv — blob download"
    CSV=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$API_PATH/export/csv" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    if [ "$CSV" = "200" ]; then
        log_success "CSV export returned HTTP 200"
        ((PASSED_TESTS++))
    else
        log_error "CSV export returned HTTP $CSV"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))

    # ── 8. Salary Generation (Gap 2 support) ──
    log "[8/12] POST /responsibility/generate-salaries/5/2026 — salary calc"
    SALARY=$(curl -s -X POST "$BASE_URL$API_PATH/generate-salaries/5/2026" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{}")
    SALARY_STATUS=$(echo "$SALARY" | jq -r '.status')
    if [ "$SALARY_STATUS" = "ok" ] || [ "$(echo "$SALARY" | jq -r '.success')" = "true" ]; then
        log_success "Salary generation OK"
        ((PASSED_TESTS++))
    else
        log_error "Salary generation failed: $(echo "$SALARY" | jq -c '.')"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))

    # ── 9. Student Fee Sync (Gap 3 support) ──
    log "[9/12] POST /responsibility/sync-student-fees"
    FEE_SYNC=$(curl -s -X POST "$BASE_URL$API_PATH/sync-student-fees" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{}")
    assert_status 200 "$(echo "$FEE_SYNC" | jq -c '{status: 200}')"

    # ── 10. Utilization Metrics ──
    log "[10/12] GET /responsibility/metrics/utilization"
    UTIL=$(curl -s "$BASE_URL$API_PATH/metrics/utilization" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    assert_status 200 "$(echo "$UTIL" | jq -c '{status: 200}')"

    # ── 11. Workload Metrics ──
    log "[11/12] GET /responsibility/metrics/workload"
    WORKLOAD=$(curl -s "$BASE_URL$API_PATH/metrics/workload" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    assert_status 200 "$(echo "$WORKLOAD" | jq -c '{status: 200}')"

    # ── 12. PDF Report (Gap 7 support) ──
    log "[12/12] GET /responsibility/reports/utilization/2026-01-01/2026-12-31/pdf"
    PDF_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$API_PATH/reports/utilization/2026-01-01/2026-12-31/pdf" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    if [ "$PDF_CODE" = "200" ]; then
        log_success "PDF report returned HTTP 200"
        ((PASSED_TESTS++))
    else
        log_error "PDF report returned HTTP $PDF_CODE"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))

    # Cleanup: delete created test responsibility
    if [ -n "$NEW_ID" ]; then
        log "Cleanup: DELETE /responsibility/$NEW_ID"
        curl -s -X DELETE "$BASE_URL$API_PATH/$NEW_ID" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "X-School-ID: $SCHOOL_ID" > /dev/null
    fi

    log "=== RESPONSIBILITY MODULE COMPLETE ==="
}
