-- Migration: Clean up orphaned alerts and add foreign key constraints for material_alert_log

-- 1. Deduplicate spaces and materials to ensure unique constraints can be applied
DELETE FROM spaces a USING spaces b
WHERE a.school_id = b.school_id 
  AND a.name = b.name 
  AND a.id > b.id;

DELETE FROM materials a USING materials b
WHERE a.school_id = b.school_id 
  AND a.name = b.name 
  AND a.id > b.id;

-- 2. Add unique constraints to spaces and materials tables
ALTER TABLE spaces DROP CONSTRAINT IF EXISTS unique_school_space_name;
ALTER TABLE spaces ADD CONSTRAINT unique_school_space_name UNIQUE (school_id, name);

ALTER TABLE materials DROP CONSTRAINT IF EXISTS unique_school_material_name;
ALTER TABLE materials ADD CONSTRAINT unique_school_material_name UNIQUE (school_id, name);

-- 3. Clean up orphaned alert logs that do not match active spaces
DELETE FROM material_alert_log
WHERE (school_id, space_name) NOT IN (SELECT school_id, name FROM spaces);

-- 4. Clean up orphaned alert logs that do not match active materials
DELETE FROM material_alert_log
WHERE (school_id, material_name) NOT IN (SELECT school_id, name FROM materials);

-- 5. Add foreign key constraints to material_alert_log to ensure cascade delete/update
ALTER TABLE material_alert_log
    DROP CONSTRAINT IF EXISTS fk_material_alert_log_space,
    DROP CONSTRAINT IF EXISTS fk_material_alert_log_material;

ALTER TABLE material_alert_log
    ADD CONSTRAINT fk_material_alert_log_space
    FOREIGN KEY (school_id, space_name)
    REFERENCES spaces(school_id, name)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE material_alert_log
    ADD CONSTRAINT fk_material_alert_log_material
    FOREIGN KEY (school_id, material_name)
    REFERENCES materials(school_id, name)
    ON UPDATE CASCADE
    ON DELETE CASCADE;
