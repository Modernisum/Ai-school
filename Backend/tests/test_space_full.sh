#!/bin/bash
# Standalone test runner for all space-related backend tests
set -e

SCRIPT_DIR="$(dirname "$0")"
source "$SCRIPT_DIR/test_config.sh"
source "$SCRIPT_DIR/test_utils.sh"

TOTAL_TESTS=0; PASSED_TESTS=0; FAILED_TESTS=0

log "Starting SPACE FULL TEST SUITE"
separator

# Run the main spaces module tests (includes all endpoints)
source "$SCRIPT_DIR/test_spaces.sh"
test_spaces_module

separator
log "SPACE FULL TEST SUITE COMPLETE"
print_summary

# Exit with proper code
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
fi
exit 0
