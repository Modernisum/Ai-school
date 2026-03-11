-- Phase 3.2: Automated Timetable Generation Schema
-- Constraint-satisfaction tables for teachers, rooms, subjects, and generated schedules

-- Teacher availability/constraints (which days/periods they are free)
CREATE TABLE IF NOT EXISTS teacher_availability (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    teacher_id VARCHAR(50) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Mon,7=Sun
    period_number INTEGER NOT NULL,        -- e.g. 1-8 periods per day
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (school_id, teacher_id, day_of_week, period_number)
);

-- Room definitions (type: classroom, lab, hall)
CREATE TABLE IF NOT EXISTS timetable_rooms (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    room_id VARCHAR(50) NOT NULL,
    room_name VARCHAR(100) NOT NULL,
    room_type VARCHAR(50) DEFAULT 'classroom', -- 'classroom', 'lab', 'hall'
    capacity INTEGER DEFAULT 40,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (school_id, room_id)
);

-- Timetable generation requests (one per class per term)
CREATE TABLE IF NOT EXISTS timetable_configs (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    config_id VARCHAR(100) NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    periods_per_day INTEGER NOT NULL DEFAULT 8,
    working_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- Mon-Fri
    -- Subject requirements JSON: [{"subject_id": "s1", "teacher_id": "t1", "periods_per_week": 5}]
    subject_requirements JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (school_id, config_id)
);

-- Generated timetable slots
CREATE TABLE IF NOT EXISTS timetable_slots (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    config_id VARCHAR(100) NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    day_of_week INTEGER NOT NULL,
    period_number INTEGER NOT NULL,
    subject_id VARCHAR(50),
    subject_name VARCHAR(100),
    teacher_id VARCHAR(50),
    teacher_name VARCHAR(100),
    room_id VARCHAR(50),
    is_free_period BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (school_id, config_id, day_of_week, period_number)
);

-- Track conflicts that couldn't be resolved in generated timetables
CREATE TABLE IF NOT EXISTS timetable_conflicts (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    config_id VARCHAR(100) NOT NULL,
    conflict_type VARCHAR(100) NOT NULL, -- 'teacher_double_booked', 'room_conflict', 'periods_short'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tt_slots_school ON timetable_slots(school_id, config_id);
CREATE INDEX IF NOT EXISTS idx_tt_configs_school ON timetable_configs(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_avail_school ON teacher_availability(school_id, teacher_id);
