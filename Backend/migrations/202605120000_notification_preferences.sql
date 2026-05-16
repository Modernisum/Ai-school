-- Migration: Add notification preferences table
-- Description: Stores per-user notification channel preferences (email, SMS, push, in-app)

CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (school_id, user_id)
);

-- Index for fast lookups by school + user
CREATE INDEX IF NOT EXISTS idx_notif_prefs_school_user ON notification_preferences(school_id, user_id);

-- Enable Row Level Security
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policy: school isolation
CREATE POLICY notification_prefs_school_isolation ON notification_preferences
    USING (school_id = current_setting('app.current_school_id', TRUE));

-- RLS policy: users can only access their own preferences
CREATE POLICY notification_prefs_user_access ON notification_preferences
    USING (user_id = current_setting('app.current_user_id', TRUE)
        OR EXISTS (
            SELECT 1 FROM auth WHERE school_id = notification_preferences.school_id
            AND (role = 'super_admin' OR is_admin = TRUE)
            AND email = current_setting('app.current_user_email', TRUE)
        ));