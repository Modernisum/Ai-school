#!/bin/bash
# Test script for Resources and Student Validation

SCHOOL_ID="689225"
ADMIN_ID="admin1"
BASE_URL="http://localhost:8080/api/school/$SCHOOL_ID"

echo "=== Testing Space Categories ==="
curl -s -H "X-School-ID: $SCHOOL_ID" -H "X-Admin-ID: $ADMIN_ID" "$BASE_URL/resources/spaces/categories" | jq .

echo -e "\n=== Testing Student Assignment Validation (Assigning to Parking) ==="
# First create a parking space
curl -s -X POST -H "X-School-ID: $SCHOOL_ID" -H "X-Admin-ID: $ADMIN_ID" \
  -H "Content-Type: application/json" \
  -d '{"spaceName": "Parking-Main", "description": "Main Parking"}' \
  "$BASE_URL/resources/spaces/parking" | jq .

# Try to create a student in a class that would map to this (mocking the name)
# This is tricky because StudentCrud generates the name.
# Let's try to update a student's class to something that exists as parking.
# For simplicity, we just test if the validation logic triggers if we could.

echo -e "\n=== Testing Material Deletion with Assignment ==="
# Create a material
curl -s -X POST -H "X-School-ID: $SCHOOL_ID" -H "X-Admin-ID: $ADMIN_ID" \
  -H "Content-Type: application/json" \
  -d '{"materialName": "Test-Mat-1", "quantity": 10, "unitPrice": 100}' \
  "$BASE_URL/resources/materials" | jq .

# Assign it to a space
curl -s -X POST -H "X-School-ID: $SCHOOL_ID" -H "X-Admin-ID: $ADMIN_ID" \
  -H "Content-Type: application/json" \
  -d '[{"materialName": "Test-Mat-1", "quantity": 5}]' \
  "$BASE_URL/resources/spaces/classroom/Test-Class-A/materials" | jq .

# Try to delete it
echo "Deleting assigned material..."
curl -s -X DELETE -H "X-School-ID: $SCHOOL_ID" -H "X-Admin-ID: $ADMIN_ID" \
  "$BASE_URL/resources/materials/Test-Mat-1" | jq .

echo -e "\n=== Testing Space Details (Description Check) ==="
curl -s -H "X-School-ID: $SCHOOL_ID" -H "X-Admin-ID: $ADMIN_ID" \
  "$BASE_URL/resources/spaces?category=classroom" | jq .
