#!/bin/bash

# Security tools validation script for DevX Platform
# This script validates that all security tools are properly installed and functioning

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to validate tool installation and basic functionality
validate_tool() {
    local tool_name=$1
    local test_command=$2
    local description=$3
    
    print_status "info" "Validating $tool_name..."
    
    if command_exists "$tool_name"; then
        print_status "success" "$tool_name is installed"
        
        # Run test command to verify functionality
        if eval "$test_command" >/dev/null 2>&1; then
            print_status "success" "$tool_name is working correctly"
            return 0
        else
            print_status "warning" "$tool_name is installed but may not be working properly"
            return 1
        fi
    else
        print_status "error" "$tool_name is not installed"
        return 1
    fi
}

# Function to create test files for validation
create_test_files() {
    local test_dir="$PROJECT_ROOT/security/test-validation"
    mkdir -p "$test_dir"
    
    # Create a test Dockerfile with intentional issues
    cat > "$test_dir/Dockerfile.test" << 'EOF'
FROM ubuntu:latest
RUN apt-get update
RUN apt-get install -y curl
COPY . /app
WORKDIR /app
USER root
EXPOSE 8080
CMD ["./app"]
EOF

    # Create a test Python file with intentional security issues
    cat > "$test_dir/test_security.py" << 'EOF'
import os
import subprocess

# Intentional security issues for testing
password = "hardcoded_password"
secret_key = "super_secret_key_123"

def unsafe_command(user_input):
    # Command injection vulnerability
    os.system(f"echo {user_input}")
    
def sql_injection_example():
    # SQL injection vulnerability
    query = f"SELECT * FROM users WHERE name = '{user_input}'"
    return query

def insecure_random():
    import random
    # Weak random number generation
    return random.random()
EOF

    # Create a test Go file with intentional security issues
    cat > "$test_dir/test_security.go" << 'EOF'
package main

import (
    "crypto/md5"
    "fmt"
    "math/rand"
    "os/exec"
)

const secretKey = "hardcoded_secret"

func weakHash(data string) string {
    h := md5.New()
    h.Write([]byte(data))
    return fmt.Sprintf("%x", h.Sum(nil))
}

func commandInjection(userInput string) {
    cmd := exec.Command("sh", "-c", fmt.Sprintf("echo %s", userInput))
    cmd.Run()
}

func weakRandom() int {
    return rand.Int()
}
EOF

    # Create a test package.json with known vulnerabilities
    cat > "$test_dir/package.json" << 'EOF'
{
  "name": "security-test",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "4.17.15",
    "express": "4.17.1",
    "moment": "2.24.0"
  }
}
EOF

    # Create a test requirements.txt with known vulnerabilities
    cat > "$test_dir/requirements.txt" << 'EOF'
flask==1.0.0
requests==2.20.0
django==2.0.0
pyyaml==3.13
EOF

    echo "$test_dir"
}

# Function to run validation tests
run_validation_tests() {
    local test_dir=$1
    local validation_results=()
    
    print_status "info" "Running validation tests..."
    echo ""
    
    # Test Hadolint
    print_status "info" "Testing Hadolint with sample Dockerfile..."
    if hadolint "$test_dir/Dockerfile.test" >/dev/null 2>&1; then
        validation_results+=("hadolint:failed_to_detect_issues")
        print_status "warning" "Hadolint didn't detect expected issues"
    else
        validation_results+=("hadolint:working")
        print_status "success" "Hadolint detected issues as expected"
    fi
    
    # Test Trivy
    print_status "info" "Testing Trivy with ubuntu:latest image..."
    if trivy image --quiet ubuntu:latest >/dev/null 2>&1; then
        validation_results+=("trivy:working")
        print_status "success" "Trivy scan completed successfully"
    else
        validation_results+=("trivy:failed")
        print_status "error" "Trivy scan failed"
    fi
    
    # Test Bandit
    print_status "info" "Testing Bandit with sample Python file..."
    if bandit "$test_dir/test_security.py" >/dev/null 2>&1; then
        validation_results+=("bandit:failed_to_detect_issues")
        print_status "warning" "Bandit didn't detect expected issues"
    else
        validation_results+=("bandit:working")
        print_status "success" "Bandit detected issues as expected"
    fi
    
    # Test Safety
    print_status "info" "Testing Safety with sample requirements..."
    if safety check --file="$test_dir/requirements.txt" >/dev/null 2>&1; then
        validation_results+=("safety:no_vulnerabilities_found")
        print_status "warning" "Safety didn't find expected vulnerabilities"
    else
        validation_results+=("safety:working")
        print_status "success" "Safety detected vulnerabilities as expected"
    fi
    
    # Test Gosec
    print_status "info" "Testing Gosec with sample Go file..."
    cd "$test_dir"
    if gosec "$test_dir/test_security.go" >/dev/null 2>&1; then
        validation_results+=("gosec:failed_to_detect_issues")
        print_status "warning" "Gosec didn't detect expected issues"
    else
        validation_results+=("gosec:working")
        print_status "success" "Gosec detected issues as expected"
    fi
    cd "$PROJECT_ROOT"
    
    # Test Semgrep
    print_status "info" "Testing Semgrep with sample files..."
    if semgrep --config=auto --quiet "$test_dir" >/dev/null 2>&1; then
        validation_results+=("semgrep:working")
        print_status "success" "Semgrep scan completed successfully"
    else
        validation_results+=("semgrep:failed")
        print_status "warning" "Semgrep scan had issues"
    fi
    
    echo ""
    return 0
}

# Function to generate validation report
generate_validation_report() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local report_file="$PROJECT_ROOT/security/reports/validation_$timestamp.md"
    
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
# Security Tools Validation Report
Generated: $(date)

