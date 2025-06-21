#!/bin/bash

# Test all Node.js templates

# Remove 'set -e' to continue on errors

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Setup paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
LOG_DIR="${LOG_DIR:-${PROJECT_ROOT}/test-results}"
NODEJS_LOG_DIR="${LOG_DIR}/nodejs"

# Create log directories
mkdir -p "${NODEJS_LOG_DIR}"

# Track overall results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
declare -A TEMPLATE_RESULTS

# Function to log both to console and file
log_message() {
    local message="$1"
    echo -e "$message" | tee -a "${NODEJS_LOG_DIR}/nodejs-tests.log"
}

# Enhanced test function with proper error handling and logging
test_nodejs_template() {
    local template_name=$1
    local template_path="${PROJECT_ROOT}/$2"
    local template_log_dir="${NODEJS_LOG_DIR}/${template_name}"
    local result_file="${template_log_dir}/test-results.json"
    
    # Create template-specific log directory
    mkdir -p "${template_log_dir}"
    
    log_message "\n${YELLOW}Testing $template_name...${NC}"
    ((TOTAL_TESTS++))
    
    # Initialize result tracking
    local tests_passed=true
    local errors=()
    local warnings=()
    
    # Check if template directory exists
    if [ ! -d "$template_path" ]; then
        log_message "${RED}Error: Template directory not found: $template_path${NC}"
        TEMPLATE_RESULTS[$template_name]="NOT_FOUND"
        ((FAILED_TESTS++))
        return 1
    fi
    
    # Change to template directory
    cd "$template_path" || {
        log_message "${RED}Error: Cannot access directory: $template_path${NC}"
        TEMPLATE_RESULTS[$template_name]="ACCESS_ERROR"
        ((FAILED_TESTS++))
        return 1
    }
    
    # Install dependencies
    log_message "Installing dependencies..."
    if npm install > "${template_log_dir}/npm-install.log" 2>&1; then
        log_message "${GREEN}✓ Dependencies installed${NC}"
    else
        log_message "${RED}✗ Failed to install dependencies${NC}"
        errors+=("npm install failed")
        tests_passed=false
    fi
    
    # Run tests with coverage
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        log_message "Running tests..."
        if npm test -- --coverage --coverageReporters=json --coverageReporters=text > "${template_log_dir}/test-output.log" 2>&1; then
            log_message "${GREEN}✓ Tests passed${NC}"
            
            # Extract coverage data if available
            if [ -f "coverage/coverage-summary.json" ]; then
                cp coverage/coverage-summary.json "${template_log_dir}/coverage-summary.json"
                
                # Extract coverage percentage
                local coverage=$(node -e "
                    const cov = require('./coverage/coverage-summary.json');
                    console.log(cov.total.lines.pct);
                " 2>/dev/null || echo "0")
                
                log_message "  Code coverage: ${coverage}%"
            fi
        else
            log_message "${RED}✗ Tests failed${NC}"
            errors+=("npm test failed")
            tests_passed=false
            
            # Show last few lines of test output
            tail -n 20 "${template_log_dir}/test-output.log"
        fi
    else
        log_message "${YELLOW}⚠ No test script found${NC}"
        warnings+=("No test script in package.json")
    fi
    
    # Run lint
    if [ -f "package.json" ] && grep -q '"lint"' package.json; then
        log_message "Running lint..."
        if npm run lint > "${template_log_dir}/lint-output.log" 2>&1; then
            log_message "${GREEN}✓ Linting passed${NC}"
        else
            log_message "${RED}✗ Linting failed${NC}"
            errors+=("npm run lint failed")
            tests_passed=false
            
            # Count ESLint errors/warnings
            local eslint_errors=$(grep -c "error" "${template_log_dir}/lint-output.log" 2>/dev/null || echo "0")
            local eslint_warnings=$(grep -c "warning" "${template_log_dir}/lint-output.log" 2>/dev/null || echo "0")
            log_message "  ESLint: ${eslint_errors} errors, ${eslint_warnings} warnings"
        fi
    fi
    
    # Run type check
    if [ -f "package.json" ] && grep -q '"typecheck"' package.json; then
        log_message "Running type check..."
        if npm run typecheck > "${template_log_dir}/typecheck-output.log" 2>&1; then
            log_message "${GREEN}✓ Type check passed${NC}"
        else
            log_message "${RED}✗ Type check failed${NC}"
            errors+=("npm run typecheck failed")
            tests_passed=false
        fi
    elif [ -f "tsconfig.json" ]; then
        # Try running tsc directly if tsconfig exists but no typecheck script
        log_message "Running TypeScript compiler check..."
        if npx tsc --noEmit > "${template_log_dir}/tsc-output.log" 2>&1; then
            log_message "${GREEN}✓ TypeScript compilation passed${NC}"
        else
            log_message "${RED}✗ TypeScript compilation failed${NC}"
            errors+=("TypeScript compilation failed")
            tests_passed=false
        fi
    fi
    
    # Build
    if [ -f "package.json" ] && grep -q '"build"' package.json; then
        log_message "Building..."
        if npm run build > "${template_log_dir}/build-output.log" 2>&1; then
            log_message "${GREEN}✓ Build successful${NC}"
        else
            log_message "${RED}✗ Build failed${NC}"
            errors+=("npm run build failed")
            tests_passed=false
        fi
    fi
    
    # Security audit
    log_message "Running security audit..."
    npm audit --production --json > "${template_log_dir}/npm-audit.json" 2>&1 || true
    
    # Parse audit results
    local vulnerabilities=$(node -e "
        try {
            const audit = require('${template_log_dir}/npm-audit.json');
            const meta = audit.metadata || {};
            const vulns = meta.vulnerabilities || {};
            console.log(JSON.stringify({
                critical: vulns.critical || 0,
                high: vulns.high || 0,
                moderate: vulns.moderate || 0,
                low: vulns.low || 0
            }));
        } catch (e) {
            console.log('{}');
        }
    " 2>/dev/null || echo "{}")
    
    if [ "$vulnerabilities" != "{}" ]; then
        log_message "  Security vulnerabilities: $vulnerabilities"
        if echo "$vulnerabilities" | grep -E '"(critical|high)": [1-9]' > /dev/null; then
            warnings+=("High/Critical security vulnerabilities found")
        fi
    fi
    
    # Docker build if Dockerfile exists
    if [ -f "Dockerfile" ] && command -v docker >/dev/null 2>&1; then
        log_message "Building Docker image..."
        if docker build -t "${template_name}-test" . > "${template_log_dir}/docker-build.log" 2>&1; then
            log_message "${GREEN}✓ Docker build successful${NC}"
            # Clean up test image
            docker rmi "${template_name}-test" > /dev/null 2>&1 || true
        else
            log_message "${RED}✗ Docker build failed${NC}"
            errors+=("Docker build failed")
            tests_passed=false
        fi
    fi
    
    # Generate result summary
    cat > "$result_file" << EOF
{
  "template": "$template_name",
  "path": "$template_path",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "passed": $tests_passed,
  "errors": $(printf '%s\n' "${errors[@]}" | jq -R . | jq -s . 2>/dev/null || echo "[]"),
  "warnings": $(printf '%s\n' "${warnings[@]}" | jq -R . | jq -s . 2>/dev/null || echo "[]"),
  "coverage": ${coverage:-0}
}
EOF
    
    # Update overall results
    if [ "$tests_passed" = true ] && [ ${#errors[@]} -eq 0 ]; then
        TEMPLATE_RESULTS[$template_name]="PASSED"
        ((PASSED_TESTS++))
        log_message "${GREEN}✅ $template_name: All tests passed${NC}"
    else
        TEMPLATE_RESULTS[$template_name]="FAILED"
        ((FAILED_TESTS++))
        log_message "${RED}❌ $template_name: Tests failed (${#errors[@]} errors, ${#warnings[@]} warnings)${NC}"
    fi
    
    cd - > /dev/null
}

# Main execution
log_message "${BLUE}=== Node.js Template Testing ===${NC}"
log_message "Test started at: $(date)"

# Test each Node.js template
test_nodejs_template "rest-api" "templates/rest-api"
test_nodejs_template "graphql-api" "templates/graphql-api"
test_nodejs_template "grpc-service" "templates/grpc-service"
test_nodejs_template "webapp-nextjs" "templates/webapp-nextjs"
test_nodejs_template "worker-service" "templates/worker-service"

# Generate summary report
SUMMARY_FILE="${NODEJS_LOG_DIR}/summary.json"
cat > "$SUMMARY_FILE" << EOF
{
  "test_suite": "Node.js Templates",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "total_templates": $TOTAL_TESTS,
  "passed": $PASSED_TESTS,
  "failed": $FAILED_TESTS,
  "results": {
EOF

# Add individual results
first=true
for template in "${!TEMPLATE_RESULTS[@]}"; do
    if [ "$first" = true ]; then
        first=false
    else
        echo "," >> "$SUMMARY_FILE"
    fi
    echo -n "    \"$template\": \"${TEMPLATE_RESULTS[$template]}\"" >> "$SUMMARY_FILE"
done

cat >> "$SUMMARY_FILE" << EOF

  }
}
EOF

# Print summary
log_message "\n${BLUE}=== Node.js Test Summary ===${NC}"
log_message "Total templates tested: $TOTAL_TESTS"
log_message "Passed: ${GREEN}$PASSED_TESTS${NC}"
log_message "Failed: ${RED}$FAILED_TESTS${NC}"

# Exit with appropriate code
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
else
    exit 0
fi