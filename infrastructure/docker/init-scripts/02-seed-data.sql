-- Seed data for DevX Platform
SET search_path TO devx, templates, public;

-- Insert demo user (password: demo123)
INSERT INTO users (email, username, password_hash, full_name, is_admin) VALUES
('admin@devxplatform.local', 'admin', '$2b$10$YourHashedPasswordHere', 'Admin User', true),
('demo@devxplatform.local', 'demo', '$2b$10$YourHashedPasswordHere', 'Demo User', false);

-- Get user IDs for reference
DO $$
DECLARE
    admin_id UUID;
    demo_id UUID;
BEGIN
    SELECT id INTO admin_id FROM users WHERE username = 'admin';
    SELECT id INTO demo_id FROM users WHERE username = 'demo';

    -- Insert template data based on actual templates in the project
    INSERT INTO templates.templates (name, slug, description, category, technology, language, framework, tags, is_featured, created_by) VALUES
    -- Node.js Templates
    ('REST API Template', 'rest-api', 'Production-ready REST API with Express and TypeScript', 'apis-services', 'nodejs', 'typescript', 'express', 
     ARRAY['api', 'rest', 'express', 'typescript', 'nodejs'], true, admin_id),
    
    ('GraphQL API Template', 'graphql-api', 'GraphQL API with Apollo Server and TypeScript', 'apis-services', 'nodejs', 'typescript', 'apollo', 
     ARRAY['api', 'graphql', 'apollo', 'typescript', 'nodejs'], true, admin_id),
    
    ('Next.js Web App', 'webapp-nextjs', 'Full-stack web application with Next.js and TypeScript', 'web-applications', 'nodejs', 'typescript', 'nextjs', 
     ARRAY['webapp', 'nextjs', 'react', 'typescript', 'fullstack'], true, admin_id),
    
    ('Worker Service', 'worker-service', 'Background worker service with Bull queue', 'workers-jobs', 'nodejs', 'typescript', 'bull', 
     ARRAY['worker', 'queue', 'bull', 'typescript', 'nodejs'], false, admin_id),
    
    -- Python Templates
    ('FastAPI Service', 'fastapi', 'Modern Python web API with FastAPI', 'apis-services', 'python', 'python', 'fastapi', 
     ARRAY['api', 'fastapi', 'python', 'async'], true, admin_id),
    
    ('Flask Web App', 'flask', 'Traditional Python web application with Flask', 'web-applications', 'python', 'python', 'flask', 
     ARRAY['webapp', 'flask', 'python'], false, admin_id),
    
    ('Celery Worker', 'celery', 'Distributed task queue with Celery', 'workers-jobs', 'python', 'python', 'celery', 
     ARRAY['worker', 'celery', 'python', 'queue'], false, admin_id),
    
    -- Go Templates
    ('Gin REST API', 'gin', 'High-performance REST API with Gin framework', 'apis-services', 'go', 'go', 'gin', 
     ARRAY['api', 'gin', 'go', 'rest'], true, admin_id),
    
    ('gRPC Service', 'grpc', 'gRPC service with Protocol Buffers', 'apis-services', 'go', 'go', 'grpc', 
     ARRAY['api', 'grpc', 'go', 'protobuf'], false, admin_id),
    
    ('Go Worker', 'go-worker', 'Background worker with Go channels', 'workers-jobs', 'go', 'go', null, 
     ARRAY['worker', 'go', 'concurrent'], false, admin_id),
    
    -- Java Templates
    ('Spring Boot API', 'springboot', 'Enterprise Java REST API with Spring Boot', 'apis-services', 'java', 'java', 'springboot', 
     ARRAY['api', 'springboot', 'java', 'enterprise'], true, admin_id),
    
    ('Spring Cloud Microservice', 'springcloud', 'Cloud-native microservice with Spring Cloud', 'apis-services', 'java', 'java', 'springcloud', 
     ARRAY['microservice', 'springcloud', 'java', 'cloud'], false, admin_id),
    
    -- Rust Templates
    ('Actix Web API', 'actix', 'High-performance web API with Actix', 'apis-services', 'rust', 'rust', 'actix', 
     ARRAY['api', 'actix', 'rust', 'performance'], false, admin_id),
    
    ('Tonic gRPC', 'tonic', 'gRPC service with Tonic framework', 'apis-services', 'rust', 'rust', 'tonic', 
     ARRAY['api', 'grpc', 'rust', 'tonic'], false, admin_id),
    
    -- Database Pattern Templates
    ('Node.js Database Patterns', 'nodejs-db-patterns', 'Database connection patterns for Node.js', 'database-patterns', 'nodejs', 'typescript', null, 
     ARRAY['database', 'nodejs', 'patterns', 'orm'], false, admin_id),
    
    ('Python Database Patterns', 'python-db-patterns', 'SQLAlchemy and database patterns for Python', 'database-patterns', 'python', 'python', null, 
     ARRAY['database', 'python', 'sqlalchemy', 'patterns'], false, admin_id),
    
    ('Go Database Patterns', 'go-db-patterns', 'Database patterns with sqlx and GORM', 'database-patterns', 'go', 'go', null, 
     ARRAY['database', 'go', 'sqlx', 'gorm'], false, admin_id),
    
    ('Java Database Patterns', 'java-db-patterns', 'JPA and JDBC patterns for Java', 'database-patterns', 'java', 'java', null, 
     ARRAY['database', 'java', 'jpa', 'jdbc'], false, admin_id),
    
    -- Messaging Pattern Templates
    ('Node.js Messaging Patterns', 'nodejs-messaging', 'RabbitMQ and Kafka patterns for Node.js', 'messaging-queues', 'nodejs', 'typescript', null, 
     ARRAY['messaging', 'nodejs', 'rabbitmq', 'kafka'], false, admin_id),
    
    ('Python Messaging Patterns', 'python-messaging', 'Message queue patterns for Python', 'messaging-queues', 'python', 'python', null, 
     ARRAY['messaging', 'python', 'rabbitmq', 'kafka'], false, admin_id);

    -- Update download and star counts with random values
    UPDATE templates.templates 
    SET 
        download_count = floor(random() * 1000 + 100)::int,
        star_count = floor(random() * 500 + 50)::int
    WHERE created_by = admin_id;

    -- Create sample projects for demo user
    INSERT INTO projects (name, slug, description, template_id, user_id, status) 
    SELECT 
        'My ' || t.name,
        'my-' || t.slug || '-' || floor(random() * 1000)::text,
        'Project based on ' || t.name,
        t.id,
        demo_id,
        CASE WHEN random() > 0.8 THEN 'archived' ELSE 'active' END
    FROM templates.templates t
    WHERE t.slug IN ('rest-api', 'webapp-nextjs', 'fastapi', 'gin')
    LIMIT 4;

    -- Add some activity logs
    INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
    SELECT 
        demo_id,
        CASE 
            WHEN random() < 0.3 THEN 'template.downloaded'
            WHEN random() < 0.6 THEN 'project.created'
            ELSE 'project.updated'
        END,
        'template',
        t.id,
        jsonb_build_object('template_name', t.name, 'timestamp', CURRENT_TIMESTAMP)
    FROM templates.templates t
    LIMIT 10;

END $$;