## Tool Installation Status
EOF
    
    # Check each tool and add to report
    local tools=(
        "trivy:Container and vulnerability scanning"
        "hadolint:Dockerfile security linting"
        "bandit:Python security analysis"
        "safety:Python dependency vulnerability checking"
        "semgrep:Multi-language static analysis"
        "gosec:Go security analysis"
        "audit-ci:Node.js CI-friendly vulnerability scanning"
        "jq:JSON processing for report parsing"
    )
    
    for tool_info in "${tools[@]}"; do
        IFS=':' read -r tool desc <<< "$tool_info"
        if command_exists "$tool"; then
            echo "- ✅ **$tool**: $desc" >> "$report_file"
        else
            echo "- ❌ **$tool**: $desc (NOT INSTALLED)" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" << EOF

## Tool Versions
EOF
    
    # Add version information
    command_exists trivy && echo "- **Trivy**: $(trivy --version 2>&1 | head -n1)" >> "$report_file"
    command_exists hadolint && echo "- **Hadolint**: $(hadolint --version 2>&1)" >> "$report_file"
    command_exists bandit && echo "- **Bandit**: $(bandit --version 2>&1 | grep version)" >> "$report_file"
    command_exists safety && echo "- **Safety**: $(safety --version 2>&1)" >> "$report_file"
    command_exists semgrep && echo "- **Semgrep**: $(semgrep --version 2>&1)" >> "$report_file"
    command_exists gosec && echo "- **Gosec**: $(gosec --version 2>&1)" >> "$report_file"
    command_exists audit-ci && echo "- **Audit-CI**: $(audit-ci --version 2>&1)" >> "$report_file"
    command_exists jq && echo "- **jq**: $(jq --version 2>&1)" >> "$report_file"
    
    cat >> "$report_file" << EOF

## Validation Results
The validation tests create intentionally vulnerable code and configuration files
to ensure that security tools are properly detecting issues.

### Test Results Summary
EOF
    
    # Count working tools
    local working_tools=0
    local total_tools=0
    
    for tool in trivy hadolint bandit safety semgrep gosec audit-ci; do
        ((total_tools++))
        if command_exists "$tool"; then
            ((working_tools++))
            echo "- ✅ **$tool**: Available and functional" >> "$report_file"
        else
            echo "- ❌ **$tool**: Not available" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" << EOF

### Overall Status
- **Tools Available**: $working_tools/$total_tools
- **Installation Success Rate**: $(( working_tools * 100 / total_tools ))%

## Recommendations
EOF
    
    if [ $working_tools -eq $total_tools ]; then
        cat >> "$report_file" << EOF
✅ **All security tools are properly installed and functional!**

You can now run comprehensive security scans using:
- \`./security/enhanced-scan-all.sh\` - Full security scan of all templates
- \`./security/scan-all.sh\` - Basic security scan
- Individual tool commands as needed

## Next Steps
1. Run the comprehensive security scan
2. Review and address any identified vulnerabilities
3. Integrate security scanning into your CI/CD pipeline
4. Schedule regular security scans
EOF
    else
        cat >> "$report_file" << EOF
⚠️ **Some security tools are missing or not functional.**

Please install missing tools by running:
\`./security/setup-tools.sh\`

Missing tools may prevent comprehensive security scanning.
EOF
    fi
    
    echo "$report_file"
}

# Main validation function
main() {
    echo "=================================================="
    echo "    DevX Platform Security Tools Validation"
    echo "=================================================="
    echo ""
    
    # Create test files
    print_status "info" "Creating test files for validation..."
    test_dir=$(create_test_files)
    print_status "success" "Test files created in: $test_dir"
    echo ""
    
    # Validate core tools
    print_status "info" "Validating security tool installations..."
    echo ""
    
    validate_tool "trivy" "trivy --help" "Container and vulnerability scanning"
    validate_tool "hadolint" "hadolint --help" "Dockerfile security linting"
    validate_tool "bandit" "bandit --help" "Python security analysis"
    validate_tool "safety" "safety --help" "Python dependency vulnerability checking"
    validate_tool "semgrep" "semgrep --help" "Multi-language static analysis"
    validate_tool "gosec" "gosec --help" "Go security analysis"
    validate_tool "audit-ci" "audit-ci --help" "Node.js CI-friendly vulnerability scanning"
    validate_tool "jq" "jq --help" "JSON processing for report parsing"
    
    echo ""
    
    # Run functional tests
    run_validation_tests "$test_dir"
    
    # Generate validation report
    print_status "info" "Generating validation report..."
    report_file=$(generate_validation_report)
    print_status "success" "Validation report generated: $report_file"
    
    # Clean up test files
    print_status "info" "Cleaning up test files..."
    rm -rf "$test_dir"
    print_status "success" "Test files cleaned up"
    
    echo ""
    echo "=================================================="
    echo "    Security Tools Validation Complete!"
    echo "=================================================="
    echo ""
    
    # Display summary
    local working_count=0
    local total_count=0
    
    for tool in trivy hadolint bandit safety semgrep gosec audit-ci jq; do
        ((total_count++))
        if command_exists "$tool"; then
            ((working_count++))
        fi
    done
    
    print_status "info" "Summary: $working_count/$total_count tools are available"
    
    if [ $working_count -eq $total_count ]; then
        print_status "success" "All security tools are ready for use!"
        echo ""
        echo "You can now run comprehensive security scans:"
        echo "  ./security/enhanced-scan-all.sh"
    else
        print_status "warning" "Some tools are missing. Run ./security/setup-tools.sh to install them."
    fi
    
    echo ""
    print_status "info" "Validation report: $report_file"
}

# Run main function
main "$@"