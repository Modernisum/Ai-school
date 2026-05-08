-- Seed attendance data for school 689225
-- This script inserts test attendance records for testing the advanced attendance filters
-- Run as superuser or with RLS bypass

-- Set RLS context for this school
SET app.current_school_id = '689225';

-- Insert attendance records for students across multiple dates and classes
INSERT INTO attendance (school_id, role, user_id, date, status, in_time, out_time, class_name, reason)
VALUES
  -- Class 10 students - today
  ('689225', 'student', 'STU001', CURRENT_DATE, 'present', '2026-04-23 08:00:00+05:30', '2026-04-23 14:30:00+05:30', '10', 'Regular attendance'),
  ('689225', 'student', 'STU002', CURRENT_DATE, 'present', '2026-04-23 08:05:00+05:30', '2026-04-23 14:25:00+05:30', '10', 'Regular attendance'),
  ('689225', 'student', 'STU003', CURRENT_DATE, 'absent', NULL, NULL, '10', 'No information'),
  ('689225', 'student', 'STU004', CURRENT_DATE, 'present', '2026-04-23 08:10:00+05:30', '2026-04-23 14:20:00+05:30', '10', 'Late arrival'),
  ('689225', 'student', 'STU005', CURRENT_DATE, 'leave', NULL, NULL, '10', 'Sick leave'),

  -- Class 10 students - yesterday
  ('689225', 'student', 'STU001', CURRENT_DATE - INTERVAL '1 day', 'present', '2026-04-22 08:00:00+05:30', '2026-04-22 14:30:00+05:30', '10', 'Regular attendance'),
  ('689225', 'student', 'STU002', CURRENT_DATE - INTERVAL '1 day', 'present', '2026-04-22 08:00:00+05:30', '2026-04-22 14:30:00+05:30', '10', 'Regular attendance'),
  ('689225', 'student', 'STU003', CURRENT_DATE - INTERVAL '1 day', 'present', '2026-04-22 08:00:00+05:30', '2026-04-22 14:30:00+05:30', '10', 'Regular attendance'),
  ('689225', 'student', 'STU004', CURRENT_DATE - INTERVAL '1 day', 'absent', NULL, NULL, '10', 'No information'),
  ('689225', 'student', 'STU005', CURRENT_DATE - INTERVAL '1 day', 'present', '2026-04-22 08:15:00+05:30', '2026-04-22 14:00:00+05:30', '10', 'Left early'),

  -- Class 12 students - today
  ('689225', 'student', 'STU010', CURRENT_DATE, 'present', '2026-04-23 08:00:00+05:30', '2026-04-23 15:00:00+05:30', '12', 'Regular attendance'),
  ('689225', 'student', 'STU011', CURRENT_DATE, 'present', '2026-04-23 08:30:00+05:30', '2026-04-23 15:00:00+05:30', '12', 'Late arrival'),
  ('689225', 'student', 'STU012', CURRENT_DATE, 'absent', NULL, NULL, '12', 'No information'),
  ('689225', 'student', 'STU013', CURRENT_DATE, 'present', '2026-04-23 08:00:00+05:30', '2026-04-23 14:45:00+05:30', '12', 'Regular attendance'),

  -- Class 12 students - yesterday
  ('689225', 'student', 'STU010', CURRENT_DATE - INTERVAL '1 day', 'present', '2026-04-22 08:00:00+05:30', '2026-04-22 15:00:00+05:30', '12', 'Regular attendance'),
  ('689225', 'student', 'STU011', CURRENT_DATE - INTERVAL '1 day', 'present', '2026-04-22 08:00:00+05:30', '2026-04-22 15:00:00+05:30', '12', 'Regular attendance'),
  ('689225', 'student', 'STU012', CURRENT_DATE - INTERVAL '1 day', 'present', '2026-04-22 08:00:00+05:30', '2026-04-22 15:00:00+05:30', '12', 'Regular attendance'),
  ('689225', 'student', 'STU013', CURRENT_DATE - INTERVAL '1 day', 'leave', NULL, NULL, '12', 'Personal work'),

  -- Class 9 students - today
  ('689225', 'student', 'STU020', CURRENT_DATE, 'present', '2026-04-23 08:00:00+05:30', '2026-04-23 14:00:00+05:30', '9', 'Regular attendance'),
  ('689225', 'student', 'STU021', CURRENT_DATE, 'present', '2026-04-23 08:20:00+05:30', '2026-04-23 14:00:00+05:30', '9', 'Late arrival'),
  ('689225', 'student', 'STU022', CURRENT_DATE, 'absent', NULL, NULL, '9', 'No information'),

  -- Employees - today
  ('689225', 'employee', 'EMP001', CURRENT_DATE, 'present', '2026-04-23 07:30:00+05:30', '2026-04-23 16:00:00+05:30', NULL, 'On time'),
  ('689225', 'employee', 'EMP002', CURRENT_DATE, 'present', '2026-04-23 07:45:00+05:30', '2026-04-23 16:00:00+05:30', NULL, 'Regular'),
  ('689225', 'employee', 'EMP003', CURRENT_DATE, 'absent', NULL, NULL, NULL, 'No information'),
  ('689225', 'employee', 'EMP004', CURRENT_DATE, 'present', '2026-04-23 09:00:00+05:30', '2026-04-23 16:30:00+05:30', NULL, 'Late arrival'),

  -- Employees - yesterday
  ('689225', 'employee', 'EMP001', CURRENT_DATE - INTERVAL '1 day', 'present', '2026-04-22 07:30:00+05:30', '2026-04-22 16:00:00+05:30', NULL, 'On time'),
  ('689225', 'employee', 'EMP002', CURRENT_DATE - INTERVAL '1 day', 'present', '2026-04-22 07:30:00+05:30', '2026-04-22 16:00:00+05:30', NULL, 'Regular'),
  ('689225', 'employee', 'EMP003', CURRENT_DATE - INTERVAL '1 day', 'present', '2026-04-22 07:30:00+05:30', '2026-04-22 16:00:00+05:30', NULL, 'Regular'),
  ('689225', 'employee', 'EMP004', CURRENT_DATE - INTERVAL '1 day', 'leave', NULL, NULL, NULL, 'Casual leave'),

  -- More dates for weekly/monthly testing (last 7 days)
  ('689225', 'student', 'STU001', CURRENT_DATE - INTERVAL '2 days', 'present', '2026-04-21 08:00:00+05:30', '2026-04-21 14:30:00+05:30', '10', 'Regular'),
  ('689225', 'student', 'STU001', CURRENT_DATE - INTERVAL '3 days', 'present', '2026-04-20 08:00:00+05:30', '2026-04-20 14:30:00+05:30', '10', 'Regular'),
  ('689225', 'student', 'STU001', CURRENT_DATE - INTERVAL '4 days', 'absent', NULL, NULL, '10', 'Sick'),
  ('689225', 'student', 'STU001', CURRENT_DATE - INTERVAL '5 days', 'present', '2026-04-18 08:00:00+05:30', '2026-04-18 14:30:00+05:30', '10', 'Regular'),
  ('689225', 'student', 'STU001', CURRENT_DATE - INTERVAL '6 days', 'present', '2026-04-17 08:00:00+05:30', '2026-04-17 14:30:00+05:30', '10', 'Regular'),

  ('689225', 'student', 'STU002', CURRENT_DATE - INTERVAL '2 days', 'present', '2026-04-21 08:00:00+05:30', '2026-04-21 14:30:00+05:30', '10', 'Regular'),
  ('689225', 'student', 'STU002', CURRENT_DATE - INTERVAL '3 days', 'leave', NULL, NULL, '10', 'Family function'),
  ('689225', 'student', 'STU002', CURRENT_DATE - INTERVAL '4 days', 'present', '2026-04-19 08:00:00+05:30', '2026-04-19 14:30:00+05:30', '10', 'Regular'),
  ('689225', 'student', 'STU002', CURRENT_DATE - INTERVAL '5 days', 'present', '2026-04-18 08:00:00+05:30', '2026-04-18 14:30:00+05:30', '10', 'Regular'),
  ('689225', 'student', 'STU002', CURRENT_DATE - INTERVAL '6 days', 'absent', NULL, NULL, '10', 'No info'),

  -- Employee weekly data
  ('689225', 'employee', 'EMP001', CURRENT_DATE - INTERVAL '2 days', 'present', '2026-04-21 07:30:00+05:30', '2026-04-21 16:00:00+05:30', NULL, 'Regular'),
  ('689225', 'employee', 'EMP001', CURRENT_DATE - INTERVAL '3 days', 'present', '2026-04-20 07:30:00+05:30', '2026-04-20 16:00:00+05:30', NULL, 'Regular'),
  ('689225', 'employee', 'EMP001', CURRENT_DATE - INTERVAL '4 days', 'present', '2026-04-19 07:30:00+05:30', '2026-04-19 16:00:00+05:30', NULL, 'Regular'),
  ('689225', 'employee', 'EMP001', CURRENT_DATE - INTERVAL '5 days', 'present', '2026-04-18 07:30:00+05:30', '2026-04-18 16:00:00+05:30', NULL, 'Regular'),
  ('689225', 'employee', 'EMP001', CURRENT_DATE - INTERVAL '6 days', 'present', '2026-04-17 07:30:00+05:30', '2026-04-17 16:00:00+05:30', NULL, 'Regular')
ON CONFLICT (school_id, role, user_id, date) DO NOTHING;
