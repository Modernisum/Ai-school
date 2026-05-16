#!/bin/bash
# API tests for Spaces & Materials module (supports Gaps 4-5 fixes)

source "$(dirname "$0")/test_config.sh"
source "$(dirname "$0")/test_utils.sh"

RES_PATH="/api/school/$SCHOOL_ID/resources"

test_spaces_module() {
    log "=== SPACES & MATERIALS MODULE TESTS ==="

    # ── 1. List space categories ──
    log "[1/17] GET /resources/spaces/categories — list categories"
    CATS=$(curl -s "$RES_PATH/spaces/categories" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    assert_status 200 "$(echo "$CATS" | jq -c '{status: 200}')"
    log "    Categories: $(echo "$CATS" | jq -r '.data | length' 2>/dev/null || echo "N/A")"

    # ── 2. Create space category ──
    TEST_CAT="TestCat$RANDOM"
    log "[2/12] POST /resources/spaces/categories — create '$TEST_CAT'"
    NEW_CAT=$(curl -s -X POST "$RES_PATH/spaces/categories" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$TEST_CAT\"}")
    assert_status 201 "$(echo "$NEW_CAT" | jq -c '{status: 201}')"

    # ── 3. List spaces (Gap 4: vacancy indicator uses this) ──
    log "[3/12] GET /resources/spaces — list all spaces"
    SPACES=$(curl -s "$RES_PATH/spaces" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    assert_status 200 "$(echo "$SPACES" | jq -c '{status: 200}')"
    SPACE_COUNT=$(echo "$SPACES" | jq -r '.data | length' 2>/dev/null || echo 0)
    log "    Total spaces: $SPACE_COUNT"

    # ── 4. Create a test space ──
    TEST_SPACE="TestRoom-$RANDOM"
    log "[4/12] POST /resources/spaces/$TEST_CAT — create '$TEST_SPACE'"
    NEW_SPACE=$(curl -s -X POST "$RES_PATH/spaces/$TEST_CAT" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"spaceName\":\"$TEST_SPACE\",\"capacity\":30}")
    assert_status 201 "$(echo "$NEW_SPACE" | jq -c '{status: 201}')"

    # ── 5. Get space details ──
    log "[5/12] GET /resources/spaces/detail/$TEST_SPACE — space detail"
    SPACE_DETAIL=$(curl -s "$RES_PATH/spaces/detail/$TEST_SPACE" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    assert_status 200 "$(echo "$SPACE_DETAIL" | jq -c '{status: 200}')"
    assert_contains "$TEST_SPACE" "$SPACE_DETAIL"

    # ── 6. Assign materials to space (Gap 5: material↔space bridge) ──
    log "[6/12] POST /resources/spaces/$TEST_SPACE/materials — assign materials"
    ASSIGN=$(curl -s -X POST "$RES_PATH/spaces/$TEST_SPACE/materials" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"materials\":[{\"name\":\"Whiteboard Marker\",\"quantity\":5},{\"name\":\"Duster\",\"quantity\":2}]}")
    log "    Material assign response: $(echo "$ASSIGN" | jq -c '.status' 2>/dev/null)"

    # ── 7. List materials (Gap 5: material table uses this) ──
    log "[7/12] GET /resources/materials — list inventory"
    MATS=$(curl -s "$RES_PATH/materials" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    assert_status 200 "$(echo "$MATS" | jq -c '{status: 200}')"
    MAT_COUNT=$(echo "$MATS" | jq -r '.data | length' 2>/dev/null || echo 0)
    log "    Total materials: $MAT_COUNT"

    # ── 8. Create a material ──
    TEST_MAT="TestMat-$RANDOM"
    log "[8/12] POST /resources/materials — create '$TEST_MAT'"
    NEW_MAT=$(curl -s -X POST "$RES_PATH/materials" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$TEST_MAT\",\"unit_price\":100,\"quantity\":50}")
    assert_status 201 "$(echo "$NEW_MAT" | jq -c '{status: 201}')"

    # ── 9. Get material details ──
    log "[9/12] GET /resources/materials/$TEST_MAT — get material detail"
    MAT_DETAIL=$(curl -s "$RES_PATH/materials/$TEST_MAT" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    assert_status 200 "$(echo "$MAT_DETAIL" | jq -c '{status: 200}')"
    assert_contains "$TEST_MAT" "$MAT_DETAIL"

    # ── 10. Buy material (inventory transaction) ──
    log "[10/12] POST /resources/materials/$TEST_MAT/buy — stock in"
    BUY=$(curl -s -X POST "$RES_PATH/materials/$TEST_MAT/buy" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"quantity\":10,\"unit_price\":100}")
    assert_status 200 "$(echo "$BUY" | jq -c '{status: 200}')"

    # ── 11. Sell material (inventory transaction) ──
    log "[11/12] POST /resources/materials/$TEST_MAT/sell — stock out"
    SELL=$(curl -s -X POST "$RES_PATH/materials/$TEST_MAT/sell" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"quantity\":5,\"unit_price\":100}")
    assert_status 200 "$(echo "$SELL" | jq -c '{status: 200}')"

    # ── 12. Update space (verify space still exists) ──
    log "[12/12] PUT /resources/spaces/detail/$TEST_SPACE — update space"
    UPDATE=$(curl -s -X PUT "$RES_PATH/spaces/detail/$TEST_SPACE" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"description\":\"Updated for API test\"}")
    assert_status 200 "$(echo "$UPDATE" | jq -c '{status: 200}')"

    # ── 13. List materials in space — enhanced with cost summary ──
    log "[13/17] GET /resources/spaces/detail/$TEST_SPACE/materials — verify summary with cost valuation"
    SPACE_MATS_RESP=$(curl_api GET "$RES_PATH/spaces/detail/$TEST_SPACE/materials" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    SPACE_MATS_STATUS="${SPACE_MATS_RESP%%:*}"
    SPACE_MATS_BODY="${SPACE_MATS_RESP#*:}"
    assert_status 200 "$SPACE_MATS_STATUS"
    assert_contains "success" "$SPACE_MATS_BODY"
    assert_contains "summary" "$SPACE_MATS_BODY"
    assert_contains "totalValue" "$SPACE_MATS_BODY"
    assert_contains "deficitValue" "$SPACE_MATS_BODY"
    assert_contains "deficitCount" "$SPACE_MATS_BODY"

    # ── 14. Clone space (NEW) ──
    CLONED_SPACE="${TEST_SPACE}-clone"
    log "[14/15] POST /resources/spaces/$TEST_SPACE/clone — clone to '$CLONED_SPACE'"
    CLONE_RESP=$(curl_api POST "$RES_PATH/spaces/$TEST_SPACE/clone" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"newSpaceName\":\"$CLONED_SPACE\"}")
    CLONE_STATUS="${CLONE_RESP%%:*}"
    CLONE_BODY="${CLONE_RESP#*:}"
    assert_status 201 "$CLONE_STATUS"
    assert_contains "$CLONED_SPACE" "$CLONE_BODY"

    # ── 15. Set and get space budget (NEW) ──
    log "[15/17] PUT /resources/spaces/detail/$TEST_SPACE/budget — set budget"
    BUDGET_RESP=$(curl_api PUT "$RES_PATH/spaces/detail/$TEST_SPACE/budget" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"budget\":100000}")
    BUDGET_STATUS="${BUDGET_RESP%%:*}"
    assert_status 200 "$BUDGET_STATUS"

    log "[15b/17] GET /resources/spaces/detail/$TEST_SPACE/budget — verify"
    GET_BUDGET_RESP=$(curl_api GET "$RES_PATH/spaces/detail/$TEST_SPACE/budget" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID")
    GB_STATUS="${GET_BUDGET_RESP%%:*}"
    GB_BODY="${GET_BUDGET_RESP#*:}"
    assert_status 200 "$GB_STATUS"
    assert_contains "100000" "$GB_BODY"

    # ── 16. Transfer material between spaces (NEW) ──
    # First create a target space
    TARGET_SPACE="${TEST_SPACE}-target"
    curl -s -X POST "$RES_PATH/spaces/$TEST_CAT" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"spaceName\":\"$TARGET_SPACE\"}" > /dev/null

    log "[17/17] POST /resources/spaces/$TEST_SPACE/materials/$TEST_MAT/transfer — transfer to $TARGET_SPACE"
    TRANSFER_RESP=$(curl_api POST "$RES_PATH/spaces/$TEST_SPACE/materials/$TEST_MAT/transfer" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" \
        -H "Content-Type: application/json" \
        -d "{\"to_space\":\"$TARGET_SPACE\",\"quantity\":3}")
    TRANSFER_STATUS="${TRANSFER_RESP%%:*}"
    TRANSFER_BODY="${TRANSFER_RESP#*:}"
    assert_status 200 "$TRANSFER_STATUS"
    assert_contains "remainingInSource" "$TRANSFER_BODY"

    # Cleanup
    log "Cleanup: deleting test spaces & material"
    curl -s -X DELETE "$RES_PATH/spaces/detail/$CLONED_SPACE" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" > /dev/null
    curl -s -X DELETE "$RES_PATH/spaces/detail/$TARGET_SPACE" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" > /dev/null
    curl -s -X DELETE "$RES_PATH/materials/$TEST_MAT" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" > /dev/null
    curl -s -X DELETE "$RES_PATH/spaces/detail/$TEST_SPACE" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "X-School-ID: $SCHOOL_ID" > /dev/null

    log "=== SPACES & MATERIALS MODULE COMPLETE ==="
}
