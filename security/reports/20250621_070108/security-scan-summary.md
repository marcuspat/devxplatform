# Enhanced Security Scan Report
Generated: Sat Jun 21 07:01:08 CST 2025
Platform: DevX Platform
Scan Type: Comprehensive Security Analysis

## Summary
This report contains the results of comprehensive security scanning across the DevX Platform,
including all supported languages: Node.js, Python, Go, Java, and Rust.

## Dockerfile Security Analysis

- ⚠ **templates/go/gin/Dockerfile**:        4 issues found ([details](hadolint_templates_go_gin_Dockerfile.txt))
- ⚠ **templates/python/flask/Dockerfile**:        4 issues found ([details](hadolint_templates_python_flask_Dockerfile.txt))
- ⚠ **templates/python/fastapi/Dockerfile**:        4 issues found ([details](hadolint_templates_python_fastapi_Dockerfile.txt))
- ⚠ **templates/python/celery/Dockerfile**:        4 issues found ([details](hadolint_templates_python_celery_Dockerfile.txt))
- ⚠ **templates/worker-service/Dockerfile**:        1 issues found ([details](hadolint_templates_worker-service_Dockerfile.txt))
- ⚠ **templates/java/springboot/Dockerfile**:        1 issues found ([details](hadolint_templates_java_springboot_Dockerfile.txt))
- ⚠ **templates/graphql-api/Dockerfile**:        1 issues found ([details](hadolint_templates_graphql-api_Dockerfile.txt))
- ⚠ **templates/webapp-nextjs/Dockerfile**:        4 issues found ([details](hadolint_templates_webapp-nextjs_Dockerfile.txt))
- ⚠ **templates/grpc-service/Dockerfile**:        1 issues found ([details](hadolint_templates_grpc-service_Dockerfile.txt))
- ⚠ **templates/rest-api/Dockerfile**:        1 issues found ([details](hadolint_templates_rest-api_Dockerfile.txt))

**Total Dockerfiles scanned:** 10
**Total issues found:** 25

## Container Vulnerability Scanning

- ✗ **node:18-alpine**: Scan failed
- ✗ **node:20-alpine**: Scan failed
- ✗ **python:3.11-slim**: Scan failed
- ✗ **python:3.12-slim**: Scan failed
- ✗ **golang:1.21-alpine**: Scan failed
- ✗ **golang:1.22-alpine**: Scan failed
- ✗ **openjdk:17-jdk-slim**: Scan failed
- ✗ **openjdk:21-jdk-slim**: Scan failed
- ✗ **rust:1.75-slim**: Scan failed
- ✗ **rust:1.77-slim**: Scan failed
- ✗ **nginx:alpine**: Scan failed
- ✗ **redis:alpine**: Scan failed
- ✗ **postgres:15-alpine**: Scan failed

**Total images scanned:** 13
**Total vulnerabilities found:** 0

## Node.js Security Analysis

- ⚠ **templates/worker-service**: Skipped (no node_modules)
- ✓ **templates/graphql-api**: No vulnerabilities found
- ✓ **templates/graphql-api** (audit-ci): No moderate+ vulnerabilities
- ⚠ **templates/webapp-nextjs/.next/types**: Skipped (no node_modules)
- ⚠ **templates/webapp-nextjs/.next**: Skipped (no node_modules)
- ⚠ **templates/webapp-nextjs**: Skipped (no node_modules)
- ✓ **templates/webapp-nextjs** (audit-ci): No moderate+ vulnerabilities
- ✓ **templates/grpc-service**: No vulnerabilities found
- ✓ **templates/grpc-service** (audit-ci): No moderate+ vulnerabilities
- ✓ **templates/rest-api**: No vulnerabilities found
- ✓ **templates/rest-api** (audit-ci): No moderate+ vulnerabilities

**Total Node.js projects scanned:** 7
**Total vulnerabilities found:** 0

## Python Security Analysis

