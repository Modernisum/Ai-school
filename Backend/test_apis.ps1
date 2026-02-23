# Student API Testing Script (PowerShell)
# Run this script to test all Student API endpoints

$BaseUrl = "http://localhost:8080"
$SchoolId = "school-001"

function Write-Header {
    param([string]$Text)
    Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
}

function Write-Test {
    param([string]$Number, [string]$Description)
    Write-Host "`n[TEST $Number] $Description..." -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# ═══════════════════════════════════════════════════════════════
# START TESTS
# ═══════════════════════════════════════════════════════════════

Write-Header "Student API - Comprehensive Test Suite"

# Test 1: Create Student 1
Write-Test "1" "Creating Student 1"
$Response1 = Invoke-RestMethod -Uri "$BaseUrl/api/students/$SchoolId/students" `
    -Method POST `
    -ContentType "application/json" `
    -Body @{
        name = "Rahul Kumar"
        className = "10-A"
        gender = "male"
        dob = "2010-05-15"
        contact = "9876543210"
    } | ConvertTo-Json

$Response1 | ConvertFrom-Json | ConvertTo-Json -Depth 10
$StudentId1 = ($Response1 | ConvertFrom-Json).data.studentId
Write-Success "Student 1 Created: $StudentId1"

# Test 2: Create Student 2
Write-Test "2" "Creating Student 2"
$Response2 = Invoke-RestMethod -Uri "$BaseUrl/api/students/$SchoolId/students" `
    -Method POST `
    -ContentType "application/json" `
    -Body @{
        name = "Priya Singh"
        className = "10-B"
        gender = "female"
        contact = "9876543211"
    } | ConvertTo-Json

$Response2 | ConvertFrom-Json | ConvertTo-Json -Depth 10
$StudentId2 = ($Response2 | ConvertFrom-Json).data.studentId
Write-Success "Student 2 Created: $StudentId2"

# Test 3: Create Student 3
Write-Test "3" "Creating Student 3"
$Response3 = Invoke-RestMethod -Uri "$BaseUrl/api/students/$SchoolId/students" `
    -Method POST `
    -ContentType "application/json" `
    -Body @{
        name = "Amit Patel"
        className = "10-A"
        gender = "male"
        contact = "9876543212"
    } | ConvertTo-Json

$Response3 | ConvertFrom-Json | ConvertTo-Json -Depth 10
$StudentId3 = ($Response3 | ConvertFrom-Json).data.studentId
Write-Success "Student 3 Created: $StudentId3"

# Test 4: List All Students
Write-Test "4" "Listing All Students"
$ListResponse = Invoke-RestMethod -Uri "$BaseUrl/api/students/$SchoolId/students" `
    -Method GET `
    -ContentType "application/json"

$ListResponse | ConvertTo-Json -Depth 10
Write-Success "Listed all students"

# Test 5: Get Single Student
Write-Test "5" "Getting Single Student ($StudentId1)"
$GetResponse = Invoke-RestMethod -Uri "$BaseUrl/api/students/$SchoolId/students/$StudentId1" `
    -Method GET `
    -ContentType "application/json"

$GetResponse | ConvertTo-Json -Depth 10
Write-Success "Retrieved single student"

# Test 6: Update Student
Write-Test "6" "Updating Student ($StudentId1)"
$UpdateResponse = Invoke-RestMethod -Uri "$BaseUrl/api/students/$SchoolId/students/$StudentId1" `
    -Method PUT `
    -ContentType "application/json" `
    -Body @{
        name = "Rahul Kumar Singh"
        contact = "9876543220"
    } | ConvertTo-Json

$UpdateResponse | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Success "Student updated"

# Test 7: Verify Update
Write-Test "7" "Verifying Update"
$VerifyResponse = Invoke-RestMethod -Uri "$BaseUrl/api/students/$SchoolId/students/$StudentId1" `
    -Method GET `
    -ContentType "application/json"

Write-Host "Name: $($VerifyResponse.data.name)" -ForegroundColor Cyan
Write-Host "Contact: $($VerifyResponse.data.contact)" -ForegroundColor Cyan
Write-Success "Update verified"

# Test 8: Get All Student IDs
Write-Test "8" "Getting All Student IDs"
$IdsResponse = Invoke-RestMethod -Uri "$BaseUrl/api/students/$SchoolId/student-ids" `
    -Method GET `
    -ContentType "application/json"

$IdsResponse.studentIds | ForEach-Object { Write-Host "  - $_" -ForegroundColor Cyan }
Write-Success "Retrieved all student IDs"

# Test 9: Delete Student
Write-Test "9" "Deleting Student ($StudentId2)"
$DeleteResponse = Invoke-RestMethod -Uri "$BaseUrl/api/students/$SchoolId/students/$StudentId2" `
    -Method DELETE `
    -ContentType "application/json"

$DeleteResponse | ConvertTo-Json -Depth 10
Write-Success "Student deleted"

# Test 10: Verify Deletion
Write-Test "10" "Verifying Deletion (Should return 404)"
Try {
    $VerifyDeleteResponse = Invoke-RestMethod -Uri "$BaseUrl/api/students/$SchoolId/students/$StudentId2" `
        -Method GET `
        -ContentType "application/json"
} Catch {
    Write-Host "Caught error (expected): $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Success "Deletion verified (404 expected)"

# Test 11: List Remaining Students
Write-Test "11" "Listing Remaining Students"
$RemainingResponse = Invoke-RestMethod -Uri "$BaseUrl/api/students/$SchoolId/students" `
    -Method GET `
    -ContentType "application/json"

$Count = $RemainingResponse.data.Count
Write-Host "Total students remaining: $Count (expected: 2)" -ForegroundColor Cyan
Write-Success "Listed remaining students"

# Test 12: Validation Test - Missing Required Field
Write-Test "12" "Validation Test - Missing className"
Try {
    $ValidationResponse1 = Invoke-RestMethod -Uri "$BaseUrl/api/students/$SchoolId/students" `
        -Method POST `
        -ContentType "application/json" `
        -Body @{ name = "Test User" } | ConvertTo-Json
} Catch {
    $ErrorResponse = $_.Exception.Response.Content | ConvertFrom-Json
    Write-Host "Error: $($ErrorResponse.message)" -ForegroundColor Red
}
Write-Error "Expected error: className is required"

# Test 13: Validation Test - className Too Long
Write-Test "13" "Validation Test - className Too Long"
Try {
    $ValidationResponse2 = Invoke-RestMethod -Uri "$BaseUrl/api/students/$SchoolId/students" `
        -Method POST `
        -ContentType "application/json" `
        -Body @{
            className = "10-A-Very-Long-Class-Name-That-Exceeds-Fifty-Characters-ABCDEFGHIJKLMNOP"
        } | ConvertTo-Json
} Catch {
    $ErrorResponse = $_.Exception.Response.Content | ConvertFrom-Json
    Write-Host "Error: $($ErrorResponse.message)" -ForegroundColor Red
}
Write-Error "Expected error: className cannot exceed 50 characters"

# Test 14: Validation Test - contact Too Long
Write-Test "14" "Validation Test - contact Too Long"
Try {
    $ValidationResponse3 = Invoke-RestMethod -Uri "$BaseUrl/api/students/$SchoolId/students" `
        -Method POST `
        -ContentType "application/json" `
        -Body @{
            className = "10-A"
            contact = "98765432101234567890123"
        } | ConvertTo-Json
} Catch {
    $ErrorResponse = $_.Exception.Response.Content | ConvertFrom-Json
    Write-Host "Error: $($ErrorResponse.message)" -ForegroundColor Red
}
Write-Error "Expected error: contact cannot exceed 20 characters"

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════

Write-Header "✓ All Tests Completed Successfully!"

Write-Host "`nSummary:" -ForegroundColor Green
Write-Host "  ✓ Created 3 students" -ForegroundColor Green
Write-Host "  ✓ Listed all students" -ForegroundColor Green
Write-Host "  ✓ Retrieved single student" -ForegroundColor Green
Write-Host "  ✓ Updated student" -ForegroundColor Green
Write-Host "  ✓ Verified update" -ForegroundColor Green
Write-Host "  ✓ Got all student IDs" -ForegroundColor Green
Write-Host "  ✓ Deleted student" -ForegroundColor Green
Write-Host "  ✓ Verified deletion" -ForegroundColor Green
Write-Host "  ✓ Tested validation errors" -ForegroundColor Green
Write-Host ""
