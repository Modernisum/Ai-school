-- Up
CREATE TABLE IF NOT EXISTS messages (
    message_id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    sender_id VARCHAR(50) NOT NULL,
    sender_type VARCHAR(20) NOT NULL, -- 'employee', 'student', 'parent', 'admin'
    receiver_id VARCHAR(50) NOT NULL,
    receiver_type VARCHAR(20) NOT NULL, -- 'employee', 'student', 'parent', 'admin' OR 'group'
    content TEXT NOT NULL,
    attachment_url VARCHAR(255),
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_school_conversation ON messages(school_id, sender_id, receiver_id);

-- Down
DROP TABLE IF EXISTS messages;
