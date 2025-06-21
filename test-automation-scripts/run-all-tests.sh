#!/bin/bash

# DevX Platform - Master Test Runner
# This script runs all template tests and generates reports

# Remove 'set -e' to allow tests to continue on failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Setup paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/test-results"

# Ensure test results directory exists
mkdir -p "${LOG_DIR}"/{nodejs,python,go,java,rust,infrastructure,security,performance,coverage}

# Export LOG_DIR for child scripts
export LOG_DIR
export PROJECT_ROOT

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0
declare -A TEST_RESULTS

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to log both to console and file
log_message() {
    local message="$1"
    local log_file="${LOG_DIR}/master-test.log"
    echo -e "$message" | tee -a "$log_file"
}

# Run tests with proper error handling and logging
run_template_tests() {
    local template_type=$1
    local log_file="${LOG_DIR}/${template_type}/test-summary.log"
    
    log_message "\n${YELLOW}Testing ${template_type} templates...${NC}"
    
    # Ensure the script is executable
    chmod +x "${SCRIPT_DIR}/test-${template_type}-templates.sh"
    
    # Run the test script and capture output
    if "${SCRIPT_DIR}/test-${template_type}-templates.sh" > "${log_file}" 2>&1; then
        log_message "${GREEN}✅ ${template_type} tests passed${NC}"
        TEST_RESULTS[${template_type}]="PASSED"
        ((TESTS_PASSED++))
        return 0
    else
        log_message "${RED}❌ ${template_type} tests failed (see ${log_file})${NC}"
        TEST_RESULTS[${template_type}]="FAILED"
        ((TESTS_FAILED++))
        # Display last few lines of error log
        echo -e "${RED}Last 10 lines of error log:${NC}"
        tail -n 10 "${log_file}"
        return 1
    fi
}

# Initialize test start time
TEST_START_TIME=$(date +%s)

log_message "\n${YELLOW}=== DevX Platform Template Testing ===${NC}\n"
log_message "Test started at: $(date)"
log_message "Test results will be saved to: ${LOG_DIR}"

# Check prerequisites and save results
echo -e "\n${YELLOW}Checking prerequisites...${NC}"
PREREQ_LOG="${LOG_DIR}/prerequisites.log"
echo "Prerequisites Check - $(date)" > "$PREREQ_LOG"

check_and_log_prereq() {
    local cmd=$1
    local name=$2
    if command_exists "$cmd"; then
        print_status 0 "$name installed"
        echo "✓ $name installed ($(which $cmd))" >> "$PREREQ_LOG"
        return 0
    else
        print_status 1 "$name not installed"
        echo "✗ $name not installed" >> "$PREREQ_LOG"
        return 1
    fi
}

check_and_log_prereq node "Node.js"
check_and_log_prereq python3 "Python 3"
check_and_log_prereq go "Go"
check_and_log_prereq java "Java"
check_and_log_prereq mvn "Maven"
check_and_log_prereq cargo "Rust/Cargo"
check_and_log_prereq docker "Docker"
check_and_log_prereq kubectl "kubectl"
check_and_log_prereq terraform "Terraform"
check_and_log_prereq helm "Helm"

log_message "\n${YELLOW}Starting template tests...${NC}\n"

# Run Node.js tests
if command_exists node; then
    run_template_tests "nodejs" || true
else
    log_message "${YELLOW}Skipping Node.js tests (Node.js not installed)${NC}"
fi

# Run Python tests
if command_exists python3; then
    run_template_tests "python" || true
else
    log_message "${YELLOW}Skipping Python tests (Python 3 not installed)${NC}"
fi

# Run Go tests
if command_exists go; then
    run_template_tests "go" || true
else
    log_message "${YELLOW}Skipping Go tests (Go not installed)${NC}"
fi

# Run Java tests
if command_exists java && command_exists mvn; then
    run_template_tests "java" || true
else
    log_message "${YELLOW}Skipping Java tests (Java or Maven not installed)${NC}"
fi

# Run Rust tests (NEW)
if command_exists cargo; then
    if [ -f "${SCRIPT_DIR}/test-rust-templates.sh" ]; then
        run_template_tests "rust" || true
    else
        log_message "${YELLOW}Rust test script not found, creating placeholder...${NC}"
        TEST_RESULTS[rust]="SKIPPED"
    fi
else
    log_message "${YELLOW}Skipping Rust tests (Cargo not installed)${NC}"
fi

