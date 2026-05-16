#!/bin/bash
# API tests for Material Management enhancements (Phase 1-3):
#   shortage-summary, run-shortage-check, budget CRUD, all-spaces-materials, enhanced get-space-materials
#
# Requires: backend server running, auth tokens sourced

source "$(dirname "$0")/test_config.sh"
source "$(dirname "$0")/test_utils.sh"

RES_PATH="/api/school/$SCHOOL_ID/resources"

test_resources_module() {
    log "=== RESOURCE MANAGEMENT (MATERIAL) ENHANCEMENT TESTS ==="

    local TEST_CAT="ResourceTestCat$RANDOM"
    local TEST_SPACE="ResSpace-$RANDOM"
    local TEST_MAT="ResMat-$RANDOM"
    local TEST_MAT2="ResMat2-$RANDOM"
    local TARGET_SPACE="${TEST_SPACE}-target"
    local BUDGET_VAL=50000

    # ── 1. Create space category ──
    log "[1/13] POST /resources/spaces/categories — create '$TEST_CAT'"
    local CAT_RESP
    CAT_RESP=$(curl -s -X POST "$RES_PATH/spaces/categories" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$TEST_CAT\"}")
    assert_status 201 "$(echo "$CAT_RESP" | jq -c '{status: 201}')"

    # ── 2. Create source space ──
    log "[2/13] POST /resources/spaces/$TEST_CAT — create '$TEST_SPACE'"
    local SPACE_RESP
    SPACE_RESP=$(curl -s -X POST "$RES_PATH/spaces/$TEST_CAT" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"spaceName\":\"$TEST_SPACE\"}")
    assert_status 201 "$(echo "$SPACE_RESP" | jq -c '{status: 201}')"

    # ── 3. Create target space ──
    log "[3/13] POST /resources/spaces/$TEST_CAT — create '$TARGET_SPACE'"
    local TGT_RESP
    TGT_RESP=$(curl -s -X POST "$RES_PATH/spaces/$TEST_CAT" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"spaceName\":\"$TARGET_SPACE\"}")
    assert_status 201 "$(echo "$TGT_RESP" | jq -c '{status: 201}')"

    # ── 4. Set budget on source space ──
    log "[4/13] PUT /resources/spaces/detail/$TEST_SPACE/budget — set to $BUDGET_VAL"
    local BUDGET_RESP
    BUDGET_RESP=$(curl -s -X PUT "$RES_PATH/spaces/detail/$TEST_SPACE/budget" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"budget\":$BUDGET_VAL}")
    assert_status 200 "$(echo "$BUDGET_RESP" | jq -c '{status: 200}')"
    assert_contains "success" "$BUDGET_RESP"

    # ── 5. Verify budget via GET ──
    log "[5/13] GET /resources/spaces/detail/$TEST_SPACE/budget — verify"
    local GET_BUDGET
    GET_BUDGET=$(curl -s "$RES_PATH/spaces/detail/$TEST_SPACE/budget" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    assert_status 200 "$(echo "$GET_BUDGET" | jq -c '{status: 200}')"
    assert_contains "$BUDGET_VAL" "$GET_BUDGET"

    # ── 6. Create test material with price ──
    log "[6/13] POST /resources/materials — create '$TEST_MAT' (₹200/unit, qty 50)"
    local MAT_RESP
    MAT_RESP=$(curl -s -X POST "$RES_PATH/materials" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"materialName\":\"$TEST_MAT\",\"unitPrice\":200,\"quantity\":50,\"unit\":\"pcs\"}")
    assert_status 201 "$(echo "$MAT_RESP" | jq -c '{status: 201}')"

    # ── 7. Create second material ──
    log "[7/13] POST /resources/materials — create '$TEST_MAT2' (₹500/unit, qty 30)"
    MAT_RESP=$(curl -s -X POST "$RES_PATH/materials" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"materialName\":\"$TEST_MAT2\",\"unitPrice\":500,\"quantity\":30,\"unit\":\"pcs\"}")
    assert_status 201 "$(echo "$MAT_RESP" | jq -c '{status: 201}')"

    # ── 8. Assign materials to source space ──
    log "[8/13] POST /resources/spaces/$TEST_SPACE/materials — assign 10x $TEST_MAT + 5x $TEST_MAT2"
    local ASSIGN_RESP
    ASSIGN_RESP=$(curl -s -X POST "$RES_PATH/spaces/$TEST_SPACE/materials" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "[
            {\"materialName\":\"$TEST_MAT\",\"quantity\":10},
            {\"materialName\":\"$TEST_MAT2\",\"quantity\":5}
        ]")
    assert_status 200 "$(echo "$ASSIGN_RESP" | jq -c '{status: 200}')"

    # ── 9. Test enhanced get-space-materials with summary + budget ──
    log "[9/13] GET /resources/spaces/$TEST_SPACE/materials — verify summary (totalValue, deficitValue, budget)"
    local SPACE_MATS
    SPACE_MATS=$(curl -s "$RES_PATH/spaces/$TEST_SPACE/materials" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    assert_status 200 "$(echo "$SPACE_MATS" | jq -c '{status: 200}')"
    assert_contains "summary" "$SPACE_MATS"
    assert_contains "totalValue" "$SPACE_MATS"
    assert_contains "budget" "$SPACE_MATS"
    # Verify math: 10 * 200 + 5 * 500 = 2000 + 2500 = 4500
    local COMPUTED_VALUE
    COMPUTED_VALUE=$(echo "$SPACE_MATS" | jq -r '.summary.totalValue')
    if [ "$COMPUTED_VALUE" = "4500" ]; then
        log_success "    totalValue = $COMPUTED_VALUE (expected: 4500)"
        ((PASSED_TESTS++))
        ((TOTAL_TESTS++))
    else
        log_error "    totalValue = $COMPUTED_VALUE (expected: 4500)"
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
    fi
    # Verify budget is passed through
    local BUDGET_VAL_RESP
    BUDGET_VAL_RESP=$(echo "$SPACE_MATS" | jq -r '.summary.budget')
    if [ "$BUDGET_VAL_RESP" = "$BUDGET_VAL" ]; then
        log_success "    budget = $BUDGET_VAL_RESP (matches set value)"
        ((PASSED_TESTS++))
        ((TOTAL_TESTS++))
    else
        log_error "    budget = $BUDGET_VAL_RESP (expected: $BUDGET_VAL)"
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
    fi

    # ── 10. Test all-spaces-materials bulk endpoint ──
    log "[10/13] GET /resources/spaces/materials/all — bulk materials across spaces"
    local ALL_MATS
    ALL_MATS=$(curl -s "$RES_PATH/spaces/materials/all" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    assert_status 200 "$(echo "$ALL_MATS" | jq -c '{status: 200}')"
    assert_contains "success" "$ALL_MATS"
    # Verify source space appears in results
    assert_contains "$TEST_SPACE" "$ALL_MATS"

    # ── 11. Test shortage-summary (no requirements set = zero deficits) ──
    log "[11/13] GET /resources/materials/shortage-summary — no deficits yet"
    local SUMMARY
    SUMMARY=$(curl -s "$RES_PATH/materials/shortage-summary" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    assert_status 200 "$(echo "$SUMMARY" | jq -c '{status: 200}')"
    local DEF_COUNT
    DEF_COUNT=$(echo "$SUMMARY" | jq -r '.data.totalDeficitCount')
    if [ "$DEF_COUNT" = "0" ]; then
        log_success "    totalDeficitCount = 0 (expected: no requirements set)"
        ((PASSED_TESTS++))
        ((TOTAL_TESTS++))
    else
        log_error "    totalDeficitCount = $DEF_COUNT (expected: 0)"
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
    fi

    # ── 12. Test run-shortage-check (creates alert log entries) ──
    log "[12/13] POST /resources/materials/run-shortage-check — trigger alert scan"
    local CHECK
    CHECK=$(curl -s -X POST "$RES_PATH/materials/run-shortage-check" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    assert_status 200 "$(echo "$CHECK" | jq -c '{status: 200}')"

    # ── 13. Transfer material between spaces via floor plan ──
    log "[13/13] POST /resources/spaces/$TEST_SPACE/materials/$TEST_MAT/transfer — transfer to $TARGET_SPACE (qty 3)"
    local TRANSFER
    TRANSFER=$(curl -s -X POST "$RES_PATH/spaces/$TEST_SPACE/materials/$TEST_MAT/transfer" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"to_space\":\"$TARGET_SPACE\",\"quantity\":3}")
    assert_status 200 "$(echo "$TRANSFER" | jq -c '{status: 200}')"
    assert_contains "remainingInSource" "$TRANSFER"

    # ── Cleanup ──
    log "Cleanup: deleting test data"
    for SPACE in "$TARGET_SPACE" "$TEST_SPACE"; do
        curl -s -X DELETE "$RES_PATH/spaces/detail/$SPACE" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "X-School-ID: $SCHOOL_ID" > /dev/null
    done
    for MAT in "$TEST_MAT" "$TEST_MAT2"; do
        curl -s -X DELETE "$RES_PATH/materials/$MAT" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "X-School-ID: $SCHOOL_ID" > /dev/null
    done

    log "=== RESOURCE MANAGEMENT ENHANCEMENT TESTS COMPLETE ==="
}
