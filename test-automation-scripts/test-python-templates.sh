#!/bin/bash

# Test all Python templates

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
PYTHON_LOG_DIR="${LOG_DIR}/python"

# Create log directories
mkdir -p "${PYTHON_LOG_DIR}"

# Track overall results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
declare -A TEMPLATE_RESULTS

# Function to log both to console and file
log_message() {
    local message="$1"
    echo -e "$message" | tee -a "${PYTHON_LOG_DIR}/python-tests.log"
}

# Enhanced test function with proper error handling and logging
test_python_template() {
    local template_name=$1
    local template_path="${PROJECT_ROOT}/$2"
    local template_log_dir="${PYTHON_LOG_DIR}/${template_name}"
    local result_file="${template_log_dir}/test-results.json"
    
    # Create template-specific log directory
    mkdir -p "${template_log_dir}"
    
    log_message "\n${YELLOW}Testing $template_name...${NC}"
    ((TOTAL_TESTS++))
    
    # Initialize result tracking
    local tests_passed=true
    local errors=()
    local warnings=()
    local coverage=0
    
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
    
    # Fix PYTHONPATH for the template
    export PYTHONPATH="${template_path}:${PYTHONPATH}"
    log_message "PYTHONPATH set to: $PYTHONPATH"
    
    # Create virtual environment
    log_message "Creating virtual environment..."
    if python3 -m venv venv > "${template_log_dir}/venv-creation.log" 2>&1; then
        log_message "${GREEN}✓ Virtual environment created${NC}"
    else
        log_message "${RED}✗ Failed to create virtual environment${NC}"
        errors+=("venv creation failed")
        tests_passed=false
        return 1
    fi
    
    source venv/bin/activate
    
    # Install dependencies
    log_message "Installing dependencies..."
    if pip install -r requirements.txt > "${template_log_dir}/pip-install.log" 2>&1; then
        log_message "${GREEN}✓ Dependencies installed${NC}"
    else
        log_message "${RED}✗ Failed to install dependencies${NC}"
        errors+=("pip install failed")
        tests_passed=false
    fi
    
    # Install test dependencies if they exist
    if [ -f "requirements-test.txt" ]; then
        log_message "Installing test dependencies..."
        pip install -r requirements-test.txt >> "${template_log_dir}/pip-install.log" 2>&1
    elif [ -f "requirements-dev.txt" ]; then
        log_message "Installing dev dependencies..."
        pip install -r requirements-dev.txt >> "${template_log_dir}/pip-install.log" 2>&1
    else
        # Install common test tools if not in requirements
        pip install pytest pytest-cov flake8 mypy black bandit safety >> "${template_log_dir}/pip-install.log" 2>&1
    fi
    
    # Run tests with coverage
    if command -v pytest >/dev/null 2>&1; then
        log_message "Running tests..."
        if pytest -v --cov=. --cov-report=term --cov-report=json > "${template_log_dir}/pytest-output.log" 2>&1; then
            log_message "${GREEN}✓ Tests passed${NC}"
            
            # Extract coverage percentage
            if [ -f "coverage.json" ]; then
                cp coverage.json "${template_log_dir}/coverage.json"
                coverage=$(python -c "import json; data = json.load(open('coverage.json')); print(data.get('totals', {}).get('percent_covered', 0))" 2>/dev/null || echo "0")
                log_message "  Code coverage: ${coverage}%"
            fi
        else
            log_message "${RED}✗ Tests failed${NC}"
            errors+=("pytest failed")
            tests_passed=false
            
            # Show last few lines of test output
            tail -n 20 "${template_log_dir}/pytest-output.log"
        fi
    else
        log_message "${YELLOW}⚠ pytest not installed${NC}"
        warnings+=("pytest not available")
    fi
    
    # Type checking
    if command -v mypy >/dev/null 2>&1; then
        log_message "Running type check..."
        if mypy . > "${template_log_dir}/mypy-output.log" 2>&1; then
            log_message "${GREEN}✓ Type check passed${NC}"
        else
            log_message "${RED}✗ Type check failed${NC}"
            errors+=("mypy failed")
            tests_passed=false
            
            # Count mypy errors
            local mypy_errors=$(grep -c "error:" "${template_log_dir}/mypy-output.log" 2>/dev/null || echo "0")
            log_message "  MyPy errors: ${mypy_errors}"
        fi
    fi
    
    # Linting with flake8
    if command -v flake8 >/dev/null 2>&1; then
        log_message "Running flake8..."
        # Configure flake8 for common Python patterns
        if flake8 . --max-line-length=88 --extend-ignore=E203,W503 > "${template_log_dir}/flake8-output.log" 2>&1; then
            log_message "${GREEN}✓ Linting passed${NC}"
        else
            log_message "${RED}✗ Linting failed${NC}"
            errors+=("flake8 failed")
            tests_passed=false
            
            # Count flake8 errors
            local flake8_errors=$(wc -l < "${template_log_dir}/flake8-output.log" 2>/dev/null || echo "0")
            log_message "  Flake8 issues: ${flake8_errors}"
        fi
    fi
    
    # Code formatting check with black
    if command -v black >/dev/null 2>&1; then
        log_message "Checking code formatting..."
        if black --check . > "${template_log_dir}/black-output.log" 2>&1; then
            log_message "${GREEN}✓ Code formatting correct${NC}"
        else
            log_message "${YELLOW}⚠ Code formatting issues${NC}"
            warnings+=("Code formatting issues")
            # Don't fail on formatting issues, just warn
        fi
    fi
    
    # Security scan with bandit
    if command -v bandit >/dev/null 2>&1; then
        log_message "Running security scan..."
        if bandit -r . -f json -o "${template_log_dir}/bandit-report.json" > "${template_log_dir}/bandit-output.log" 2>&1; then
            # Parse bandit results
            local security_issues=$(python -c "import json; data = json.load(open('${template_log_dir}/bandit-report.json')); print(len(data.get('results', [])))" 2>/dev/null || echo "0")
            if [ "$security_issues" -gt 0 ]; then
                log_message "${YELLOW}⚠ Security issues found: ${security_issues}${NC}"
                warnings+=("${security_issues} security issues found")
            else
                log_message "${GREEN}✓ No security issues found${NC}"
            fi
        else
            log_message "${YELLOW}⚠ Security scan failed${NC}"
            warnings+=("Bandit scan failed")
        fi
    fi
    
    # Dependency security check with safety
    if command -v safety >/dev/null 2>&1; then
        log_message "Checking dependency security..."
        if safety check --json > "${template_log_dir}/safety-report.json" 2>&1; then
            log_message "${GREEN}✓ No known vulnerabilities in dependencies${NC}"
        else
            log_message "${YELLOW}⚠ Dependency vulnerabilities found${NC}"
            warnings+=("Dependency vulnerabilities found")
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
    
    deactivate
    cd - > /dev/null
}

# Main execution
log_message "${BLUE}=== Python Template Testing ===${NC}"
log_message "Test started at: $(date)"

# Test each Python template
test_python_template "fastapi" "templates/python/fastapi"
test_python_template "flask" "templates/python/flask"
test_python_template "celery" "templates/python/celery"

# Generate summary report
SUMMARY_FILE="${PYTHON_LOG_DIR}/summary.json"
cat > "$SUMMARY_FILE" << EOF
{
  "test_suite": "Python Templates",
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
log_message "\n${BLUE}=== Python Test Summary ===${NC}"
log_message "Total templates tested: $TOTAL_TESTS"
log_message "Passed: ${GREEN}$PASSED_TESTS${NC}"
log_message "Failed: ${RED}$FAILED_TESTS${NC}"

# Exit with appropriate code
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
else
    exit 0
fi