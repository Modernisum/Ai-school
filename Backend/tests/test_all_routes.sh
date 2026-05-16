#!/bin/bash
# Master test runner for all backend API routes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

# Source configuration and utilities
source test_config.sh
source test_utils.sh

log "Starting Backend API Test Suite"
log "Base URL: $BASE_URL"
log "School ID: $SCHOOL_ID"
separator

# ===== AUTH TESTS =====
log "Testing Authentication Module..."
source "$(dirname "$0")/test_auth.sh"
test_auth_module
separator

# ===== STUDENT TESTS =====
log "Testing Student Management Module..."
source "$(dirname "$0")/test_student.sh"
test_student_module
separator

# ===== EMPLOYEE TESTS =====
log "Testing Employee Management Module..."
source "$(dirname "$0")/test_employee.sh"
test_employee_module
separator

# ===== ATTENDANCE TESTS =====
log "Testing Attendance Module..."
source "$(dirname "$0")/test_attendance.sh"
test_attendance_module
separator

# ===== LEAVE TESTS =====
log "Testing Leave Management Module..."
source "$(dirname "$0")/test_leave.sh"
test_leave_module
separator

# ===== FINANCE TESTS =====
log "Testing Finance Module..."
source "$(dirname "$0")/test_finance.sh"
test_finance_module
separator

# ===== PAYROLL TESTS =====
log "Testing Payroll Module..."
source "$(dirname "$0")/test_payroll.sh"
test_payroll_module
separator

# ===== COURSES TESTS =====
log "Testing Course Management Module..."
source "$(dirname "$0")/test_courses.sh"
test_courses_module
separator

# ===== CLASSES TESTS =====
log "Testing Class Management Module..."
source "$(dirname "$0")/test_classes.sh"
test_classes_module
separator

# ===== EXAMS TESTS =====
log "Testing Exam Management Module..."
source "$(dirname "$0")/test_exams.sh"
test_exams_module
separator

# ===== TIMETABLE TESTS =====
log "Testing Timetable Module..."
source "$(dirname "$0")/test_timetable.sh"
test_timetable_module
separator

# ===== FEE MODULE =====
log "Testing Fee Management Module..."
source "$(dirname "$0")/test_fee.sh"
test_fee_module
separator

# ===== RESOURCES TESTS =====
log "Testing Resource Management Module..."
source "$(dirname "$0")/test_resources.sh"
test_resources_module
separator

# ===== RESPONSIBILITY TESTS =====
log "Testing Responsibility Module..."
source "$(dirname "$0")/test_responsibilities.sh"
test_responsibilities_module
separator

# ===== COUPONS TESTS =====
log "Testing Coupon Module..."
source "$(dirname "$0")/test_coupons.sh"
test_coupons_module
separator

# ===== ANTI-BULLYING TESTS =====
log "Testing Anti-Bullying Module..."
source "$(dirname "$0")/test_anti_bullying.sh"
test_anti_bullying_module
separator

# ===== PARENT-TEACHER MEETING TESTS =====
log "Testing Parent-Teacher Meeting Module..."
source "$(dirname "$0")/test_ptm.sh"
test_ptm_module
separator

# ===== TRANSPORT TESTS =====
log "Testing Transport Module..."
source "$(dirname "$0")/test_transport.sh"
test_transport_module
separator

# ===== REPORTS TESTS =====
log "Testing Reports Module..."
source "$(dirname "$0")/test_reports.sh"
test_reports_module
separator

# ===== API KEYS TESTS =====
log "Testing API Keys Module..."
source "$(dirname "$0")/test_api_keys.sh"
test_api_keys_module
separator

# ===== HEALTH TESTS =====
log "Testing Health Endpoint..."
source "$(dirname "$0")/test_health.sh"
test_health_module
separator

# ===== SECURITY TESTS =====
log "Testing Security Checks..."
source "$(dirname "$0")/test_security.sh"
test_security_module
separator

# ===== WEBHOOKS TESTS =====
log "Testing Webhook Module..."
source "$(dirname "$0")/test_webhooks.sh"
test_webhooks_module
separator

# ===== NOTIFICATIONS TESTS =====
log "Testing Notifications Module..."
source "$(dirname "$0")/test_notifications.sh"
test_notifications_module
separator

# ===== SMS TESTS =====
log "Testing SMS Module..."
source "$(dirname "$0")/test_sms.sh"
test_sms_module
separator

# ===== EMAIL TESTS =====
log "Testing Email Module..."
source "$(dirname "$0")/test_email.sh"
test_email_module
separator

# ===== ANNOUNCEMENTS TESTS =====
log "Testing Announcements Module..."
source "$(dirname "$0")/test_announcements.sh"
test_announcements_module
separator

# ===== SHOOTING TESTS =====
log "Testing Shooting Module..."
source "$(dirname "$0")/test_shooting.sh"
test_shooting_module
separator

# ===== LESSON PLANS TESTS =====
log "Testing Lesson Plans Module..."
source "$(dirname "$0")/test_lesson_plans.sh"
test_lesson_plans_module
separator

# ===== SETTINGS TESTS =====
log "Testing Settings Module..."
source "$(dirname "$0")/test_settings.sh"
test_settings_module
separator

# ===== EMBEDDING TESTS =====
log "Testing Embedding Module..."
source "$(dirname "$0")/test_embedding.sh"
test_embedding_module
separator

# ===== CHAT MODULE TESTS =====
log "Testing Chat Module..."
source "$(dirname "$0")/test_chat.sh"
test_chat_module
separator

# ===== REDIS TESTING =====
log "Testing Redis Integration..."
source "$(dirname "$0")/test_redis.sh"
test_redis_module
separator

# ===== LOGGED OUT USERS =====
log "Testing Logged Out Users..."
source "$(dirname "$0")/test_logged_out_users.sh"
test_logged_out_users_module
separator

# ===== CMS TESTS =====
log "Testing CMS Module..."
source "$(dirname "$0")/test_cms.sh"
test_cms_module
separator

# ===== SYSTEM TESTS =====
log "Testing System Module..."
source "$(dirname "$0")/test_system.sh"
test_system_module
separator

# ===== WEB DEVELOPMENT TESTS =====
log "Testing Web Development Module..."
source "$(dirname "$0")/test_webdev.sh"
test_webdev_module
separator

# Print final summary
print_summary
