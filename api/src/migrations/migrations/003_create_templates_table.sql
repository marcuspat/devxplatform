-- Migration: Create templates table
-- Description: Creates the templates table for storing service templates

-- Create templates table
CREATE TABLE IF NOT EXISTS devx.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    technology VARCHAR(100),
    framework VARCHAR(100),
    language VARCHAR(100),
    features TEXT[],
    tags TEXT[],
    config JSONB DEFAULT '{}',
    readme_template TEXT,
    is_featured BOOLEAN DEFAULT false,
    is_popular BOOLEAN DEFAULT false,
    rating DECIMAL(2, 1) DEFAULT 0.0,
    downloads INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_templates_slug ON devx.templates(slug);
CREATE INDEX idx_templates_category ON devx.templates(category);
CREATE INDEX idx_templates_technology ON devx.templates(technology);
CREATE INDEX idx_templates_framework ON devx.templates(framework);
CREATE INDEX idx_templates_language ON devx.templates(language);
CREATE INDEX idx_templates_featured ON devx.templates(is_featured);
CREATE INDEX idx_templates_popular ON devx.templates(is_popular);
CREATE INDEX idx_templates_rating ON devx.templates(rating DESC);
CREATE INDEX idx_templates_downloads ON devx.templates(downloads DESC);

-- Create template_stats table for tracking analytics
CREATE TABLE IF NOT EXISTS devx.template_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_count INTEGER DEFAULT 0,
    featured_count INTEGER DEFAULT 0,
    popular_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initialize template stats
INSERT INTO devx.template_stats (total_count, featured_count, popular_count)
VALUES (0, 0, 0);

-- Add trigger to update timestamps
CREATE OR REPLACE FUNCTION devx.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE
    ON devx.templates FOR EACH ROW EXECUTE FUNCTION devx.update_updated_at_column();