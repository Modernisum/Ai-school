-- Migration: 202604120001_create_gradebook_table.sql
-- Description: Create gradebook table for storing student grades and syncing with grading system

-- 1. Gradebook table - stores final grades for students
CREATE TABLE IF NOT EXISTS gradebook (
    gradebook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    academic_year VARCHAR(20) NOT NULL, -- e.g., '2024-2025'
    term VARCHAR(50) NOT NULL, -- 'Term 1', 'Semester 1', 'Quarter 1'
    subject_name VARCHAR(255) NOT NULL,
    class_name VARCHAR(255) NOT NULL,
    assessment_type VARCHAR(100) NOT NULL, -- 'exam', 'assignment', 'project', 'quiz'
    assessment_name VARCHAR(255) NOT NULL, -- 'Mid-Term Exam', 'Homework 3'
    assessment_id VARCHAR(255), -- Reference to exam/assignment ID
    submission_id UUID REFERENCES student_submissions(submission_id),
    rubric_id UUID REFERENCES grading_rubrics(rubric_id),
    
    -- Grading data
    raw_score DECIMAL(5,2), -- Actual score obtained
    max_score DECIMAL(5,2) NOT NULL DEFAULT 100.0,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN max_score > 0 THEN (raw_score / max_score) * 100 
            ELSE 0 
        END
    ) STORED,
    grade VARCHAR(10), -- 'A', 'B', 'C', 'D', 'F' or custom grade
    grade_points DECIMAL(3,2), -- GPA points (4.0 scale)
    
    -- Metadata
    grading_method VARCHAR(50) DEFAULT 'manual', -- 'manual', 'ai', 'rubric', 'hybrid'
    graded_by VARCHAR(255), -- Teacher ID or 'ai_system'
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Status flags
    is_published BOOLEAN DEFAULT false, -- Whether grade is visible to student/parent
    requires_review BOOLEAN DEFAULT false, -- Flag for teacher review
    review_notes TEXT,
    
    -- Sync information
    sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'synced', 'failed'
    last_sync_attempt TIMESTAMP WITH TIME ZONE,
    sync_error TEXT,
    
    -- Constraints and indexes
    UNIQUE(school_id, student_id, assessment_id, assessment_type),
    CONSTRAINT valid_score CHECK (raw_score >= 0 AND raw_score <= max_score)
);

-- 2. Gradebook summary table - aggregated performance per student per subject
CREATE TABLE IF NOT EXISTS gradebook_summary (
    summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    term VARCHAR(50) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    class_name VARCHAR(255) NOT NULL,
    
    -- Aggregated statistics
    total_assessments INTEGER DEFAULT 0,
    completed_assessments INTEGER DEFAULT 0,
    average_percentage DECIMAL(5,2) DEFAULT 0.0,
    weighted_average DECIMAL(5,2) DEFAULT 0.0,
    total_grade_points DECIMAL(5,2) DEFAULT 0.0,
    gpa DECIMAL(3,2) DEFAULT 0.0,
    letter_grade VARCHAR(10),
    
    -- Performance bands
    highest_score DECIMAL(5,2),
    lowest_score DECIMAL(5,2),
    improvement_trend VARCHAR(20), -- 'improving', 'declining', 'stable'
    
    -- Attendance correlation
    attendance_percentage DECIMAL(5,2),
    
    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(school_id, student_id, academic_year, term, subject_name)
);

-- 3. Gradebook sync queue - for batch synchronization
CREATE TABLE IF NOT EXISTS gradebook_sync_queue (
    queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    gradebook_id UUID REFERENCES gradebook(gradebook_id),
    operation VARCHAR(20) NOT NULL, -- 'insert', 'update', 'delete'
    sync_priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gradebook_school_student ON gradebook(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_subject_class ON gradebook(school_id, subject_name, class_name);
CREATE INDEX IF NOT EXISTS idx_gradebook_assessment ON gradebook(school_id, assessment_type, assessment_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_sync_status ON gradebook(school_id, sync_status) WHERE sync_status != 'synced';

CREATE INDEX IF NOT EXISTS idx_gradebook_summary_school_student ON gradebook_summary(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_summary_subject ON gradebook_summary(school_id, subject_name, academic_year);

CREATE INDEX IF NOT EXISTS idx_gradebook_sync_queue_status ON gradebook_sync_queue(status, sync_priority);
CREATE INDEX IF NOT EXISTS idx_gradebook_sync_queue_school ON gradebook_sync_queue(school_id, status);

-- Enable Row Level Security
ALTER TABLE gradebook ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook_sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY gradebook_school_isolation ON gradebook
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY gradebook_summary_school_isolation ON gradebook_summary
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY gradebook_sync_queue_school_isolation ON gradebook_sync_queue
    USING (school_id = current_setting('app.current_school_id'));

-- Comments
COMMENT ON TABLE gradebook IS 'Stores individual student grades for assessments with sync tracking';
COMMENT ON TABLE gradebook_summary IS 'Aggregated student performance per subject per term';
COMMENT ON TABLE gradebook_sync_queue IS 'Queue for batch synchronization of gradebook data with external systems';

-- Function to update gradebook summary when grades are added/updated
CREATE OR REPLACE FUNCTION update_gradebook_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert summary record
    INSERT INTO gradebook_summary (
        school_id, student_id, academic_year, term, subject_name, class_name,
        total_assessments, completed_assessments, average_percentage,
        highest_score, lowest_score, last_updated
    )
    SELECT 
        g.school_id,
        g.student_id,
        g.academic_year,
        g.term,
        g.subject_name,
        g.class_name,
        COUNT(*) as total_assessments,
        COUNT(CASE WHEN g.raw_score IS NOT NULL THEN 1 END) as completed_assessments,
        AVG(g.percentage) as average_percentage,
        MAX(g.raw_score) as highest_score,
        MIN(g.raw_score) as lowest_score,
        CURRENT_TIMESTAMP
    FROM gradebook g
    WHERE g.school_id = NEW.school_id 
        AND g.student_id = NEW.student_id
        AND g.academic_year = NEW.academic_year
        AND g.term = NEW.term
        AND g.subject_name = NEW.subject_name
    GROUP BY g.school_id, g.student_id, g.academic_year, g.term, g.subject_name, g.class_name
    ON CONFLICT (school_id, student_id, academic_year, term, subject_name) 
    DO UPDATE SET
        total_assessments = EXCLUDED.total_assessments,
        completed_assessments = EXCLUDED.completed_assessments,
        average_percentage = EXCLUDED.average_percentage,
        highest_score = EXCLUDED.highest_score,
        lowest_score = EXCLUDED.lowest_score,
        last_updated = EXCLUDED.last_updated;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update summary when gradebook changes
CREATE TRIGGER trigger_update_gradebook_summary
AFTER INSERT OR UPDATE ON gradebook
FOR EACH ROW
EXECUTE FUNCTION update_gradebook_summary();

-- Function to calculate letter grade based on percentage
CREATE OR REPLACE FUNCTION calculate_letter_grade(percentage DECIMAL)
RETURNS VARCHAR(10) AS $$
BEGIN
    RETURN CASE
        WHEN percentage >= 90 THEN 'A'
        WHEN percentage >= 80 THEN 'B'
        WHEN percentage >= 70 THEN 'C'
        WHEN percentage >= 60 THEN 'D'
        WHEN percentage >= 50 THEN 'E'
        ELSE 'F'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;