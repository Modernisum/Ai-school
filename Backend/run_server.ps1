$env:SKIP_OCR_INIT="true"
$env:RUST_LOG="info"
$env:DATABASE_URL="postgres://postgres:1234@localhost:5432/ai_school"
$env:REDIS_URL="redis://localhost:6379/"

Write-Host "Starting backend server..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

# Run the server and capture output
& .\target\debug\modern_school_backend.exe