# Run infrastructure tests
log_message "\n${YELLOW}Testing infrastructure components...${NC}"
if [ -f "${SCRIPT_DIR}/test-infrastructure.sh" ]; then
    chmod +x "${SCRIPT_DIR}/test-infrastructure.sh"
    if "${SCRIPT_DIR}/test-infrastructure.sh" > "${LOG_DIR}/infrastructure/test-summary.log" 2>&1; then
        log_message "${GREEN}✅ Infrastructure tests passed${NC}"
        TEST_RESULTS[infrastructure]="PASSED"
        ((TESTS_PASSED++))
    else
        log_message "${RED}❌ Infrastructure tests failed${NC}"
        TEST_RESULTS[infrastructure]="FAILED"
        ((TESTS_FAILED++))
    fi
fi

# Run security tests
log_message "\n${YELLOW}Running security scans...${NC}"
if [ -f "${SCRIPT_DIR}/test-security.sh" ]; then
    chmod +x "${SCRIPT_DIR}/test-security.sh"
    if "${SCRIPT_DIR}/test-security.sh" > "${LOG_DIR}/security/test-summary.log" 2>&1; then
        log_message "${GREEN}✅ Security tests passed${NC}"
        TEST_RESULTS[security]="PASSED"
        ((TESTS_PASSED++))
    else
        log_message "${RED}❌ Security tests failed${NC}"
        TEST_RESULTS[security]="FAILED"
        ((TESTS_FAILED++))
    fi
fi

# Calculate test duration
TEST_END_TIME=$(date +%s)
TEST_DURATION=$((TEST_END_TIME - TEST_START_TIME))
TEST_DURATION_MIN=$((TEST_DURATION / 60))
TEST_DURATION_SEC=$((TEST_DURATION % 60))

# Generate comprehensive summary report
log_message "\n${YELLOW}Generating test summary...${NC}"

# Create summary file
SUMMARY_FILE="${LOG_DIR}/test-summary-$(date +%Y%m%d-%H%M%S).json"
cat > "$SUMMARY_FILE" << EOF
{
  "test_run": {
    "start_time": "$(date -r $TEST_START_TIME)",
    "end_time": "$(date -r $TEST_END_TIME)",
    "duration": "${TEST_DURATION_MIN}m ${TEST_DURATION_SEC}s",
    "total_tests": $((TESTS_PASSED + TESTS_FAILED)),
    "passed": $TESTS_PASSED,
    "failed": $TESTS_FAILED,
    "results": {
EOF

# Add individual test results
first=true
for test_type in "${!TEST_RESULTS[@]}"; do
    if [ "$first" = true ]; then
        first=false
    else
        echo "," >> "$SUMMARY_FILE"
    fi
    echo -n "      \"$test_type\": \"${TEST_RESULTS[$test_type]}\"" >> "$SUMMARY_FILE"
done

cat >> "$SUMMARY_FILE" << EOF

    }
  }
}
EOF

# Generate HTML report
if [ -f "${SCRIPT_DIR}/generate-summary.sh" ]; then
    chmod +x "${SCRIPT_DIR}/generate-summary.sh"
    "${SCRIPT_DIR}/generate-summary.sh"
fi

# Print final summary
log_message "\n${YELLOW}=== Test Summary ===${NC}"
log_message "Test Duration: ${TEST_DURATION_MIN}m ${TEST_DURATION_SEC}s"
log_message "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
log_message "Tests Failed: ${RED}${TESTS_FAILED}${NC}"

# Display results table
log_message "\n${BLUE}Test Results by Category:${NC}"
for test_type in nodejs python go java rust infrastructure security; do
    if [ -n "${TEST_RESULTS[$test_type]}" ]; then
        if [ "${TEST_RESULTS[$test_type]}" = "PASSED" ]; then
            log_message "  ${test_type}: ${GREEN}PASSED${NC}"
        elif [ "${TEST_RESULTS[$test_type]}" = "FAILED" ]; then
            log_message "  ${test_type}: ${RED}FAILED${NC}"
        else
            log_message "  ${test_type}: ${YELLOW}${TEST_RESULTS[$test_type]}${NC}"
        fi
    fi
done

log_message "\nDetailed results saved to: ${SUMMARY_FILE}"

if [ $TESTS_FAILED -gt 0 ]; then
    log_message "\n${RED}Some tests failed! Check test-results/ for detailed reports.${NC}\n"
    exit 1
else
    log_message "\n${GREEN}All tests passed! Check test-results/ for detailed reports.${NC}\n"
    exit 0
fi