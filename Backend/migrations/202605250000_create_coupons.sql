-- Migration: Create Coupons and Student Coupons Tables

CREATE TABLE IF NOT EXISTS coupons (
    coupon_id VARCHAR(255) NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    coupon_name VARCHAR(255) NOT NULL,
    discount_type VARCHAR(50) NOT NULL,
    discount_value DOUBLE PRECISION NOT NULL,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    data JSONB,
    PRIMARY KEY (school_id, coupon_id),
    CONSTRAINT unique_school_coupon_name UNIQUE (school_id, coupon_name)
);

CREATE TABLE IF NOT EXISTS student_coupons (
    school_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    coupon_id VARCHAR(255) NOT NULL,
    discount_applied DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (school_id, student_id, coupon_id)
);
