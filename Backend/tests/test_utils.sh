#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Log start of test
declare -a TEST_LOGS

log() {
    echo "[INFO] $1"
    TEST_LOGS+=("[INFO] $1")
}

log_error() {
    echo "[ERROR] $1"
    TEST_LOGS+=("[ERROR] $1")
}

log_success() {
    echo -e "[SUCCESS] $1"
    TEST_LOGS+=("[SUCCESS] $1")
}

# Print separator
separator() {
    echo "========================================"
}

# Assert HTTP status code
assert_status() {
    local expected=$1
    local actual=$2

    if [ "$actual" == "$expected" ]; then
        log_success "Expected status $expected, got $actual"
        ((PASSED_TESTS++))
        ((TOTAL_TESTS++))
    else
        log_error "Expected status $expected, got $actual"
        TEST_LOGS+=("[ERROR] Expected status $expected, got $actual")
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
    fi
}

# Make an API request capturing the actual HTTP status code
# Usage: RESP=$(curl_api GET /path "Header: val") → "${RESP%%:*}" = status, "${RESP#*:}" = body
curl_api() {
    local method=$1
    local endpoint=$2
    shift 2
    local tmpfile=$(mktemp 2>/dev/null || mktemp -t tmp)
    local http_code=$(curl -s -o "$tmpfile" -w "%{http_code}" -X "$method" "${BASE_URL}${endpoint}" "$@")
    local body
    body=$(cat "$tmpfile" 2>/dev/null)
    rm -f "$tmpfile" 2>/dev/null
    echo "${http_code}:${body}"
}

# Assert response contains string
assert_contains() {
    local expected=$1
    local response=$2

    if echo "$response" | grep -q "$expected"; then
        log_success "Response contains '$expected'"
        ((PASSED_TESTS++))
        ((TOTAL_TESTS++))
    else
        log_error "Response does not contain '$expected'"
        TEST_LOGS+=("[ERROR] Response does not contain '$expected'")
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
    fi
}

# Assert response does not contain string
assert_not_contains() {
    local not_expected=$1
    local response=$2

    if ! echo "$response" | grep -q "$not_expected"; then
        log_success "Response does not contain '$not_expected'"
        ((PASSED_TESTS++))
        ((TOTAL_TESTS++))
    else
        log_error "Response contains '$not_expected'"
        TEST_LOGS+=("[ERROR] Response contains '$not_expected'")
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
    fi
}

# Make authenticated request
curl_authenticated() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=${4:-""}

    if [ -z "$token" ]; then
        curl -s -X "$method" "$BASE_URL$endpoint"
    else
        if [ -n "$data" ]; then
            curl -s -X "$method" "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $token" \
                -H "Content-Type: application/json" \
                -d "$data"
        else
            curl -s -X "$method" "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $token"
        fi
    fi
}

# Authenticate and get token
auth_admin() {
    response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")

    ADMIN_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "$response"
}

auth_school() {
    response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$SCHOOL_USERNAME\",\"password\":\"$SCHOOL_PASSWORD\"}")

    SCHOOL_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "$response"
}

auth_student() {
    response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$STUDENT_USERNAME\",\"password\":\"$STUDENT_PASSWORD\"}")

    STUDENT_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "$response"
}

# Print summary
print_summary() {
    separator
    echo "Test Summary"
    echo "========================================"
    echo -e "Total tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    separator

    if [ $FAILED_TESTS -gt 0 ]; then
        echo ""
        echo "Failed tests:"
        for log in "${TEST_LOGS[@]}"; do
            if echo "$log" | grep -q "ERROR"; then
                echo "$log"
            fi
        done
    fi
}
