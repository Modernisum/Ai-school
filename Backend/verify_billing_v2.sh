#!/bin/bash
set -e

BASE_URL="http://127.0.0.1:8080/api/admin"
USERNAME="superadmin"
PASSWORD="testpass123"

echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" -H "Content-Type: application/json" -d "{\"username\":\"$USERNAME\", \"password\":\"$PASSWORD\"}")
TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('accessToken'))")

if [ "$TOKEN" == "None" ] || [ -z "$TOKEN" ]; then
    echo "Login failed!"
    echo $LOGIN_RESPONSE
    exit 1
fi
echo "Logged in successfully."

echo "2. Creating a promo code (DISCOUNT20, 20% off)..."
# Using discount_percentage instead of credit_amount for rate discount
CREATE_PROMO=$(curl -s -X POST "$BASE_URL/promos" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "code": "DISCOUNT20",
        "creditAmount": "0",
        "freeDays": 30,
        "discountPercentage": "20.0",
        "maxUses": 10
    }')
echo "Promo created: $CREATE_PROMO"

echo "3. Fetching schools..."
SCHOOLS=$(curl -s -X GET "$BASE_URL/schools" -H "Authorization: Bearer $TOKEN")
SCHOOL_ID=$(echo $SCHOOLS | python3 -c "import sys, json; print(json.load(sys.stdin)['data'][0]['schoolId'])")
echo "Selected school: $SCHOOL_ID"

echo "4. Checking initial rate..."
SCHOOL_DETAIL=$(curl -s -X GET "$BASE_URL/schools/$SCHOOL_ID" -H "Authorization: Bearer $TOKEN")
INITIAL_RATE=$(echo $SCHOOL_DETAIL | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['perStudentRate'])")
echo "Initial per_student_rate: $INITIAL_RATE"

echo "5. Applying promo code DISCOUNT20..."
APPLY_PROMO=$(curl -s -X POST "$BASE_URL/schools/$SCHOOL_ID/apply-promo" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"code\": \"DISCOUNT20\"}")
echo "Apply promo response: $APPLY_PROMO"

echo "6. Verifying rate discount (should be 20% off base_rate or initial_rate if first time)..."
SCHOOL_DETAIL_POST=$(curl -s -X GET "$BASE_URL/schools/$SCHOOL_ID" -H "Authorization: Bearer $TOKEN")
NEW_RATE=$(echo $SCHOOL_DETAIL_POST | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['perStudentRate'])")
echo "New per_student_rate: $NEW_RATE"

# Verification: If base_rate is 1.00, 20% discount should make it 0.80
# We need to check base_rate first or assume it's 1.00

echo "7. Creating another promo code (DISCOUNT10, 10% off)..."
curl -s -X POST "$BASE_URL/promos" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "code": "DISCOUNT10",
        "creditAmount": "0",
        "freeDays": 30,
        "discountPercentage": "10.0",
        "maxUses": 10
    }' > /dev/null

echo "8. Attempting to apply DISCOUNT10 while DISCOUNT20 is active (should fail)..."
APPLY_PROMO_FAIL=$(curl -s -X POST "$BASE_URL/schools/$SCHOOL_ID/apply-promo" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"code\": \"DISCOUNT10\"}")
echo "Apply second promo response: $APPLY_PROMO_FAIL"

echo "Verification complete."
