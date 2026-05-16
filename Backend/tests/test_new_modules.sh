# ===== RESPONSIBILITY TESTS =====
log "Testing Responsibility Module (Gaps 1-7)..."
source "$(dirname "$0")/test_responsibilities.sh"
test_responsibilities_module
separator

# ===== SPACES & MATERIALS TESTS =====
log "Testing Spaces & Materials Module (Gaps 4-5)..."
source "$(dirname "$0")/test_spaces.sh"
test_spaces_module
separator
