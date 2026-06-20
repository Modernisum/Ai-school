$baseUrl = "http://localhost:8080/api"

# Login for school 689225
Write-Host "Logging in for School 689225..."
try {
    $loginRes1 = Invoke-RestMethod -Uri "$baseUrl/auth/schooladmin/login" -Method Post -ContentType "application/json" -Body '{"schoolId":"689225","password":"123456"}'
    $token1 = $loginRes1.accessToken
    Write-Host "Token 1 obtained successfully!"
} catch {
    Write-Error "Failed to login for School 689225: $_"
    exit 1
}

# Login for school 519063
Write-Host "Logging in for School 519063..."
try {
    $loginRes2 = Invoke-RestMethod -Uri "$baseUrl/auth/schooladmin/login" -Method Post -ContentType "application/json" -Body '{"schoolId":"519063","password":"123456"}'
    $token2 = $loginRes2.accessToken
    Write-Host "Token 2 obtained successfully!"
} catch {
    Write-Error "Failed to login for School 519063: $_"
    exit 1
}

# 1. Create a session for school 689225
Write-Host "`n=== 1. Create Session for School 689225 ==="
$headers1 = @{
    "Authorization" = "Bearer $token1"
}
$createRes = Invoke-RestMethod -Uri "$baseUrl/school/689225/ai/session" -Method Post -ContentType "application/json" -Headers $headers1 -Body '{"title": "School 689225 Research Session"}'
$sessionId = $createRes.session_id
Write-Host "Created Session ID: $sessionId"
if (-not $sessionId) {
    Write-Error "Failed: session_id is empty"
    exit 1
}

# 2. List sessions for school 689225
Write-Host "`n=== 2. List Sessions for School 689225 ==="
$listRes = Invoke-RestMethod -Uri "$baseUrl/school/689225/ai/sessions" -Method Get -Headers $headers1
Write-Host "Sessions List: $(ConvertTo-Json $listRes -Depth 3)"
$found = $listRes.data | Where-Object { $_.session_id -eq $sessionId }
if (-not $found) {
    Write-Error "Failed: Created session not found in the sessions list"
    exit 1
}
Write-Host "Success: Session is present in the list!"

# 3. Post a query in that session
Write-Host "`n=== 3. Post Query in Session ==="
$queryBody = @{
    query = "mera backend ke ander kitna student hai"
} | ConvertTo-Json
$queryRes = Invoke-RestMethod -Uri "$baseUrl/school/689225/ai/session/$sessionId/query" -Method Post -ContentType "application/json" -Headers $headers1 -Body $queryBody
Write-Host "Query Response: $(ConvertTo-Json $queryRes -Depth 3)"

# 4. Get history for that session
Write-Host "`n=== 4. Fetch Session History ==="
$historyRes = Invoke-RestMethod -Uri "$baseUrl/school/689225/ai/session/$sessionId/history" -Method Get -Headers $headers1
Write-Host "History Response: $(ConvertTo-Json $historyRes -Depth 3)"
if ($historyRes.data.Count -lt 2) {
    Write-Error "Failed: Session history does not contain user and model messages"
    exit 1
}
Write-Host "Success: History contains both queries and responses!"

# 5. Verify tenant isolation (School 519063 trying to access Session of 689225)
Write-Host "`n=== 5. Verify RLS Tenant Isolation (School 519063 trying to access School 689225 session) ==="
$headers2 = @{
    "Authorization" = "Bearer $token2"
}
try {
    # Attempt to query School 689225 session using School 519063 token
    $badHistoryRes = Invoke-RestMethod -Uri "$baseUrl/school/519063/ai/session/$sessionId/history" -Method Get -Headers $headers2
    Write-Host "Cross-tenant History Response: $(ConvertTo-Json $badHistoryRes -Depth 3)"
    if ($badHistoryRes.data.Count -ne 0) {
        Write-Error "Security Failure: School 519063 was able to read School 689225's chat history!"
        exit 1
    }
    Write-Host "Success: School 519063 cannot read School 689225's session history (returned empty due to RLS/Isolation)!"
} catch {
    Write-Host "Request failed as expected or returned error: $_"
}

# 6. Delete session
Write-Host "`n=== 6. Delete Session for School 689225 ==="
$deleteRes = Invoke-RestMethod -Uri "$baseUrl/school/689225/ai/session/$sessionId" -Method Delete -Headers $headers1
Write-Host "Delete Response: $(ConvertTo-Json $deleteRes)"
if ($deleteRes.deleted -ne $true) {
    Write-Error "Failed: session was not deleted"
    exit 1
}

# Verify history is deleted via cascade
Write-Host "`n=== 7. Verify History Cascade Deletion ==="
$historyAfterRes = Invoke-RestMethod -Uri "$baseUrl/school/689225/ai/session/$sessionId/history" -Method Get -Headers $headers1
Write-Host "History after deletion: $(ConvertTo-Json $historyAfterRes -Depth 3)"
if ($historyAfterRes.data.Count -ne 0) {
    Write-Error "Failed: History records still exist after session deletion"
    exit 1
}
Write-Host "Success: All history records were cascade deleted!"

Write-Host "`nALL TESTS PASSED SUCCESSFULLY!"
