-- Migration: 202604110004_create_grading_tables.sql
-- Description: Create tables for automated grading system, rubrics, and plagiarism detection

-- 1. Grading rubrics table
CREATE TABLE IF NOT EXISTS grading_rubrics (
    rubric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    rubric_name VARCHAR(255) NOT NULL,
    rubric_type VARCHAR(100) NOT NULL, -- 'exam', 'assignment', 'essay', 'project'
    subject_name VARCHAR(255),
    class_name VARCHAR(255),
    criteria JSONB NOT NULL, -- Array of criteria with weights and descriptions
    total_score DECIMAL(5,2) NOT NULL DEFAULT 100.0,
    passing_score DECIMAL(5,2) NOT NULL DEFAULT 40.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, rubric_name, rubric_type)
);

-- 2. Student submissions table
CREATE TABLE IF NOT EXISTS student_submissions (
    submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    exam_id VARCHAR(255), -- Reference to exams table
    assignment_name VARCHAR(255),
    submission_type VARCHAR(100) NOT NULL, -- 'exam', 'assignment', 'essay', 'project'
    content TEXT, -- Student's answer/content
    file_url TEXT, -- URL to uploaded file if any
    file_type VARCHAR(50), -- 'pdf', 'docx', 'txt', 'image'
    word_count INTEGER,
    character_count INTEGER,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'submitted' -- 'submitted', 'graded', 'reviewed', 'returned'
);

-- 3. AI grading results table
CREATE TABLE IF NOT EXISTS ai_grading_results (
    grading_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES student_submissions(submission_id) ON DELETE CASCADE,
    school_id VARCHAR(255) NOT NULL,
    rubric_id UUID REFERENCES grading_rubrics(rubric_id),
    overall_score DECIMAL(5,2),
    normalized_score DECIMAL(5,2), -- Score normalized to rubric total
    grade VARCHAR(10), -- 'A', 'B', 'C', 'D', 'F' or percentage
    criteria_scores JSONB, -- Scores for each criterion
    feedback TEXT, -- AI-generated feedback
    strengths TEXT[], -- Array of identified strengths
    weaknesses TEXT[], -- Array of identified weaknesses
    suggestions TEXT[], -- Array of improvement suggestions
    plagiarism_score DECIMAL(5,2), -- 0-100 plagiarism percentage
    plagiarism_matches JSONB, -- Details of plagiarism matches
    confidence_score DECIMAL(5,2), -- AI confidence in grading (0-100)
    grading_provider VARCHAR(100), -- Which AI provider was used
    grading_model VARCHAR(100),
    processing_time_ms INTEGER,
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_by_teacher BOOLEAN DEFAULT false,
    teacher_notes TEXT,
    teacher_adjusted_score DECIMAL(5,2)
);

-- 4. Plagiarism detection cache
CREATE TABLE IF NOT EXISTS plagiarism_cache (
    cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of content
    content_type VARCHAR(50) NOT NULL, -- 'submission', 'source'
    source_id VARCHAR(255), -- submission_id or external source ID
    metadata JSONB,
    indexed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, content_hash, content_type)
);

-- 5. Common errors patterns (for feedback generation)
CREATE TABLE IF NOT EXISTS common_error_patterns (
    pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    subject_name VARCHAR(255),
    error_type VARCHAR(100) NOT NULL, -- 'grammar', 'concept', 'calculation', 'format'
    pattern_text TEXT NOT NULL, -- Regex or text pattern
    description TEXT,
    feedback_template TEXT NOT NULL, -- Template for feedback
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Gradebook synchronization log
CREATE TABLE IF NOT EXISTS gradebook_sync_log (
    sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    submission_id UUID REFERENCES student_submissions(submission_id),
    sync_type VARCHAR(50) NOT NULL, -- 'manual', 'automatic', 'batch'
    sync_status VARCHAR(50) NOT NULL, -- 'pending', 'success', 'failed'
    target_system VARCHAR(100), -- 'internal', 'external_system_name'
    sync_data JSONB,
    error_message TEXT,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    retry_count INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_grading_rubrics_school ON grading_rubrics(school_id);
CREATE INDEX IF NOT EXISTS idx_grading_rubrics_type ON grading_rubrics(rubric_type, subject_name);
CREATE INDEX IF NOT EXISTS idx_student_submissions_school ON student_submissions(school_id);
CREATE INDEX IF NOT EXISTS idx_student_submissions_student ON student_submissions(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_submissions_exam ON student_submissions(school_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_ai_grading_results_submission ON ai_grading_results(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_grading_results_school ON ai_grading_results(school_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_cache_hash ON plagiarism_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_common_errors_school ON common_error_patterns(school_id, subject_name);
CREATE INDEX IF NOT EXISTS idx_gradebook_sync_school ON gradebook_sync_log(school_id, sync_status);

-- Enable Row Level Security
ALTER TABLE grading_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_grading_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE plagiarism_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_error_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY grading_rubrics_school_isolation ON grading_rubrics
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY student_submissions_school_isolation ON student_submissions
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY ai_grading_results_school_isolation ON ai_grading_results
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY plagiarism_cache_school_isolation ON plagiarism_cache
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY common_error_patterns_school_isolation ON common_error_patterns
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY gradebook_sync_log_school_isolation ON gradebook_sync_log
    USING (school_id = current_setting('app.current_school_id'));

-- Comments
COMMENT ON TABLE grading_rubrics IS 'Stores grading rubrics for different assessment types';
COMMENT ON TABLE student_submissions IS 'Student submissions for grading (exams, assignments, essays)';
COMMENT ON TABLE ai_grading_results IS 'AI-generated grading results with feedback and plagiarism detection';
COMMENT ON TABLE plagiarism_cache IS 'Cache for plagiarism detection to avoid reprocessing same content';
COMMENT ON TABLE common_error_patterns IS 'Common error patterns for automated feedback generation';
COMMENT ON TABLE gradebook_sync_log IS 'Log for gradebook synchronization with external systems';