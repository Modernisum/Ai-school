@echo off
echo Setting environment variables...
set SKIP_OCR_INIT=true
set RUST_LOG=info
set DATABASE_URL=postgres://postgres:1234@localhost:5432/ai_school
set REDIS_URL=redis://localhost:6379/
set JWT_SECRET=vidhyam_super_secure_enterprise_key_2026
set API_BASE_URL=http://localhost:8080

echo Starting Modern School Backend...
echo Using database: %DATABASE_URL%
echo Using Redis: %REDIS_URL%

echo.
echo If you see compilation errors, you may need to run: cargo clean
echo Then run: cargo build --bin modern_school_backend
echo.
pause

cargo run --bin modern_school_backend