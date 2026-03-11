-- Migration: Add attachment_path to materials and complains for GCS support
ALTER TABLE materials ADD COLUMN attachment_path TEXT;
ALTER TABLE complaints ADD COLUMN attachment_path TEXT;
