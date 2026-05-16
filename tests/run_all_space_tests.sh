#!/bin/bash
# Single-click test runner: runs backend + frontend space tests
set -e

echo "========================================"
echo " VIDHYAM SPACE FEATURE — FULL TEST SUITE"
echo "========================================"

# 1. Backend tests
echo ""
echo "===== [1/2] BACKEND SPACE TESTS ====="
cd "$(dirname "$0")/../Backend"
if bash tests/test_space_full.sh; then
    echo "[PASS] Backend tests passed"
else
    echo "[FAIL] Backend tests failed"
    exit 1
fi

# 2. Frontend tests
echo ""
echo "===== [2/2] FRONTEND SPACE TESTS ====="
cd "$(dirname "$0")/../frontend/Vidhyam"
if npm run test:space; then
    echo "[PASS] Frontend tests passed"
else
    echo "[FAIL] Frontend tests failed"
    exit 1
fi

echo ""
echo "========================================"
echo " ALL SPACE TESTS COMPLETE — SUCCESS"
echo "========================================"
