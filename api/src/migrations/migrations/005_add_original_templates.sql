-- Migration: Add original application templates
-- Description: Adds the original REST API, gRPC, web app, and other application templates

INSERT INTO devx.templates (slug, name, description, category, technology, framework, language, features, tags, config, readme_template, is_featured, is_popular, rating, downloads) VALUES

-- Node.js Templates
('rest-api-express', 'Express REST API', 'Production-ready REST API with Express.js', 'backend', 'Node.js', 'Express', 'JavaScript',
 ARRAY['JWT Authentication', 'Rate Limiting', 'OpenAPI Documentation', 'Database Integration', 'Error Handling', 'Logging', 'Testing'],
 ARRAY['nodejs', 'express', 'rest', 'api', 'backend'],
 '{"resources": {"cpu": 0.5, "memory": 1}, "node_version": "18"}',
 '# Express REST API

Production-ready REST API built with Express.js.

## Features
- JWT authentication
- PostgreSQL database integration
- Swagger/OpenAPI documentation
- Comprehensive test suite
- Docker support

## Quick Start
```bash
npm install
npm run dev
```',
 true, true, 4.8, 12543),

('graphql-apollo', 'GraphQL API with Apollo', 'Modern GraphQL API with Apollo Server', 'backend', 'Node.js', 'Apollo', 'TypeScript',
 ARRAY['Type-Safe Resolvers', 'Subscriptions', 'DataLoader', 'Authentication', 'File Uploads', 'Caching', 'Federation Support'],
 ARRAY['nodejs', 'graphql', 'apollo', 'typescript', 'api'],
 '{"resources": {"cpu": 1, "memory": 2}, "node_version": "18"}',
 '# GraphQL API with Apollo Server

Type-safe GraphQL API with subscriptions and federation support.',
 true, true, 4.9, 9876),

-- Python Templates
('fastapi-service', 'FastAPI Microservice', 'High-performance Python API with FastAPI', 'backend', 'Python', 'FastAPI', 'Python',
 ARRAY['Async/Await', 'Auto Documentation', 'Type Hints', 'OAuth2', 'WebSockets', 'Background Tasks', 'Testing'],
 ARRAY['python', 'fastapi', 'async', 'api', 'microservice'],
 '{"resources": {"cpu": 0.5, "memory": 1}, "python_version": "3.11"}',
 '# FastAPI Microservice

High-performance async API with automatic documentation.',
 true, true, 4.9, 15234),

('django-rest-api', 'Django REST Framework API', 'Full-featured REST API with Django', 'backend', 'Python', 'Django', 'Python',
 ARRAY['Admin Interface', 'ORM', 'Authentication', 'Permissions', 'Filtering', 'Pagination', 'Versioning'],
 ARRAY['python', 'django', 'rest', 'api', 'orm'],
 '{"resources": {"cpu": 1, "memory": 2}, "python_version": "3.11"}',
 '# Django REST Framework API

Enterprise-ready REST API with Django.',
 false, true, 4.7, 11234),

-- Go Templates
('gin-rest-api', 'Gin REST API', 'Lightning-fast REST API with Gin framework', 'backend', 'Go', 'Gin', 'Go',
 ARRAY['Middleware Support', 'JSON Validation', 'JWT Auth', 'Swagger Docs', 'Hot Reload', 'Graceful Shutdown', 'Metrics'],
 ARRAY['go', 'gin', 'rest', 'api', 'performance'],
 '{"resources": {"cpu": 0.25, "memory": 0.5}, "go_version": "1.21"}',
 '# Gin REST API

High-performance REST API built with Gin.',
 true, true, 4.8, 8765),

('grpc-service-go', 'gRPC Service (Go)', 'High-performance gRPC service in Go', 'backend', 'Go', 'gRPC', 'Go',
 ARRAY['Protocol Buffers', 'Streaming', 'Interceptors', 'Health Checks', 'Reflection', 'Load Balancing', 'TLS'],
 ARRAY['go', 'grpc', 'protobuf', 'microservice'],
 '{"resources": {"cpu": 0.5, "memory": 1}, "go_version": "1.21"}',
 '# gRPC Service in Go

Efficient RPC service with Protocol Buffers.',
 true, false, 4.7, 6543),

-- Frontend Templates
('nextjs-webapp', 'Next.js Web Application', 'Full-stack web app with Next.js 14', 'frontend', 'Next.js', 'React', 'TypeScript',
 ARRAY['App Router', 'Server Components', 'API Routes', 'Authentication', 'Tailwind CSS', 'TypeScript', 'SEO Optimized'],
 ARRAY['nextjs', 'react', 'typescript', 'fullstack', 'ssr'],
 '{"resources": {"cpu": 0.5, "memory": 1}, "node_version": "18"}',
 '# Next.js Web Application

Modern full-stack application with Next.js 14.',
 true, true, 4.9, 19876),

