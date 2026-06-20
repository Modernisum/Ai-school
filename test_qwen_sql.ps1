$baseUrl = "http://localhost:8080/api"

# Login for school 689225
Write-Host "Logging in for School 689225..."
$loginRes1 = Invoke-RestMethod -Uri "$baseUrl/auth/schooladmin/login" -Method Post -ContentType "application/json" -Body '{"schoolId":"689225","password":"123456"}'
$token1 = $loginRes1.accessToken
Write-Host "Token obtained successfully!"

$headers1 = @{
    "Authorization" = "Bearer $token1"
}

# Create a session
$createRes = Invoke-RestMethod -Uri "$baseUrl/school/689225/ai/session" -Method Post -ContentType "application/json" -Headers $headers1 -Body '{"title": "School 689225 SQL Test"}'
$sessionId = $createRes.session_id
Write-Host "Created Session ID: $sessionId"

# Post a query
Write-Host "`n=== Post Query in Session ==="
$queryBody = @{
    query = "total school me kitna bache hai"
} | ConvertTo-Json
$queryRes = Invoke-RestMethod -Uri "$baseUrl/school/689225/ai/session/$sessionId/query" -Method Post -ContentType "application/json" -Headers $headers1 -Body $queryBody
Write-Host "Query Response: $(ConvertTo-Json $queryRes -Depth 5)"

# Delete session
Write-Host "`n=== Delete Session ==="
$deleteRes = Invoke-RestMethod -Uri "$baseUrl/school/689225/ai/session/$sessionId" -Method Delete -Headers $headers1
Write-Host "Delete Response: $(ConvertTo-Json $deleteRes)"
