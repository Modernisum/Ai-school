-- Up
CREATE TABLE IF NOT EXISTS online_transactions (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL, -- references students but let's keep it flexible
    fee_type VARCHAR(50) NOT NULL, -- 'regular', 'custom'
    fee_id VARCHAR(50) NOT NULL, -- correlates to student_id for regular, or custom_fee_id
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    gateway_order_id VARCHAR(100) NOT NULL UNIQUE,
    gateway_payment_id VARCHAR(100),
    gateway_signature VARCHAR(255),
    status VARCHAR(50) DEFAULT 'created', -- 'created', 'successful', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for webhooks lookup
CREATE INDEX IF NOT EXISTS idx_online_txn_order_id ON online_transactions(gateway_order_id);

-- Down
DROP TABLE IF EXISTS online_transactions;
