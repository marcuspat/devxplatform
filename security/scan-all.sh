#!/bin/bash

# Comprehensive security scanning script for DevX Platform
# This script runs multiple security tools across all templates and generates a unified report

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="$PROJECT_ROOT/security/reports/$TIMESTAMP"
SUMMARY_REPORT="$REPORT_DIR/security-scan-summary.md"

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
# Security Scan Report
Generated: $(date)

## Summary
This report contains the results of comprehensive security scanning across the DevX Platform.

EOF

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to add section to report
add_to_report() {
    echo "$1" >> "$SUMMARY_REPORT"
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

# Function to scan Dockerfiles with hadolint
scan_dockerfiles() {
    print_status "info" "Scanning Dockerfiles with Hadolint..."
    add_to_report "## Dockerfile Security Analysis"
    add_to_report ""
    
    local dockerfile_count=0
    local issues_found=0
    
    # Find all Dockerfiles
    while IFS= read -r dockerfile; do
        ((dockerfile_count++))
        local rel_path="${dockerfile#$PROJECT_ROOT/}"
        print_status "info" "Scanning: $rel_path"
        
        local report_file="$REPORT_DIR/hadolint_$(echo "$rel_path" | tr '/' '_').txt"
        
        if hadolint "$dockerfile" > "$report_file" 2>&1; then
            print_status "success" "No issues found in $rel_path"
            add_to_report "- ✓ **$rel_path**: No issues found"
        else
            local issue_count=$(wc -l < "$report_file")
            ((issues_found += issue_count))
            print_status "warning" "Found $issue_count issues in $rel_path"
            add_to_report "- ⚠ **$rel_path**: $issue_count issues found ([details]($(basename "$report_file")))"
        fi
    done < <(find "$PROJECT_ROOT/templates" -name "Dockerfile*" -type f)
    
    add_to_report ""
    add_to_report "**Total Dockerfiles scanned:** $dockerfile_count"
    add_to_report "**Total issues found:** $issues_found"
    add_to_report ""
}

# Function to scan container images with trivy
scan_container_images() {
    print_status "info" "Scanning container images with Trivy..."
    add_to_report "## Container Vulnerability Scanning"
    add_to_report ""
    
    local scan_count=0
    local vulns_found=0
    
    # Scan base images used in Dockerfiles
    local base_images=(
        "node:18-alpine"
        "python:3.11-slim"
        "golang:1.21-alpine"
        "openjdk:17-jdk-slim"
        "rust:1.75-slim"
    )
    
    for image in "${base_images[@]}"; do
        ((scan_count++))
        print_status "info" "Scanning image: $image"
        
        local report_file="$REPORT_DIR/trivy_$(echo "$image" | tr ':/' '__').json"
        
        if trivy image --format json --output "$report_file" "$image" 2>/dev/null; then
            local vuln_count=$(jq '.Results[]?.Vulnerabilities | length' "$report_file" 2>/dev/null | awk '{s+=$1} END {print s}')
            vuln_count=${vuln_count:-0}
            
            if [ "$vuln_count" -eq 0 ]; then
                print_status "success" "No vulnerabilities found in $image"
                add_to_report "- ✓ **$image**: No vulnerabilities found"
            else
                ((vulns_found += vuln_count))
                print_status "warning" "Found $vuln_count vulnerabilities in $image"
                add_to_report "- ⚠ **$image**: $vuln_count vulnerabilities ([details]($(basename "$report_file")))"
            fi
        else
            print_status "error" "Failed to scan $image"
            add_to_report "- ✗ **$image**: Scan failed"
        fi
    done
    
    add_to_report ""
    add_to_report "**Total images scanned:** $scan_count"
    add_to_report "**Total vulnerabilities found:** $vulns_found"
    add_to_report ""
}

# Function to scan Node.js projects
scan_nodejs_projects() {
    print_status "info" "Scanning Node.js projects..."
    add_to_report "## Node.js Security Analysis"
    add_to_report ""
    
    local project_count=0
    local audit_issues=0
    
    # Find all package.json files in templates
    while IFS= read -r package_json; do
        local project_dir=$(dirname "$package_json")
        local rel_path="${project_dir#$PROJECT_ROOT/}"
        
        # Skip node_modules directories
        if [[ "$package_json" == *"node_modules"* ]]; then
            continue
        fi
        
        ((project_count++))
        print_status "info" "Scanning Node.js project: $rel_path"
        
        cd "$project_dir"
        
        # Run npm audit
        local audit_report="$REPORT_DIR/npm_audit_$(echo "$rel_path" | tr '/' '_').json"
        if npm audit --json > "$audit_report" 2>/dev/null; then
            local vuln_count=$(jq '.metadata.vulnerabilities | to_entries | map(.value) | add' "$audit_report" 2>/dev/null)
            vuln_count=${vuln_count:-0}
            
            if [ "$vuln_count" -eq 0 ]; then
                print_status "success" "No vulnerabilities found in $rel_path"
                add_to_report "- ✓ **$rel_path**: No vulnerabilities found"
            else
                ((audit_issues += vuln_count))
                print_status "warning" "Found $vuln_count vulnerabilities in $rel_path"
                add_to_report "- ⚠ **$rel_path**: $vuln_count vulnerabilities ([details]($(basename "$audit_report")))"
            fi
        else
            print_status "warning" "Could not run npm audit in $rel_path (missing node_modules?)"
            add_to_report "- ⚠ **$rel_path**: Skipped (no node_modules)"
        fi
        
        cd "$PROJECT_ROOT"
    done < <(find "$PROJECT_ROOT/templates" -name "package.json" -type f)
    
    add_to_report ""
    add_to_report "**Total Node.js projects scanned:** $project_count"
    add_to_report "**Total vulnerabilities found:** $audit_issues"
    add_to_report ""
}

# Function to scan Python projects
scan_python_projects() {
    print_status "info" "Scanning Python projects..."
    add_to_report "## Python Security Analysis"
    add_to_report ""
    
    local project_count=0
    local bandit_issues=0
    local safety_issues=0
    
    # Find all Python projects (directories with requirements.txt or setup.py)
    while IFS= read -r req_file; do
        local project_dir=$(dirname "$req_file")
        local rel_path="${project_dir#$PROJECT_ROOT/}"
        
        ((project_count++))
        print_status "info" "Scanning Python project: $rel_path"
        
        # Run Bandit for code analysis
        local bandit_report="$REPORT_DIR/bandit_$(echo "$rel_path" | tr '/' '_').json"
        if bandit -r "$project_dir" -f json -o "$bandit_report" 2>/dev/null; then
            local issue_count=$(jq '.results | length' "$bandit_report" 2>/dev/null)
            issue_count=${issue_count:-0}
            
            if [ "$issue_count" -eq 0 ]; then
                print_status "success" "No security issues found by Bandit in $rel_path"
                add_to_report "- ✓ **$rel_path** (Bandit): No issues found"
            else
                ((bandit_issues += issue_count))
                print_status "warning" "Bandit found $issue_count issues in $rel_path"
                add_to_report "- ⚠ **$rel_path** (Bandit): $issue_count issues ([details]($(basename "$bandit_report")))"
            fi
        fi
        
        # Run Safety for dependency checking
        if [ -f "$req_file" ]; then
            local safety_report="$REPORT_DIR/safety_$(echo "$rel_path" | tr '/' '_').json"
            if safety check --file="$req_file" --json > "$safety_report" 2>/dev/null; then
                print_status "success" "No vulnerable dependencies found in $rel_path"
                add_to_report "- ✓ **$rel_path** (Safety): No vulnerable dependencies"
            else
                local vuln_count=$(jq '. | length' "$safety_report" 2>/dev/null)
                vuln_count=${vuln_count:-0}
                if [ "$vuln_count" -gt 0 ]; then
                    ((safety_issues += vuln_count))
                    print_status "warning" "Safety found $vuln_count vulnerable dependencies in $rel_path"
                    add_to_report "- ⚠ **$rel_path** (Safety): $vuln_count vulnerable dependencies ([details]($(basename "$safety_report")))"
                fi
            fi
        fi
    done < <(find "$PROJECT_ROOT/templates" -name "requirements.txt" -type f)
    
    add_to_report ""
    add_to_report "**Total Python projects scanned:** $project_count"
    add_to_report "**Bandit issues found:** $bandit_issues"
    add_to_report "**Vulnerable dependencies found:** $safety_issues"
    add_to_report ""
}

# Function to generate summary
generate_summary() {
    add_to_report "## Overall Security Status"
    add_to_report ""
    
    local total_issues=$(grep -c "⚠" "$SUMMARY_REPORT" || true)
    local total_passed=$(grep -c "✓" "$SUMMARY_REPORT" || true)
    local total_failed=$(grep -c "✗" "$SUMMARY_REPORT" || true)
    
    add_to_report "- **Passed checks:** $total_passed"
    add_to_report "- **Warnings:** $total_issues"
    add_to_report "- **Failed checks:** $total_failed"
    add_to_report ""
    
    if [ "$total_issues" -eq 0 ] && [ "$total_failed" -eq 0 ]; then
        add_to_report "### 🎉 All security checks passed!"
    else
        add_to_report "### ⚠️ Security issues detected - review required"
    fi
    
    add_to_report ""
    add_to_report "## Recommendations"
    add_to_report ""
    add_to_report "1. **Review all warnings** in the detailed reports"
    add_to_report "2. **Update base images** to their latest secure versions"
    add_to_report "3. **Update dependencies** with known vulnerabilities"
    add_to_report "4. **Apply Dockerfile best practices** as suggested by Hadolint"
    add_to_report "5. **Fix code security issues** identified by Bandit"
    add_to_report ""
    add_to_report "## Report Location"
    add_to_report "Full reports are available in: \`$REPORT_DIR\`"
}

# Main execution
main() {
    echo "=================================================="
    echo "     DevX Platform Security Scan"
    echo "=================================================="
    echo ""
    
    # Check if tools are installed
    local missing_tools=()
    command_exists trivy || missing_tools+=("trivy")
    command_exists hadolint || missing_tools+=("hadolint")
    command_exists bandit || missing_tools+=("bandit")
    command_exists safety || missing_tools+=("safety")
    command_exists jq || missing_tools+=("jq")
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_status "error" "Missing required tools: ${missing_tools[*]}"
        echo "Please run: ./security/setup-tools.sh"
        exit 1
    fi
    
    print_status "info" "Starting comprehensive security scan..."
    echo ""
    
    # Run all scans
    scan_dockerfiles
    echo ""
    
    scan_container_images
    echo ""
    
    scan_nodejs_projects
    echo ""
    
    scan_python_projects
    echo ""
    
    # Generate summary
    generate_summary
    
    echo ""
    echo "=================================================="
    echo "     Security Scan Complete!"
    echo "=================================================="
    echo ""
    print_status "success" "Summary report: $SUMMARY_REPORT"
    print_status "info" "Detailed reports: $REPORT_DIR"
    echo ""
    
    # Display summary
    echo "Quick Summary:"
    grep -E "(Passed checks|Warnings|Failed checks):" "$SUMMARY_REPORT" | sed 's/- /  /'
    echo ""
}

# Run main function
main "$@"