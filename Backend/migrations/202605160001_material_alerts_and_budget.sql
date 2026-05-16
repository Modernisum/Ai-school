CREATE TABLE IF NOT EXISTS material_alert_log (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    space_name VARCHAR(255) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    deficit_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, space_name, material_name, status)
);

CREATE INDEX IF NOT EXISTS idx_material_alert_active ON material_alert_log(school_id, status);
CREATE INDEX IF NOT EXISTS idx_material_alert_school ON material_alert_log(school_id);

ALTER TABLE spaces ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2) DEFAULT NULL;
