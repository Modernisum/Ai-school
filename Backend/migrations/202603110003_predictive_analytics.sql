-- Up
CREATE TABLE IF NOT EXISTS student_risk_profiles (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL,
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_factors JSONB,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_risk UNIQUE (school_id, student_id)
);

CREATE TABLE IF NOT EXISTS school_churn_predictions (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE UNIQUE,
    churn_probability INTEGER NOT NULL CHECK (churn_probability >= 0 AND churn_probability <= 100),
    risk_factors JSONB,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_risk_school ON student_risk_profiles(school_id);

-- Down
DROP TABLE IF EXISTS school_churn_predictions;
DROP TABLE IF EXISTS student_risk_profiles;
