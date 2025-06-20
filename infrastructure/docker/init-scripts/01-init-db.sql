-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS devx;
CREATE SCHEMA IF NOT EXISTS templates;

-- Set search path
SET search_path TO devx, public;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates.templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    technology VARCHAR(100) NOT NULL,
    language VARCHAR(50) NOT NULL,
    framework VARCHAR(100),
    tags TEXT[],
    repo_url VARCHAR(500),
    demo_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    download_count INTEGER DEFAULT 0,
    star_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    template_id UUID REFERENCES templates.templates(id),
    user_id UUID REFERENCES users(id) NOT NULL,
    repository_url VARCHAR(500),
    deployment_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, slug)
);

-- Create template_categories table
CREATE TABLE IF NOT EXISTS templates.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create template_technologies table
CREATE TABLE IF NOT EXISTS templates.technologies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    website_url VARCHAR(500),
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    template_id UUID REFERENCES templates.templates(id),
    user_id UUID REFERENCES users(id) NOT NULL,
    project_id UUID REFERENCES projects(id),
    service_type VARCHAR(50) NOT NULL DEFAULT 'api',
    port INTEGER,
    health_check_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'inactive',
    deployment_config JSONB DEFAULT '{}',
    environment_vars JSONB DEFAULT '{}',
    resource_limits JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deployed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(project_id, slug)
);

-- Create generation_history table
CREATE TABLE IF NOT EXISTS generation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    template_id UUID REFERENCES templates.templates(id),
    project_id UUID REFERENCES projects(id),
    service_id UUID REFERENCES services(id),
    generation_type VARCHAR(50) NOT NULL, -- 'project', 'service', 'component', etc.
    input_params JSONB DEFAULT '{}',
    output_files JSONB DEFAULT '[]',
    generation_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_templates_slug ON templates.templates(slug);
CREATE INDEX idx_templates_category ON templates.templates(category);
CREATE INDEX idx_templates_technology ON templates.templates(technology);
CREATE INDEX idx_templates_language ON templates.templates(language);
CREATE INDEX idx_templates_tags ON templates.templates USING GIN(tags);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_template_id ON projects(template_id);
CREATE INDEX idx_services_user_id ON services(user_id);
CREATE INDEX idx_services_project_id ON services(project_id);
CREATE INDEX idx_services_template_id ON services(template_id);
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_generation_history_user_id ON generation_history(user_id);
CREATE INDEX idx_generation_history_template_id ON generation_history(template_id);
CREATE INDEX idx_generation_history_project_id ON generation_history(project_id);
CREATE INDEX idx_generation_history_service_id ON generation_history(service_id);
CREATE INDEX idx_generation_history_status ON generation_history(generation_status);
CREATE INDEX idx_generation_history_created_at ON generation_history(created_at);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates.templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO templates.categories (name, slug, description, icon, display_order) VALUES
('Web Applications', 'web-applications', 'Full-stack web applications and frameworks', 'web', 1),
('APIs & Services', 'apis-services', 'REST APIs, GraphQL, and microservices', 'api', 2),
('Database Patterns', 'database-patterns', 'Database connection and ORM patterns', 'database', 3),
('Messaging & Queues', 'messaging-queues', 'Message brokers and queue patterns', 'message-circle', 4),
('Workers & Jobs', 'workers-jobs', 'Background workers and job processors', 'cpu', 5),
('DevOps & Tools', 'devops-tools', 'CI/CD, monitoring, and development tools', 'tool', 6);

-- Insert default technologies
INSERT INTO templates.technologies (name, slug, category, description, website_url) VALUES
('Node.js', 'nodejs', 'runtime', 'JavaScript runtime built on Chrome V8 engine', 'https://nodejs.org'),
('Python', 'python', 'language', 'High-level programming language', 'https://python.org'),
('Go', 'go', 'language', 'Statically typed, compiled programming language', 'https://golang.org'),
('Java', 'java', 'language', 'Object-oriented programming language', 'https://java.com'),
('Rust', 'rust', 'language', 'Systems programming language', 'https://rust-lang.org'),
('React', 'react', 'framework', 'JavaScript library for building user interfaces', 'https://reactjs.org'),
('Next.js', 'nextjs', 'framework', 'React framework for production', 'https://nextjs.org'),
('Express', 'express', 'framework', 'Fast, unopinionated web framework for Node.js', 'https://expressjs.com'),
('FastAPI', 'fastapi', 'framework', 'Modern, fast web framework for Python', 'https://fastapi.tiangolo.com'),
('Spring Boot', 'springboot', 'framework', 'Java-based framework for microservices', 'https://spring.io/projects/spring-boot'),
('PostgreSQL', 'postgresql', 'database', 'Advanced open source relational database', 'https://postgresql.org'),
('Redis', 'redis', 'database', 'In-memory data structure store', 'https://redis.io'),
('Docker', 'docker', 'tool', 'Platform for containerized applications', 'https://docker.com'),
('Kubernetes', 'kubernetes', 'tool', 'Container orchestration platform', 'https://kubernetes.io');

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA devx TO devx;
GRANT ALL PRIVILEGES ON SCHEMA templates TO devx;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA devx TO devx;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA templates TO devx;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA devx TO devx;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA templates TO devx;