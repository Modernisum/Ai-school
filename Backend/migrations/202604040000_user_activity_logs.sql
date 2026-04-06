-- Create a table for tracking user sessions and activities globally.
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'login', 'logout', 'open_app', 'expired'
    metadata JSONB,              -- Store browser, IP, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimize queries for tracking history and active status
CREATE INDEX IF NOT EXISTS idx_user_activity_phone ON user_activity_logs(phone);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity_logs(created_at);
