-- Migration: Add Global Notifications table
-- Description: Stores broadcast messages from Super Admin for all schools

CREATE TABLE IF NOT EXISTS global_notifications (
    id SERIAL PRIMARY KEY,
    notification JSONB NOT NULL, -- {title: string, message: string, type: string, sentAt: timestamptz}
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Index on active state for faster fetching
CREATE INDEX IF NOT EXISTS idx_global_notifications_active ON global_notifications(active) WHERE active = TRUE;
