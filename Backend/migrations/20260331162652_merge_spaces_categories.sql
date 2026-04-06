-- Migration: Merge Spaces and Categories (Start Fresh)
-- DROPPING space_categories table to simplify architecture

DROP TABLE IF EXISTS space_categories CASCADE;

-- The 'spaces' table already contains the 'space_category' column as a string.
-- We are removing the redundant dependency on a separate category table.
