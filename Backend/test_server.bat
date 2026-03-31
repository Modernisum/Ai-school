@echo off
echo Starting server test...
echo.

set SKIP_OCR_INIT=true
set RUST_LOG=info

echo Running server...
start "Backend Server" cmd /c ".\target\debug\modern_school_backend.exe"

echo Waiting 5 seconds for server to start...
timeout /t 5 /nobreak >nul

echo Testing server...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:8080/ -m 3

echo.
echo If you see 200 or 404, server is running.
echo If you see 000 or connection failed, server may have crashed.
echo.
pause