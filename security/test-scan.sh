#!/bin/bash

# Test security scanning script - demonstrates security scanning on 3 templates
# This version works with whatever tools are available

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="$PROJECT_ROOT/security/reports/test_$TIMESTAMP"
SUMMARY_REPORT="$REPORT_DIR/test-security-scan-summary.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create report directory
mkdir -p "$REPORT_DIR"

# Initialize summary report
cat > "$SUMMARY_REPORT" << EOF
# Security Test Scan Report
Generated: $(date)

## Summary
This is a test security scan demonstrating scanning capabilities on 3 templates.

EOF

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "success")
            echo -e "${GREEN}✓${NC} $message"
            ;;
        "warning")
            echo -e "${YELLOW}⚠${NC} $message"
            ;;
        "error")
            echo -e "${RED}✗${NC} $message"
            ;;
        "info")
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
    esac
}

# Test templates to scan
TEST_TEMPLATES=(
    "templates/rest-api"
    "templates/python/fastapi"
    "templates/go/gin"
)

echo "=================================================="
echo "     DevX Platform Security Test Scan"
echo "=================================================="
echo ""
echo "Testing security scanning on 3 templates:"
for template in "${TEST_TEMPLATES[@]}"; do
    echo "  - $template"
done
echo ""

# Add header to report
echo "## Scan Results" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"

# Test 1: Dockerfile scanning simulation
echo "### 1. Dockerfile Security Analysis" | tee -a "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"

for template in "${TEST_TEMPLATES[@]}"; do
    dockerfile="$PROJECT_ROOT/$template/Dockerfile"
    if [ -f "$dockerfile" ]; then
        print_status "info" "Scanning Dockerfile: $template/Dockerfile"
        
        if command_exists hadolint; then
            # Run actual hadolint
            report_file="$REPORT_DIR/hadolint_$(basename $template).txt"
            if hadolint "$dockerfile" > "$report_file" 2>&1; then
                print_status "success" "No issues found in $template/Dockerfile"
                echo "- ✓ **$template/Dockerfile**: No issues found" >> "$SUMMARY_REPORT"
            else
                issue_count=$(wc -l < "$report_file")
                print_status "warning" "Found $issue_count issues in $template/Dockerfile"
                echo "- ⚠ **$template/Dockerfile**: $issue_count issues found" >> "$SUMMARY_REPORT"
                echo "  Sample issues:" >> "$SUMMARY_REPORT"
                head -3 "$report_file" | sed 's/^/    /' >> "$SUMMARY_REPORT"
            fi
        else
            # Simulate scan
            print_status "info" "Simulating Dockerfile scan for $template"
            echo "- ℹ **$template/Dockerfile**: Would scan for best practices and security issues" >> "$SUMMARY_REPORT"
        fi
    else
        print_status "warning" "No Dockerfile found in $template"
        echo "- ⚠ **$template**: No Dockerfile found" >> "$SUMMARY_REPORT"
    fi
done

echo "" | tee -a "$SUMMARY_REPORT"

# Test 2: Dependency scanning simulation
echo "### 2. Dependency Vulnerability Analysis" | tee -a "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"

# Check Node.js projects
nodejs_template="$PROJECT_ROOT/templates/rest-api"
if [ -f "$nodejs_template/package.json" ]; then
    print_status "info" "Scanning Node.js dependencies: rest-api"
    
    if command_exists npm; then
        cd "$nodejs_template"
        audit_report="$REPORT_DIR/npm_audit_rest-api.json"
        npm audit --json > "$audit_report" 2>/dev/null || true
        
        if [ -f "$audit_report" ] && command_exists jq; then
            vuln_count=$(jq '.metadata.vulnerabilities // {} | to_entries | map(.value) | add // 0' "$audit_report")
            if [ "$vuln_count" -eq 0 ]; then
                print_status "success" "No vulnerabilities in rest-api dependencies"
                echo "- ✓ **rest-api**: No npm vulnerabilities found" >> "$SUMMARY_REPORT"
            else
                print_status "warning" "Found $vuln_count vulnerabilities in rest-api"
                echo "- ⚠ **rest-api**: $vuln_count npm vulnerabilities found" >> "$SUMMARY_REPORT"
            fi
        else
            echo "- ℹ **rest-api**: Would scan npm dependencies for vulnerabilities" >> "$SUMMARY_REPORT"
        fi
        cd "$PROJECT_ROOT"
    else
        echo "- ℹ **rest-api**: Would scan npm dependencies with audit-ci" >> "$SUMMARY_REPORT"
    fi
fi

