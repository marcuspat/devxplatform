-- Migration: 001_create_base_schema
-- Description: Create basic database schema if not exists (safety migration)
-- This migration ensures the core schema exists, but won't conflict with Docker init scripts

-- Create extensions (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas (safe to run multiple times)
CREATE SCHEMA IF NOT EXISTS devx;
CREATE SCHEMA IF NOT EXISTS templates;

-- Set search path
SET search_path TO devx, templates, public;

-- This migration is mainly for safety and to establish the migration system
-- The actual table creation happens via Docker init scripts
SELECT 'Base schema migration completed' as result;