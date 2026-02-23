-- Fix schema mismatches for Setup School Flow

-- Spaces
DROP TABLE IF EXISTS spaces CASCADE;
CREATE TABLE spaces (
    id VARCHAR(255),
    school_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    PRIMARY KEY(school_id, id)
);

-- Items
DROP TABLE IF EXISTS items CASCADE;
CREATE TABLE items (
    id VARCHAR(255),
    school_id VARCHAR(255) NOT NULL,
    space_id VARCHAR(255),
    name VARCHAR(255),
    room_number VARCHAR(255),
    class_id VARCHAR(255),
    PRIMARY KEY(school_id, space_id, id)
);

-- Materials
DROP TABLE IF EXISTS materials CASCADE;
CREATE TABLE materials (
    id VARCHAR(255),
    school_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    quantity INT DEFAULT 0,
    unit_price FLOAT DEFAULT 0.0,
    extra_unit INT DEFAULT 0,
    need_unit INT DEFAULT 0,
    PRIMARY KEY(school_id, id)
);

-- Material Locations
DROP TABLE IF EXISTS material_locations CASCADE;
CREATE TABLE material_locations (
    school_id VARCHAR(255),
    material_id VARCHAR(255),
    space_id VARCHAR(255),
    item_id VARCHAR(255),
    quantity INT DEFAULT 0,
    PRIMARY KEY(school_id, material_id, space_id, item_id)
);

-- Classes
DROP TABLE IF EXISTS classes CASCADE;
CREATE TABLE classes (
    id VARCHAR(255),
    school_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    total_students INT DEFAULT 0,
    total_teachers INT DEFAULT 0,
    total_periods INT DEFAULT 0,
    room_number VARCHAR(255),
    class_fees FLOAT DEFAULT 0.0,
    sections JSONB DEFAULT '[]',
    streams JSONB DEFAULT '[]',
    PRIMARY KEY(school_id, id)
);

-- Subjects
DROP TABLE IF EXISTS subjects CASCADE;
CREATE TABLE subjects (
    id VARCHAR(255),
    school_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    class_id VARCHAR(255),
    class_name VARCHAR(255),
    fees FLOAT DEFAULT 0.0,
    PRIMARY KEY(school_id, id)
);
