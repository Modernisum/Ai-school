# Ai-School Backend Database Schema

This document outlines the PostgreSQL database schema for the Ai-School backend, categorized by their functional modules. All tables use multi-tenant architecture with `school_id` as a partition key.

---

## Table of Contents
1. [Core Entities (Users & Organizations)](#1-core-entities-users--organizations)
2. [Authentication & Sessions](#2-authentication--sessions)
3. [Academic & Curriculum](#3-academic--curriculum)
4. [Setup, Spaces & Inventory](#4-setup-spaces--inventory)
5. [Financials (Fees & Payroll)](#5-financials-fees--payroll)
6. [Operations & Daily Tracking](#6-operations--daily-tracking)
7. [Communication & Engagement](#7-communication--engagement)
8. [Auxiliary (Awards & Responsibilities)](#8-auxiliary-awards--responsibilities)
9. [Extended Employee Data](#9-extended-employee-data)
10. [Class Scheduling](#10-class-scheduling)
11. [Spaces Sub-Tables](#11-spaces-sub-tables)
12. [Audit & Logging](#12-audit--logging)
13. [Referral & Coupons](#13-referral--coupons)
14. [Document Box](#14-document-box)
15. [HR & Leave Management](#15-hr--leave-management)
16. [Super Admin Tables](#16-super-admin-tables)

---

## 1. Core Entities (Users & Organizations)
Fundamental entities that drive the platform.

### `schools`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | UNIQUE NOT NULL |
| school_name | TEXT | NOT NULL |
| data | JSONB | DEFAULT '{}' |
| wallet_balance | DECIMAL(12,2) | DEFAULT 0.00 |
| base_rate | DECIMAL(12,2) | DEFAULT 0.00 |
| per_student_rate | DECIMAL(12,2) | DEFAULT 0.00 |
| billing_status | VARCHAR(50) | DEFAULT 'trial' |
| trial_ends_at | TIMESTAMPTZ | - |
| last_billing_date | TIMESTAMPTZ | - |
| status | VARCHAR(50) | DEFAULT 'active' |
| is_blocked | BOOLEAN | DEFAULT FALSE |
| session_duration_hours | INT | DEFAULT 24 |
| notification | JSONB | - |
| active_promo_id | INT | - |
| promo_expires_at | TIMESTAMPTZ | - |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

### `students`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| student_id | VARCHAR(255) | NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| class_name | VARCHAR(100) | NOT NULL |
| name | TEXT | - |
| roll_number | INT | - |
| section | VARCHAR(50) | - |
| status | VARCHAR(50) | NOT NULL |
| dob | TEXT | - |
| gender | TEXT | - |
| father_name | TEXT | - |
| mother_name | TEXT | - |
| aadhaar_number | TEXT | - |
| address_line1 | TEXT | - |
| address_city | TEXT | - |
| address_state | TEXT | - |
| address_pincode | TEXT | - |
| tc_number | TEXT | - |
| contact | TEXT | - |
| alternative_contact | TEXT | - |
| email | TEXT | - |
| transport_enabled | BOOLEAN | DEFAULT false |
| transport_radius | TEXT | - |
| additional_subjects | TEXT | - |
| admission_date | TEXT | - |
| room_number | TEXT | - |
| enrolled_subjects | JSONB | DEFAULT '[]' |
| total_fees | NUMERIC(15,2) | DEFAULT 0.00 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |
| | | UNIQUE(school_id, student_id) |

### `employees`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| employee_id | VARCHAR(255) | UNIQUE NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| employee_type | VARCHAR(50) | NOT NULL |
| data | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

---

## 2. Authentication & Sessions
Securing access to the platform.

### `auth`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | UNIQUE NOT NULL |
| password | TEXT | NOT NULL |
| password_temp | BOOLEAN | DEFAULT FALSE |
| security_question | TEXT | - |
| security_answer_hash | TEXT | - |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

### `tokens`
| Column | Type | Constraint |
|---|---|---|
| token_id | TEXT | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| user_type | VARCHAR(50) | NOT NULL |
| status | VARCHAR(50) | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| expires_at | TIMESTAMPTZ | NOT NULL |

---

## 3. Academic & Curriculum
Managing classes, subjects, chapters, and exams.

> **Note:** The `classes` and `subjects` tables were recreated in a later migration (`fix_schema.sql`) with new columns. The final schema is what's shown below.

### `classes`
| Column | Type | Constraint |
|---|---|---|
| id | VARCHAR(255) | - |
| school_id | VARCHAR(255) | NOT NULL |
| name | VARCHAR(255) | - |
| total_students | INT | DEFAULT 0 |
| total_teachers | INT | DEFAULT 0 |
| total_periods | INT | DEFAULT 0 |
| room_number | VARCHAR(255) | - |
| class_fees | FLOAT | DEFAULT 0.0 |
| sections | JSONB | DEFAULT '[]' |
| streams | JSONB | DEFAULT '[]' |
| | | PRIMARY KEY(school_id, id) |

### `subjects`
| Column | Type | Constraint |
|---|---|---|
| id | VARCHAR(255) | - |
| school_id | VARCHAR(255) | NOT NULL |
| name | VARCHAR(255) | - |
| class_id | VARCHAR(255) | - |
| class_name | VARCHAR(255) | - |
| fees | FLOAT | DEFAULT 0.0 |
| is_compulsory | BOOLEAN | DEFAULT TRUE |
| category | VARCHAR(255) | - |
| fee_type | VARCHAR(50) | DEFAULT 'monthly' |
| fee_interval | INTEGER | DEFAULT 1 |
| schedule_type | VARCHAR(50) | DEFAULT 'daily' |
| schedule_data | JSONB | DEFAULT '[]' |
| | | PRIMARY KEY(school_id, id) |

### `chapters`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| class_name | VARCHAR(100) | NOT NULL |
| subject_name | VARCHAR(100) | NOT NULL |
| chapter_name | TEXT | NOT NULL |
| data | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| | | UNIQUE(school_id, class_name, subject_name, chapter_name) |

### `academic_components` (Topics, Exercises, Tests)
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| class_name | VARCHAR(100) | NOT NULL |
| subject_name | VARCHAR(100) | NOT NULL |
| chapter_name | TEXT | NOT NULL |
| component_type | VARCHAR(50) | NOT NULL (topic/exercise/test) |
| component_name | TEXT | NOT NULL |
| data | JSONB | DEFAULT '{}' |
| status | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

### `exams`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| exam_id | VARCHAR(255) | UNIQUE NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| exam_name | TEXT | NOT NULL |
| exam_type | VARCHAR(100) | NOT NULL |
| subject_name | TEXT | NOT NULL |
| class_name | VARCHAR(100) | - |
| chapters | JSONB | - |
| exam_date | TIMESTAMPTZ | - |
| exam_time | TEXT | - |
| duration_minutes | INT | - |
| status | VARCHAR(50) | DEFAULT 'Scheduled' |
| paper | JSONB | - |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

---

## 4. Setup, Spaces & Inventory
Physical infrastructure tracking and item management.

### `spaces`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| space_id | VARCHAR(255) | UNIQUE NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| space_name | TEXT | NOT NULL |
| space_category | TEXT | - |
| space_number | TEXT | - |
| capacity | INT | DEFAULT 0 |
| data | JSONB | DEFAULT '{}' |

### `items`
| Column | Type | Constraint |
|---|---|---|
| item_id | VARCHAR(255) | NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| space_id | VARCHAR(255) | NOT NULL |
| item_name | VARCHAR(255) | - |
| room_number | VARCHAR(255) | - |
| class_id | VARCHAR(255) | - |
| | | PRIMARY KEY(school_id, space_id, item_id) |

### `materials`
| Column | Type | Constraint |
|---|---|---|
| id | VARCHAR(255) | - |
| school_id | VARCHAR(255) | NOT NULL |
| name | VARCHAR(255) | - |
| quantity | INT | DEFAULT 0 |
| unit_price | FLOAT | DEFAULT 0.0 |
| extra_unit | INT | DEFAULT 0 |
| need_unit | INT | DEFAULT 0 |
| | | PRIMARY KEY(school_id, id) |

### `material_locations`
| Column | Type | Constraint |
|---|---|---|
| school_id | VARCHAR(255) | NOT NULL |
| material_id | VARCHAR(255) | NOT NULL |
| space_id | VARCHAR(255) | NOT NULL |
| item_id | VARCHAR(255) | NOT NULL |
| quantity | INT | DEFAULT 0 |
| | | PRIMARY KEY(school_id, material_id, space_id, item_id) |

---

## 5. Financials (Fees & Payroll)
Money inflow (Fees) and outflow (Salaries).

### `fees` (Base School Fee Dictionary)
| Column | Type | Constraint |
|---|---|---|
| id | VARCHAR(50) | PRIMARY KEY |
| school_id | VARCHAR(50) | NOT NULL |
| fees_name | VARCHAR(100) | NOT NULL |
| fees_reason | VARCHAR(255) | - |
| fees_period | VARCHAR(50) | - |
| fees_amount | DECIMAL(10,2) | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| | | UNIQUE(school_id, id) |

### `fee_templates`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| fee_id | VARCHAR(255) | UNIQUE NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| fees_name | TEXT | NOT NULL |
| fees_reason | TEXT | NOT NULL |
| fees_period | VARCHAR(50) | NOT NULL |
| fees_amount | DECIMAL(12,2) | NOT NULL |
| status | VARCHAR(50) | DEFAULT 'active' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `student_fees` (Student Ledger)
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| student_id | VARCHAR(255) | NOT NULL |
| fee_id | VARCHAR(255) | NOT NULL |
| total_fees | DECIMAL(12,2) | NOT NULL |
| pending_amount | DECIMAL(12,2) | NOT NULL |
| discount | DECIMAL(12,2) | DEFAULT 0 |
| status | VARCHAR(50) | NOT NULL |
| payments | JSONB | DEFAULT '[]' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

### `custom_fees`
Ad-hoc, penalized or targeted fees (lab dues, tour fees, fines).
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| fee_id | VARCHAR(255) | UNIQUE NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| fee_name | TEXT | NOT NULL |
| fee_type | VARCHAR(50) | DEFAULT 'one_time' |
| amount | DECIMAL(12,2) | NOT NULL |
| scope | VARCHAR(50) | DEFAULT 'school' |
| target_classes | JSONB | DEFAULT '[]' |
| target_students | JSONB | DEFAULT '[]' |
| due_date | DATE | - |
| has_penalty | BOOLEAN | DEFAULT false |
| penalty_per_day | DECIMAL(12,2) | DEFAULT 0 |
| description | TEXT | - |
| status | VARCHAR(50) | DEFAULT 'active' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

### `custom_fee_records`
Tracks individual student payment/penalty against a custom fee.
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| fee_id | VARCHAR(255) | NOT NULL |
| student_id | VARCHAR(255) | NOT NULL |
| amount | DECIMAL(12,2) | NOT NULL |
| penalty_accrued | DECIMAL(12,2) | DEFAULT 0 |
| paid_amount | DECIMAL(12,2) | DEFAULT 0 |
| status | VARCHAR(50) | DEFAULT 'pending' |
| payments | JSONB | DEFAULT '[]' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |
| | | UNIQUE(school_id, fee_id, student_id) |

### `salaries` (Employee Payslips)
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| salary_id | VARCHAR(255) | UNIQUE NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| employee_id | VARCHAR(255) | NOT NULL |
| month | INT | NOT NULL |
| year | INT | NOT NULL |
| base_salary | DECIMAL(12,2) | NOT NULL |
| bonus | DECIMAL(12,2) | DEFAULT 0 |
| increment_percent | DECIMAL(5,2) | DEFAULT 0 |
| total_salary | DECIMAL(12,2) | NOT NULL |
| due_amount | DECIMAL(12,2) | NOT NULL |
| advance_adjusted | DECIMAL(12,2) | DEFAULT 0 |
| status | VARCHAR(50) | NOT NULL |
| absent_days | INT | DEFAULT 0 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

### `employee_payments`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| payment_id | VARCHAR(255) | UNIQUE NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| employee_id | VARCHAR(255) | NOT NULL |
| payment_type | VARCHAR(50) | NOT NULL |
| amount | DECIMAL(12,2) | NOT NULL |
| salary_id | VARCHAR(255) | - |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

---

## 6. Operations & Daily Tracking
Day-to-day administrative tracking.

### `attendance`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| role | VARCHAR(50) | NOT NULL (student/employee) |
| user_id | VARCHAR(255) | NOT NULL |
| date | DATE | NOT NULL |
| status | VARCHAR(50) | NOT NULL |
| in_time | TIMESTAMPTZ | - |
| out_time | TIMESTAMPTZ | - |
| total_time | TEXT | - |
| reason | TEXT | - |
| description | TEXT | - |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |
| | | UNIQUE(school_id, role, user_id, date) |

### `tasks`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| task_id | VARCHAR(255) | UNIQUE NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| user_type | VARCHAR(50) | NOT NULL (student/employee) |
| parent_id | VARCHAR(255) | NOT NULL |
| task_name | TEXT | NOT NULL |
| time_duration | TEXT | - |
| complete_percentage | DECIMAL(5,2) | DEFAULT 0 |
| status | VARCHAR(50) | NOT NULL |
| update_logs | JSONB | DEFAULT '[]' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

---

## 7. Communication & Engagement
Broadcasting info to the school.

### `announcements`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| target_type | VARCHAR(50) | NOT NULL (school/class/student) |
| user_id | VARCHAR(255) | - |
| title | TEXT | NOT NULL |
| content | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `complains`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| student_id | VARCHAR(255) | - |
| title | TEXT | NOT NULL |
| description | TEXT | - |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `events`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| event_id | VARCHAR(255) | UNIQUE NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| name | TEXT | NOT NULL |
| description | TEXT | - |
| event_date | TIMESTAMPTZ | - |
| items | JSONB | DEFAULT '[]' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `reminders`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| title | TEXT | NOT NULL |
| description | TEXT | - |
| remind_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `communication` (Legacy/Generic)
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| type | VARCHAR(50) | NOT NULL (announcement/complain) |
| title | TEXT | - |
| content | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

---

## 8. Auxiliary (Awards & Responsibilities)
Extras linked to profiles.

### `awards`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| student_id | VARCHAR(255) | - |
| award_name | TEXT | NOT NULL |
| description | TEXT | - |
| date | DATE | - |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `responsibilities`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| responsibility_id | VARCHAR(255) | UNIQUE NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| name | TEXT | NOT NULL |
| description | TEXT | - |
| per_day_price | DECIMAL(10,2) | DEFAULT 0 |
| time_period | INT | DEFAULT 0 |
| space_category | TEXT | - |
| responsibility_field | TEXT | - |
| space_id | TEXT | - |
| work_level | TEXT | - |
| work_amount | DECIMAL(10,2) | DEFAULT 0 |
| work_period | TEXT | - |
| custom_dates | JSONB | DEFAULT '[]' |
| total_price | DECIMAL(10,2) | DEFAULT 0 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `responsibility_spaces`
| Column | Type | Constraint |
|---|---|---|
| responsibility_id | VARCHAR(255) | NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| space_id | VARCHAR(255) | NOT NULL |
| | | PRIMARY KEY(responsibility_id, school_id, space_id) |

### `employee_responsibilities`
| Column | Type | Constraint |
|---|---|---|
| school_id | VARCHAR(255) | NOT NULL |
| employee_id | VARCHAR(255) | NOT NULL |
| responsibility_id | VARCHAR(255) | NOT NULL |
| | | PRIMARY KEY(school_id, employee_id, responsibility_id) |

---

## 9. Extended Employee Data
Separate tables for normalized employee profiles.

### `employee_experience`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| employee_id | VARCHAR(255) | NOT NULL |
| organization_name | TEXT | NOT NULL |
| location | TEXT | - |
| position_profile_type | TEXT | - |
| post_type | TEXT | - |
| join_month_year | TEXT | - |
| end_date | TEXT | - |
| is_current | BOOLEAN | - |
| achievement_description | TEXT | - |
| previous_employee_id | TEXT | - |
| experience_letter_url | TEXT | - |

### `employee_education`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| employee_id | VARCHAR(255) | NOT NULL |
| education_level | TEXT | NOT NULL |
| institute_name | TEXT | NOT NULL |
| location | TEXT | - |
| stream_subject | TEXT | - |
| pass_year | TEXT | - |
| marks_details | TEXT | - |
| medium | TEXT | - |
| document_url | TEXT | - |

### `employee_salaries`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| employee_id | VARCHAR(255) | NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| month | INT | NOT NULL |
| year | INT | NOT NULL |
| base_salary | DECIMAL(12,2) | NOT NULL |
| status | VARCHAR(50) | NOT NULL |

---

## 10. Class Scheduling
Timetable and period management.

### `class_periods`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| class_id | VARCHAR(255) | NOT NULL |
| name | TEXT | - |
| start_time | TIME | - |
| end_time | TIME | - |
| teacher_id | VARCHAR(255) | - |
| subject_id | VARCHAR(255) | - |

### `class_streams`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| class_id | VARCHAR(255) | NOT NULL |
| name | TEXT | - |
| data | JSONB | - |

### `topics`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| subject_id | VARCHAR(255) | NOT NULL |
| name | TEXT | - |
| description | TEXT | - |

---

## 11. Spaces Sub-Tables
Normalized linking tables for space management.

### `space_categories`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | - |
| name | TEXT | - |
| is_default | BOOLEAN | DEFAULT FALSE |

### `space_employees`
| Column | Type | Constraint |
|---|---|---|
| school_id | VARCHAR(255) | NOT NULL |
| space_id | VARCHAR(255) | NOT NULL |
| employee_id | VARCHAR(255) | NOT NULL |

### `space_materials`
| Column | Type | Constraint |
|---|---|---|
| school_id | VARCHAR(255) | NOT NULL |
| space_id | VARCHAR(255) | NOT NULL |
| material_name | TEXT | - |
| quantity | INT | - |
| unit | TEXT | - |

---

## 12. Audit & Logging

### `audit_logs`
Used for exam marks, attendance, material history, OCR, fee, and payroll audit trail.
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| target_type | TEXT | NOT NULL (exam/attendance/material/fee/payment/ocr) |
| target_id | TEXT | NOT NULL |
| action | TEXT | NOT NULL |
| data | JSONB | - |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `auth_logs`
Login action history for schools.
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| action | TEXT | NOT NULL |
| details | TEXT | - |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

---

## 13. Referral & Coupons

### `referral_coupons`
Discount codes linked to employee commissions.
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| coupon_id | VARCHAR(255) | UNIQUE NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| coupon_name | TEXT | NOT NULL |
| discount_type | VARCHAR(50) | NOT NULL (percentage/flat) |
| discount_value | DECIMAL(10,2) | NOT NULL |
| max_uses | INT | DEFAULT 0 |
| current_uses | INT | DEFAULT 0 |
| assigned_employee_id | VARCHAR(255) | - |
| employee_reward | DECIMAL(10,2) | DEFAULT 0 |
| description | TEXT | - |
| status | VARCHAR(50) | DEFAULT 'active' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `coupon_usage_log`
Tracks which student used which coupon and reward paid.
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| coupon_id | VARCHAR(255) | NOT NULL |
| student_id | VARCHAR(255) | NOT NULL |
| discount_applied | DECIMAL(10,2) | NOT NULL |
| employee_id | VARCHAR(255) | - |
| reward_paid | DECIMAL(10,2) | DEFAULT 0 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

---

## 14. Document Box

### `document_box`
Stores uploaded documents (certificates, ID cards, etc.) for users.
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| user_id | VARCHAR(255) | - |
| doc_type | TEXT | - |
| file_url | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

---

## 15. HR & Leave Management

### `leave_applications`
Employee leave requests with approval workflow.
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| leave_id | VARCHAR(255) | UNIQUE NOT NULL |
| school_id | VARCHAR(255) | NOT NULL |
| employee_id | VARCHAR(255) | NOT NULL |
| employee_name | TEXT | - |
| reason | TEXT | NOT NULL |
| leave_type | VARCHAR(50) | DEFAULT 'casual' |
| from_date | DATE | NOT NULL |
| to_date | DATE | NOT NULL |
| status | VARCHAR(50) | DEFAULT 'pending' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `school_holidays`
School-declared holidays with class/employee exemptions.
| Column | Type | Constraint |
|---|---|---|
| id | VARCHAR(255) | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| title | TEXT | NOT NULL |
| description | TEXT | - |
| from_date | TEXT | NOT NULL |
| to_date | TEXT | NOT NULL |
| classes | JSONB | - |
| exempt_employees | JSONB | - |
| exempt_students | JSONB | - |
| created_at | TEXT | NOT NULL |

---

## 16. Super Admin Tables
Tables used exclusively by the platform super-administrator.

### `super_admin`
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| username | TEXT | UNIQUE NOT NULL |
| password_hash | TEXT | NOT NULL |

### `promo_codes`
Platform-level promotional codes to apply credits or discounts to schools.
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| code | TEXT | UNIQUE NOT NULL |
| credit_amount | DECIMAL(12,2) | DEFAULT 0 |
| free_days | INT | DEFAULT 0 |
| discount_percentage | DECIMAL(5,2) | DEFAULT 0 |
| max_uses | INT | DEFAULT 1 |
| current_uses | INT | DEFAULT 0 |
| expires_at | TIMESTAMPTZ | - |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `school_promo_codes`
Tracks which promo codes have been applied to which schools.
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| promo_code_id | INT | NOT NULL |
| applied_at | TIMESTAMPTZ | DEFAULT NOW() |
| | | UNIQUE(school_id, promo_code_id) |

### `billing_ledger`
Financial transaction log for school billing (credits, charges).
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_id | VARCHAR(255) | NOT NULL |
| amount | DECIMAL(12,2) | NOT NULL |
| transaction_type | TEXT | NOT NULL (promo_credit/charge/refund) |
| description | TEXT | - |
| balance_after | DECIMAL(12,2) | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `support_requests`
School support/help tickets submitted to super admin.
| Column | Type | Constraint |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| school_name | TEXT | NOT NULL |
| contact_info | TEXT | NOT NULL |
| message | TEXT | NOT NULL |
| status | VARCHAR(50) | DEFAULT 'open' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
