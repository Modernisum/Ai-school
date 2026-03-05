-- Custom Fees: ad-hoc fees like tour, paper, fines with scope targeting

CREATE TABLE IF NOT EXISTS custom_fees (
    id SERIAL PRIMARY KEY,
    fee_id VARCHAR(255) UNIQUE NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    fee_name TEXT NOT NULL,
    fee_type VARCHAR(50) NOT NULL DEFAULT 'one_time',
    amount DECIMAL(12,2) NOT NULL,
    scope VARCHAR(50) NOT NULL DEFAULT 'school',
    target_classes JSONB DEFAULT '[]',
    target_students JSONB DEFAULT '[]',
    due_date DATE,
    has_penalty BOOLEAN DEFAULT false,
    penalty_per_day DECIMAL(12,2) DEFAULT 0,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_fee_records (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    fee_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    penalty_accrued DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    payments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, fee_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_fees_school ON custom_fees(school_id);
CREATE INDEX IF NOT EXISTS idx_custom_fee_records_school ON custom_fee_records(school_id);
CREATE INDEX IF NOT EXISTS idx_custom_fee_records_student ON custom_fee_records(school_id, student_id);
