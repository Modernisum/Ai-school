-- Migration: User Device Tokens for Push Notifications
-- Description: Stores FCM tokens for students and employees to enable push notifications

CREATE TABLE IF NOT EXISTS user_device_tokens (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    school_id TEXT NOT NULL,
    token TEXT NOT NULL,
    platform TEXT, -- ios, android, web
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, school_id, token)
);

CREATE INDEX IF NOT EXISTS idx_user_device_tokens_user ON user_device_tokens(user_id, school_id);
