# Security Test Scan Report
Generated: Fri Jun 20 19:27:15 CST 2025

## Summary
This is a test security scan demonstrating scanning capabilities on 3 templates.

## Scan Results

### 1. Dockerfile Security Analysis

- ℹ **templates/rest-api/Dockerfile**: Would scan for best practices and security issues
- ℹ **templates/python/fastapi/Dockerfile**: Would scan for best practices and security issues
- ℹ **templates/go/gin/Dockerfile**: Would scan for best practices and security issues

### 2. Dependency Vulnerability Analysis

- ✓ **rest-api**: No npm vulnerabilities found
- ℹ **fastapi**: Would scan Python dependencies with safety

### 3. Static Code Security Analysis

- ℹ **fastapi**: Would scan Python code with bandit
- ℹ **gin**: Would scan Go code with gosec

## Test Scan Summary

### Available Security Tools:
- ✗ trivy (not installed)
- ✗ hadolint (not installed)
- ✗ audit-ci (not installed)
- ✗ bandit (not installed)
- ✗ safety (not installed)
- ✗ semgrep (not installed)
- ✗ gosec (not installed)

### Next Steps:
1. Install missing tools: `./security/setup-tools.sh`
2. Run full scan: `./security/scan-all.sh`
3. Review reports in: `/Users/mp/Documents/Code/claude-code/projects/devxplatform/security/reports/test_20250620_192715`
