-- Migration: 202605180001_exam_checker_workflow.sql
-- Description: Exam checker workflow — assignment, review, approval, result publishing

-- 1. Add checker assignment and status columns to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS checker_employee_id TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS checker_assigned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS checked_by TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS checked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS results_published BOOLEAN DEFAULT FALSE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS results_published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS strictness_level TEXT DEFAULT 'medium'; -- 'low', 'medium', 'hard'

-- 2. Add checker columns to student_submissions
ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS checked_by TEXT;
ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS checked_at TIMESTAMP WITH TIME ZONE;

-- 3. Add approval columns to ai_grading_results
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS reviewed_by_checker BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS checker_id TEXT;
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS checker_notes TEXT;
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS teacher_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS teacher_id TEXT;
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS teacher_notes TEXT;
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS teacher_adjusted_score DECIMAL(5,2);
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS strictness_used TEXT;

-- 4. Create exam_submission_pages table for page-level image tracking
CREATE TABLE IF NOT EXISTS exam_submission_pages (
    page_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES student_submissions(submission_id) ON DELETE CASCADE,
    school_id VARCHAR(255) NOT NULL,
    page_number INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    ocr_text TEXT,
    ocr_confidence DECIMAL(5,2),
    is_permanent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(submission_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_esp_submission ON exam_submission_pages(submission_id);
CREATE INDEX IF NOT EXISTS idx_esp_school ON exam_submission_pages(school_id);

ALTER TABLE exam_submission_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY exam_submission_pages_school_isolation ON exam_submission_pages
    USING (school_id = current_setting('app.current_school_id'));

COMMENT ON TABLE exam_submission_pages IS 'Individual page images of student exam submissions with OCR text';
