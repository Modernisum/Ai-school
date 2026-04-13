-- Migration: 202604130003_enhanced_grading_schema.sql
-- Description: Add answer keys and grading configuration for smart exam grading

-- 1. Exam Answer Keys table
-- Stores the expected answers for automated matching
CREATE TABLE IF NOT EXISTS exam_answer_keys (
    key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    exam_id VARCHAR(255) NOT NULL, -- References exams table (exam_id)
    question_number INT NOT NULL,
    question_type VARCHAR(100) NOT NULL, -- 'mcq', 'short_answer', 'essay', 'true_false'
    correct_answer TEXT, -- For objective questions
    model_answer TEXT, -- For subjective/essay questions
    keywords TEXT[], -- Evaluation keywords for subjective scoring
    max_marks DECIMAL(5,2) NOT NULL,
    marking_scheme JSONB, -- Details on partial credit
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, exam_id, question_number)
);

-- 2. Grading Configuration table
-- Stores per-school or per-subject rigor settings
CREATE TABLE IF NOT EXISTS grading_config (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    subject_name VARCHAR(255), -- NULL means global school config
    rigor_level VARCHAR(50) DEFAULT 'standard', -- 'strict', 'standard', 'lenient'
    fuzzy_threshold DECIMAL(3,2) DEFAULT 0.85, -- Threshold for partial matching
    ai_feedback_enabled BOOLEAN DEFAULT true,
    manual_review_threshold DECIMAL(3,2) DEFAULT 0.70, -- Results below this flag for teacher review
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, subject_name)
);

-- 3. Extend student_submissions for image metadata
-- Stores bounding boxes and OCR confidence
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_submissions' AND column_name='image_metadata') THEN
        ALTER TABLE student_submissions ADD COLUMN image_metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE exam_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_config ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY exam_answer_keys_school_isolation ON exam_answer_keys
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY grading_config_school_isolation ON grading_config
    USING (school_id = current_setting('app.current_school_id'));

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_exam_answer_keys_exam ON exam_answer_keys(school_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_grading_config_school ON grading_config(school_id);
