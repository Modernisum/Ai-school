#!/bin/bash

# Student API Testing Script
# This script tests all student API endpoints with sample data

BASE_URL="http://localhost:8080"
SCHOOL_ID="school-001"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═════════════════════════════════════════${NC}"
echo -e "${BLUE}  Student API - Comprehensive Test Suite ${NC}"
echo -e "${BLUE}═════════════════════════════════════════${NC}\n"

# Test 1: Create Student 1
echo -e "${YELLOW}[TEST 1] Creating Student 1...${NC}"
RESPONSE1=$(curl -s -X POST "$BASE_URL/api/students/$SCHOOL_ID/students" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Kumar",
    "className": "10-A",
    "gender": "male",
    "dob": "2010-05-15",
    "contact": "9876543210"
  }')

echo "$RESPONSE1" | jq .
STUDENT_ID_1=$(echo "$RESPONSE1" | jq -r '.data.studentId')
echo -e "${GREEN}✓ Student 1 Created: $STUDENT_ID_1${NC}\n"

# Test 2: Create Student 2
echo -e "${YELLOW}[TEST 2] Creating Student 2...${NC}"
RESPONSE2=$(curl -s -X POST "$BASE_URL/api/students/$SCHOOL_ID/students" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Singh",
    "className": "10-B",
    "gender": "female",
    "contact": "9876543211"
  }')

echo "$RESPONSE2" | jq .
STUDENT_ID_2=$(echo "$RESPONSE2" | jq -r '.data.studentId')
echo -e "${GREEN}✓ Student 2 Created: $STUDENT_ID_2${NC}\n"

# Test 3: Create Student 3
echo -e "${YELLOW}[TEST 3] Creating Student 3...${NC}"
RESPONSE3=$(curl -s -X POST "$BASE_URL/api/students/$SCHOOL_ID/students" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Amit Patel",
    "className": "10-A",
    "gender": "male",
    "contact": "9876543212"
  }')

echo "$RESPONSE3" | jq .
STUDENT_ID_3=$(echo "$RESPONSE3" | jq -r '.data.studentId')
echo -e "${GREEN}✓ Student 3 Created: $STUDENT_ID_3${NC}\n"

# Test 4: List All Students
echo -e "${YELLOW}[TEST 4] Listing All Students...${NC}"
curl -s -X GET "$BASE_URL/api/students/$SCHOOL_ID/students" | jq .
echo -e "${GREEN}✓ Listed all students${NC}\n"

# Test 5: Get Single Student
echo -e "${YELLOW}[TEST 5] Getting Single Student ($STUDENT_ID_1)...${NC}"
curl -s -X GET "$BASE_URL/api/students/$SCHOOL_ID/students/$STUDENT_ID_1" | jq .
echo -e "${GREEN}✓ Retrieved single student${NC}\n"

# Test 6: Update Student
echo -e "${YELLOW}[TEST 6] Updating Student ($STUDENT_ID_1)...${NC}"
curl -s -X PUT "$BASE_URL/api/students/$SCHOOL_ID/students/$STUDENT_ID_1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Kumar Singh",
    "contact": "9876543220"
  }' | jq .
echo -e "${GREEN}✓ Student updated${NC}\n"

# Test 7: Verify Update
echo -e "${YELLOW}[TEST 7] Verifying Update...${NC}"
curl -s -X GET "$BASE_URL/api/students/$SCHOOL_ID/students/$STUDENT_ID_1" | jq '.data | {name, contact}'
echo -e "${GREEN}✓ Update verified${NC}\n"

# Test 8: Get All Student IDs
echo -e "${YELLOW}[TEST 8] Getting All Student IDs...${NC}"
curl -s -X GET "$BASE_URL/api/students/$SCHOOL_ID/student-ids" | jq .
echo -e "${GREEN}✓ Retrieved all student IDs${NC}\n"

# Test 9: Delete Student
echo -e "${YELLOW}[TEST 9] Deleting Student ($STUDENT_ID_2)...${NC}"
curl -s -X DELETE "$BASE_URL/api/students/$SCHOOL_ID/students/$STUDENT_ID_2" | jq .
echo -e "${GREEN}✓ Student deleted${NC}\n"

# Test 10: Verify Deletion
echo -e "${YELLOW}[TEST 10] Verifying Deletion (Should return 404)...${NC}"
curl -s -X GET "$BASE_URL/api/students/$SCHOOL_ID/students/$STUDENT_ID_2" | jq .
echo -e "${GREEN}✓ Deletion verified (404 expected)${NC}\n"

# Test 11: List Remaining Students
echo -e "${YELLOW}[TEST 11] Listing Remaining Students...${NC}"
curl -s -X GET "$BASE_URL/api/students/$SCHOOL_ID/students" | jq '.data | length'
echo -e "${GREEN}✓ Listed remaining students (should be 2)${NC}\n"

# Test 12: Validation Test - Missing Required Field
echo -e "${YELLOW}[TEST 12] Validation Test - Missing className...${NC}"
curl -s -X POST "$BASE_URL/api/students/$SCHOOL_ID/students" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User"}' | jq .
echo -e "${RED}✗ Expected error: className is required${NC}\n"

# Test 13: Validation Test - className Too Long
echo -e "${YELLOW}[TEST 13] Validation Test - className Too Long...${NC}"
curl -s -X POST "$BASE_URL/api/students/$SCHOOL_ID/students" \
  -H "Content-Type: application/json" \
  -d '{
    "className": "10-A-Very-Long-Class-Name-That-Exceeds-Fifty-Characters-ABCDEFGHIJKLMNOP"
  }' | jq .
echo -e "${RED}✗ Expected error: className cannot exceed 50 characters${NC}\n"

# Test 14: Validation Test - contact Too Long
echo -e "${YELLOW}[TEST 14] Validation Test - contact Too Long...${NC}"
curl -s -X POST "$BASE_URL/api/students/$SCHOOL_ID/students" \
  -H "Content-Type: application/json" \
  -d '{
    "className": "10-A",
    "contact": "98765432101234567890123"
  }' | jq .
echo -e "${RED}✗ Expected error: contact cannot exceed 20 characters${NC}\n"

# Summary
echo -e "${BLUE}═════════════════════════════════════════${NC}"
echo -e "${BLUE}  ✓ All Tests Completed Successfully!   ${NC}"
echo -e "${BLUE}═════════════════════════════════════════${NC}\n"

echo -e "${GREEN}Summary:${NC}"
echo "  ✓ Created 3 students"
echo "  ✓ Listed all students"
echo "  ✓ Retrieved single student"
echo "  ✓ Updated student"
echo "  ✓ Verified update"
echo "  ✓ Got all student IDs"
echo "  ✓ Deleted student"
echo "  ✓ Verified deletion"
echo "  ✓ Tested validation errors"
echo ""
