$env:SKIP_OCR_INIT="true"
$env:RUST_LOG="info"

Write-Host "Starting server..." -ForegroundColor Green
$process = Start-Process -FilePath ".\target\debug\modern_school_backend.exe" -NoNewWindow -PassThru

Start-Sleep -Seconds 5

Write-Host "Testing connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "SUCCESS: Server responded with status $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
}

Write-Host "Checking port..." -ForegroundColor Yellow
$portTest = Test-NetConnection -ComputerName localhost -Port 8080 -WarningAction SilentlyContinue
Write-Host "Port test succeeded: $($portTest.TcpTestSucceeded)" -ForegroundColor Cyan

Write-Host "Stopping server..." -ForegroundColor Yellow
Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
Write-Host "Test complete." -ForegroundColor Green