# Check Python projects
python_template="$PROJECT_ROOT/templates/python/fastapi"
if [ -f "$python_template/requirements.txt" ]; then
    print_status "info" "Scanning Python dependencies: fastapi"
    
    if command_exists safety; then
        safety_report="$REPORT_DIR/safety_fastapi.json"
        safety check --file="$python_template/requirements.txt" --json > "$safety_report" 2>/dev/null || true
        
        if [ -s "$safety_report" ]; then
            print_status "warning" "Found vulnerable dependencies in fastapi"
            echo "- ⚠ **fastapi**: Vulnerable Python dependencies detected" >> "$SUMMARY_REPORT"
        else
            print_status "success" "No vulnerable dependencies in fastapi"
            echo "- ✓ **fastapi**: No vulnerable Python dependencies" >> "$SUMMARY_REPORT"
        fi
    else
        echo "- ℹ **fastapi**: Would scan Python dependencies with safety" >> "$SUMMARY_REPORT"
    fi
fi

echo "" | tee -a "$SUMMARY_REPORT"

# Test 3: Code security analysis simulation
echo "### 3. Static Code Security Analysis" | tee -a "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"

# Python code analysis
if command_exists bandit; then
    print_status "info" "Running Bandit on Python code: fastapi"
    bandit_report="$REPORT_DIR/bandit_fastapi.json"
    bandit -r "$python_template" -f json -o "$bandit_report" 2>/dev/null || true
    
    if [ -f "$bandit_report" ] && command_exists jq; then
        issue_count=$(jq '.results | length' "$bandit_report" 2>/dev/null || echo "0")
        if [ "$issue_count" -eq "0" ]; then
            print_status "success" "No security issues in fastapi code"
            echo "- ✓ **fastapi**: No code security issues found" >> "$SUMMARY_REPORT"
        else
            print_status "warning" "Found $issue_count security issues in fastapi"
            echo "- ⚠ **fastapi**: $issue_count code security issues found" >> "$SUMMARY_REPORT"
        fi
    fi
else
    echo "- ℹ **fastapi**: Would scan Python code with bandit" >> "$SUMMARY_REPORT"
fi

# Go code analysis
if command_exists gosec; then
    print_status "info" "Running gosec on Go code: gin"
    gosec_report="$REPORT_DIR/gosec_gin.json"
    cd "$PROJECT_ROOT/templates/go/gin"
    gosec -fmt=json -out="$gosec_report" ./... 2>/dev/null || true
    cd "$PROJECT_ROOT"
    
    if [ -f "$gosec_report" ]; then
        print_status "info" "Completed Go security scan"
        echo "- ℹ **gin**: Go security scan completed" >> "$SUMMARY_REPORT"
    fi
else
    echo "- ℹ **gin**: Would scan Go code with gosec" >> "$SUMMARY_REPORT"
fi

echo "" | tee -a "$SUMMARY_REPORT"

# Generate summary
echo "## Test Scan Summary" | tee -a "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"

echo "### Available Security Tools:" >> "$SUMMARY_REPORT"
command_exists trivy && echo "- ✓ trivy" >> "$SUMMARY_REPORT" || echo "- ✗ trivy (not installed)" >> "$SUMMARY_REPORT"
command_exists hadolint && echo "- ✓ hadolint" >> "$SUMMARY_REPORT" || echo "- ✗ hadolint (not installed)" >> "$SUMMARY_REPORT"
command_exists audit-ci && echo "- ✓ audit-ci" >> "$SUMMARY_REPORT" || echo "- ✗ audit-ci (not installed)" >> "$SUMMARY_REPORT"
command_exists bandit && echo "- ✓ bandit" >> "$SUMMARY_REPORT" || echo "- ✗ bandit (not installed)" >> "$SUMMARY_REPORT"
command_exists safety && echo "- ✓ safety" >> "$SUMMARY_REPORT" || echo "- ✗ safety (not installed)" >> "$SUMMARY_REPORT"
command_exists semgrep && echo "- ✓ semgrep" >> "$SUMMARY_REPORT" || echo "- ✗ semgrep (not installed)" >> "$SUMMARY_REPORT"
command_exists gosec && echo "- ✓ gosec" >> "$SUMMARY_REPORT" || echo "- ✗ gosec (not installed)" >> "$SUMMARY_REPORT"

echo "" >> "$SUMMARY_REPORT"
echo "### Next Steps:" >> "$SUMMARY_REPORT"
echo "1. Install missing tools: \`./security/setup-tools.sh\`" >> "$SUMMARY_REPORT"
echo "2. Run full scan: \`./security/scan-all.sh\`" >> "$SUMMARY_REPORT"
echo "3. Review reports in: \`$REPORT_DIR\`" >> "$SUMMARY_REPORT"

echo ""
echo "=================================================="
echo "     Test Scan Complete!"
echo "=================================================="
echo ""
print_status "success" "Test report saved to: $SUMMARY_REPORT"
echo ""

# Display the report
echo "Report Contents:"
echo "----------------"
cat "$SUMMARY_REPORT"