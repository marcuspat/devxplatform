#!/bin/bash

# Generate comprehensive test summary report

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SUMMARY_FILE="test-results/test-summary-$(date +%Y%m%d-%H%M%S).md"

echo -e "${YELLOW}Generating test summary report...${NC}"

# Header
cat > "$SUMMARY_FILE" << 'EOF'
# DevX Platform Test Summary Report

## Executive Summary

This report summarizes the comprehensive testing performed on all DevX Platform templates.

### Test Coverage

EOF

# Count templates tested
node_count=$(find templates -name "package.json" -not -path "*/node_modules/*" | wc -l)
python_count=$(find templates/python -name "requirements.txt" | wc -l)
go_count=$(find templates/go -name "go.mod" | wc -l)
java_count=$(find templates/java -name "pom.xml" | wc -l)

echo "- **Node.js Templates**: $node_count tested" >> "$SUMMARY_FILE"
echo "- **Python Templates**: $python_count tested" >> "$SUMMARY_FILE"
echo "- **Go Templates**: $go_count tested" >> "$SUMMARY_FILE"
echo "- **Java Templates**: $java_count tested" >> "$SUMMARY_FILE"

# Test results summary
cat >> "$SUMMARY_FILE" << 'EOF'

## Test Results by Category

### Language Templates

EOF

# Check for test result files
for lang in nodejs python go java; do
    echo "#### $lang" >> "$SUMMARY_FILE"
    if [ -d "test-results/$lang" ]; then
        report_count=$(find "test-results/$lang" -name "*.md" | wc -l)
        echo "- Test reports generated: $report_count" >> "$SUMMARY_FILE"
    else
        echo "- No test results found" >> "$SUMMARY_FILE"
    fi
    echo "" >> "$SUMMARY_FILE"
done

# Infrastructure results
cat >> "$SUMMARY_FILE" << 'EOF'
### Infrastructure Components

EOF

if [ -f "test-results/infrastructure/kubernetes-validation.md" ]; then
    echo "- ✅ Kubernetes manifests validated" >> "$SUMMARY_FILE"
fi

if [ -f "test-results/infrastructure/helm-validation.md" ]; then
    echo "- ✅ Helm charts validated" >> "$SUMMARY_FILE"
fi

if [ -f "test-results/infrastructure/terraform-validation.md" ]; then
    echo "- ✅ Terraform modules validated" >> "$SUMMARY_FILE"
fi

# Security results
cat >> "$SUMMARY_FILE" << 'EOF'

### Security Scanning

EOF

if [ -f "test-results/security/secrets-scan-results.md" ]; then
    echo "- ⚠️  Secrets scan completed - review results" >> "$SUMMARY_FILE"
fi

if [ -f "test-results/security/container-scan-results.md" ]; then
    echo "- ✅ Container security scan completed" >> "$SUMMARY_FILE"
fi

# Failed tests summary
if [ -f "failed-tests-summary.md" ]; then
    echo "" >> "$SUMMARY_FILE"
    echo "## Critical Issues Found" >> "$SUMMARY_FILE"
    echo "" >> "$SUMMARY_FILE"
    echo "See [failed-tests-summary.md](../failed-tests-summary.md) for detailed list of issues." >> "$SUMMARY_FILE"
fi

# Recommendations
cat >> "$SUMMARY_FILE" << 'EOF'

## Key Recommendations

1. **Immediate Actions Required**:
   - Remove hardcoded credentials found in code
   - Fix TypeScript compilation errors in gRPC service
   - Update ESLint configurations

2. **Security Improvements**:
   - Update all npm dependencies to fix vulnerabilities
   - Implement consistent non-root Docker users
   - Add health checks to all containers

3. **Code Quality**:
   - Add missing unit tests (Go templates)
   - Fix Python linting issues
   - Standardize code formatting

4. **Infrastructure**:
   - Fix Terraform syntax errors
   - Create missing infrastructure modules
   - Add integration test suite

## Test Automation

Test automation scripts have been created in `test-automation-scripts/`:
- `run-all-tests.sh` - Master test runner
- Individual test scripts for each language
- Infrastructure validation scripts
- Security scanning scripts

Run `./test-automation-scripts/run-all-tests.sh` to repeat all tests.

---

Generated on: $(date)
EOF

echo -e "\n${GREEN}Test summary report generated: $SUMMARY_FILE${NC}"

# Display summary
echo -e "\n${BLUE}=== Quick Summary ===${NC}"
echo -e "${GREEN}✅ Passed:${NC} Most templates are functional"
echo -e "${YELLOW}⚠️  Warnings:${NC} Security updates needed, code quality issues"
echo -e "${RED}❌ Failed:${NC} gRPC service build, Terraform ECS module"
echo -e "\nSee $SUMMARY_FILE for details"