('react-spa', 'React Single Page App', 'Modern React SPA with Redux Toolkit', 'frontend', 'React', 'Redux', 'TypeScript',
 ARRAY['Redux Toolkit', 'React Router', 'Material UI', 'Form Validation', 'API Integration', 'Testing', 'PWA Support'],
 ARRAY['react', 'spa', 'redux', 'typescript', 'frontend'],
 '{"resources": {"cpu": 0.25, "memory": 0.5}, "node_version": "18"}',
 '# React Single Page Application

Modern React app with state management.',
 false, true, 4.7, 13456),

('vue-app', 'Vue.js Application', 'Progressive Vue.js application', 'frontend', 'Vue.js', 'Vuex', 'JavaScript',
 ARRAY['Vue 3', 'Composition API', 'Vuex Store', 'Vue Router', 'Vuetify', 'i18n', 'Testing'],
 ARRAY['vue', 'frontend', 'spa', 'javascript'],
 '{"resources": {"cpu": 0.25, "memory": 0.5}, "node_version": "18"}',
 '# Vue.js Application

Modern Vue.js app with Composition API.',
 false, true, 4.6, 9876),

-- Full Stack Templates
('mern-stack', 'MERN Stack Application', 'MongoDB, Express, React, Node.js full stack', 'fullstack', 'MERN', 'Express/React', 'JavaScript',
 ARRAY['MongoDB Atlas', 'Express API', 'React Frontend', 'JWT Auth', 'File Upload', 'Real-time Updates', 'Deployment Ready'],
 ARRAY['mern', 'mongodb', 'express', 'react', 'nodejs', 'fullstack'],
 '{"resources": {"cpu": 1, "memory": 2}, "components": ["api", "frontend", "database"]}',
 '# MERN Stack Application

Full-stack JavaScript application.',
 true, true, 4.8, 14567),

-- Worker/Background Job Templates
('worker-service-bull', 'Worker Service with BullMQ', 'Background job processing with BullMQ', 'backend', 'Node.js', 'BullMQ', 'TypeScript',
 ARRAY['Job Queues', 'Cron Jobs', 'Rate Limiting', 'Retries', 'Job UI', 'Metrics', 'Error Handling'],
 ARRAY['nodejs', 'worker', 'bullmq', 'jobs', 'queue'],
 '{"resources": {"cpu": 1, "memory": 2}, "node_version": "18"}',
 '# Worker Service

Scalable background job processing.',
 true, false, 4.7, 7654),

('celery-worker', 'Celery Worker Service', 'Python background tasks with Celery', 'backend', 'Python', 'Celery', 'Python',
 ARRAY['Task Queues', 'Scheduled Tasks', 'Task Routing', 'Monitoring', 'Result Backend', 'Error Handling', 'Flower UI'],
 ARRAY['python', 'celery', 'worker', 'redis', 'rabbitmq'],
 '{"resources": {"cpu": 1, "memory": 2}, "python_version": "3.11"}',
 '# Celery Worker Service

Distributed task processing with Celery.',
 false, true, 4.6, 6789),

-- Database Templates
('postgres-cluster', 'PostgreSQL Cluster', 'High-availability PostgreSQL setup', 'database', 'PostgreSQL', 'Patroni', 'SQL',
 ARRAY['Master-Slave Replication', 'Automatic Failover', 'Backup Strategy', 'Monitoring', 'Connection Pooling', 'SSL/TLS'],
 ARRAY['postgresql', 'database', 'ha', 'cluster'],
 '{"resources": {"cpu": 2, "memory": 4, "storage": 100}, "version": "15"}',
 '# PostgreSQL HA Cluster

Production-ready PostgreSQL with automatic failover.',
 true, false, 4.8, 5432),

-- Messaging Templates
('kafka-producer-consumer', 'Kafka Producer/Consumer', 'Event streaming with Apache Kafka', 'messaging', 'Kafka', 'Node.js', 'TypeScript',
 ARRAY['Producer API', 'Consumer Groups', 'Avro Schemas', 'Error Handling', 'Metrics', 'Health Checks', 'Exactly Once'],
 ARRAY['kafka', 'streaming', 'events', 'nodejs'],
 '{"resources": {"cpu": 0.5, "memory": 1}, "kafka_version": "3.5"}',
 '# Kafka Producer/Consumer

Event-driven architecture with Kafka.',
 false, true, 4.7, 4567),

-- Machine Learning Templates
('ml-api-service', 'Machine Learning API', 'ML model serving with FastAPI', 'ml', 'Python', 'FastAPI', 'Python',
 ARRAY['Model Serving', 'Batch Predictions', 'A/B Testing', 'Model Versioning', 'Monitoring', 'GPU Support', 'Caching'],
 ARRAY['ml', 'ai', 'python', 'fastapi', 'tensorflow'],
 '{"resources": {"cpu": 2, "memory": 4, "gpu": true}, "python_version": "3.11"}',
 '# Machine Learning API Service

Serve ML models at scale.',
 true, false, 4.8, 3456);

-- Update template counts
UPDATE devx.template_stats 
SET 
  total_count = (SELECT COUNT(*) FROM devx.templates),
  featured_count = (SELECT COUNT(*) FROM devx.templates WHERE is_featured = true),
  popular_count = (SELECT COUNT(*) FROM devx.templates WHERE is_popular = true),
  last_updated = CURRENT_TIMESTAMP;