-- Phase 4.1: Outbound Webhook Engine
-- Stores registered endpoints and delivery history with retry logic

CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    secret TEXT NOT NULL, -- HMAC-SHA256 secret
    event_types TEXT[] NOT NULL, -- e.g. {'fee.paid', 'student.enrolled'}
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'disabled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    endpoint_id INTEGER REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status_code INTEGER, -- response from client
    response_body TEXT,
    attempt_count INTEGER DEFAULT 1,
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_school ON webhook_endpoints(school_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_retry ON webhook_delivery_logs(status, next_retry_at) WHERE status = 'pending';
