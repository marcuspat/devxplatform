#!/bin/bash

# CI/CD Security Integration Script for DevX Platform
# This script provides CI/CD-friendly security scanning with exit codes and structured output
# Designed for integration with GitHub Actions, Jenkins, GitLab CI, and other CI/CD systems

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="$PROJECT_ROOT/security/reports/cicd_$TIMESTAMP"

# Configuration
FAIL_ON_HIGH=true
FAIL_ON_MEDIUM=false
MAX_CRITICAL_VULNS=0
MAX_HIGH_VULNS=5
MAX_MEDIUM_VULNS=20

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fail-on-high)
            FAIL_ON_HIGH=true
            shift
            ;;
        --no-fail-on-high)
            FAIL_ON_HIGH=false
            shift
            ;;
        --fail-on-medium)
            FAIL_ON_MEDIUM=true
            shift
            ;;
        --max-critical)
            MAX_CRITICAL_VULNS="$2"
            shift 2
            ;;
        --max-high)
            MAX_HIGH_VULNS="$2"
            shift 2
            ;;
        --max-medium)
            MAX_MEDIUM_VULNS="$2"
            shift 2
            ;;
        --output-dir)
            REPORT_DIR="$2"
            shift 2
            ;;
        --help)
            cat << EOF
DevX Platform CI/CD Security Integration Script

Usage: $0 [OPTIONS]

Options:
  --fail-on-high          Fail build if high severity vulnerabilities found (default: true)
  --no-fail-on-high       Don't fail build on high severity vulnerabilities
  --fail-on-medium        Fail build if medium severity vulnerabilities found (default: false)
  --max-critical N        Maximum allowed critical vulnerabilities (default: 0)
  --max-high N           Maximum allowed high severity vulnerabilities (default: 5)
  --max-medium N         Maximum allowed medium severity vulnerabilities (default: 20)
  --output-dir DIR       Output directory for reports (default: auto-generated)
  --help                 Show this help message

Environment Variables:
  SECURITY_FAIL_ON_HIGH     Override --fail-on-high setting
  SECURITY_MAX_CRITICAL     Override --max-critical setting
  SECURITY_MAX_HIGH         Override --max-high setting
  SECURITY_MAX_MEDIUM       Override --max-medium setting

Exit Codes:
  0 - Success (no issues or within acceptable limits)
  1 - Security issues exceed configured thresholds
  2 - Tool installation or configuration error
  3 - Scan execution error
EOF
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 2
            ;;
    esac
done

# Override with environment variables if set
FAIL_ON_HIGH=${SECURITY_FAIL_ON_HIGH:-$FAIL_ON_HIGH}
MAX_CRITICAL_VULNS=${SECURITY_MAX_CRITICAL:-$MAX_CRITICAL_VULNS}
MAX_HIGH_VULNS=${SECURITY_MAX_HIGH:-$MAX_HIGH_VULNS}
MAX_MEDIUM_VULNS=${SECURITY_MAX_MEDIUM:-$MAX_MEDIUM_VULNS}

# Colors for output (disabled in CI)
if [ -t 1 ] && [ "${CI:-false}" != "true" ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# Create report directory
mkdir -p "$REPORT_DIR"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status with CI-friendly output
print_status() {
    local status=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $status in
        "success")
            echo -e "${GREEN}[SUCCESS]${NC} [$timestamp] $message"
            ;;
        "warning")
            echo -e "${YELLOW}[WARNING]${NC} [$timestamp] $message"
            ;;
        "error")
            echo -e "${RED}[ERROR]${NC} [$timestamp] $message"
            ;;
        "info")
            echo -e "${BLUE}[INFO]${NC} [$timestamp] $message"
            ;;
    esac
}

# Function to check tool availability
check_tools() {
    print_status "info" "Checking security tool availability..."
    
    local missing_tools=()
    local tools=("trivy" "hadolint" "bandit" "safety" "gosec" "semgrep" "jq")
    
    for tool in "${tools[@]}"; do
        if ! command_exists "$tool"; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_status "error" "Missing required tools: ${missing_tools[*]}"
        print_status "error" "Please run: ./security/setup-tools.sh"
        exit 2
    fi
    
    print_status "success" "All security tools are available"
}

# Function to run container security scan
run_container_scan() {
    print_status "info" "Running container security scan..."
    
    local exit_code=0
    local critical_vulns=0
    local high_vulns=0
    local medium_vulns=0
    
    # Scan Dockerfiles
    print_status "info" "Scanning Dockerfiles with Hadolint..."
    local dockerfile_issues=0
    
    while IFS= read -r dockerfile; do
        local rel_path="${dockerfile#$PROJECT_ROOT/}"
        local report_file="$REPORT_DIR/hadolint_$(echo "$rel_path" | tr '/' '_').json"
        
        if hadolint --format json "$dockerfile" > "$report_file" 2>/dev/null; then
            local critical_count=$(jq '[.[] | select(.level == "error")] | length' "$report_file" 2>/dev/null || echo "0")
            dockerfile_issues=$((dockerfile_issues + critical_count))
        fi
    done < <(find "$PROJECT_ROOT/templates" -name "Dockerfile*" -type f)
    
    # Scan base images
    print_status "info" "Scanning container images with Trivy..."
    local images=("node:18-alpine" "python:3.11-slim" "golang:1.21-alpine" "openjdk:17-jdk-slim")
    
    for image in "${images[@]}"; do
        local report_file="$REPORT_DIR/trivy_$(echo "$image" | tr ':/' '__').json"
        
        if trivy image --format json --output "$report_file" "$image" 2>/dev/null; then
            local critical_count=$(jq '[.Results[]?.Vulnerabilities // [] | .[] | select(.Severity == "CRITICAL")] | length' "$report_file" 2>/dev/null || echo "0")
            local high_count=$(jq '[.Results[]?.Vulnerabilities // [] | .[] | select(.Severity == "HIGH")] | length' "$report_file" 2>/dev/null || echo "0")
            local medium_count=$(jq '[.Results[]?.Vulnerabilities // [] | .[] | select(.Severity == "MEDIUM")] | length' "$report_file" 2>/dev/null || echo "0")
            
            critical_vulns=$((critical_vulns + critical_count))
            high_vulns=$((high_vulns + high_count))
            medium_vulns=$((medium_vulns + medium_count))
        fi
    done
    
    # Generate container scan results
    cat > "$REPORT_DIR/container_scan_results.json" << EOF
{
    "scan_type": "container",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "results": {
        "dockerfile_issues": $dockerfile_issues,
        "vulnerabilities": {
            "critical": $critical_vulns,
            "high": $high_vulns,
            "medium": $medium_vulns
        }
    },
    "thresholds": {
        "max_critical": $MAX_CRITICAL_VULNS,
        "max_high": $MAX_HIGH_VULNS,
        "max_medium": $MAX_MEDIUM_VULNS
    }
}
EOF
    
    # Check thresholds
    if [ $critical_vulns -gt $MAX_CRITICAL_VULNS ]; then
        print_status "error" "Critical vulnerabilities ($critical_vulns) exceed threshold ($MAX_CRITICAL_VULNS)"
        exit_code=1
    fi
    
    if [ "$FAIL_ON_HIGH" = "true" ] && [ $high_vulns -gt $MAX_HIGH_VULNS ]; then
        print_status "error" "High vulnerabilities ($high_vulns) exceed threshold ($MAX_HIGH_VULNS)"
        exit_code=1
    fi
    
    if [ "$FAIL_ON_MEDIUM" = "true" ] && [ $medium_vulns -gt $MAX_MEDIUM_VULNS ]; then
        print_status "error" "Medium vulnerabilities ($medium_vulns) exceed threshold ($MAX_MEDIUM_VULNS)"
        exit_code=1
    fi
    
    print_status "info" "Container scan: Critical=$critical_vulns, High=$high_vulns, Medium=$medium_vulns"
    return $exit_code
}

# Function to run dependency scan
run_dependency_scan() {
    print_status "info" "Running dependency security scan..."
    
    local exit_code=0
    local total_vulns=0
    
    # Scan Node.js projects
    while IFS= read -r package_json; do
        local project_dir=$(dirname "$package_json")
        local rel_path="${project_dir#$PROJECT_ROOT/}"
        
        # Skip node_modules
        if [[ "$package_json" == *"node_modules"* ]]; then
            continue
        fi
        
        cd "$project_dir"
        
        local audit_report="$REPORT_DIR/npm_audit_$(echo "$rel_path" | tr '/' '_').json"
        if npm audit --json > "$audit_report" 2>/dev/null; then
            local vuln_count=$(jq '.metadata.vulnerabilities | to_entries | map(.value) | add // 0' "$audit_report" 2>/dev/null)
            total_vulns=$((total_vulns + vuln_count))
            
            if [ "$vuln_count" -gt 0 ]; then
                print_status "warning" "Found $vuln_count vulnerabilities in $rel_path"
            fi
        fi
        
        cd "$PROJECT_ROOT"
    done < <(find "$PROJECT_ROOT/templates" -name "package.json" -type f)
    
    # Scan Python projects
    while IFS= read -r req_file; do
        local project_dir=$(dirname "$req_file")
        local rel_path="${project_dir#$PROJECT_ROOT/}"
        
        local safety_report="$REPORT_DIR/safety_$(echo "$rel_path" | tr '/' '_').json"
        if safety check --file="$req_file" --json > "$safety_report" 2>/dev/null; then
            print_status "success" "No vulnerable Python dependencies in $rel_path"
        else
            local vuln_count=$(jq '. | length // 0' "$safety_report" 2>/dev/null)
            if [ "$vuln_count" -gt 0 ]; then
                total_vulns=$((total_vulns + vuln_count))
                print_status "warning" "Found $vuln_count vulnerable dependencies in $rel_path"
            fi
        fi
    done < <(find "$PROJECT_ROOT/templates" -name "requirements.txt" -type f)
    
    # Generate dependency scan results
    cat > "$REPORT_DIR/dependency_scan_results.json" << EOF
{
    "scan_type": "dependencies",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "results": {
        "total_vulnerabilities": $total_vulns
    }
}
EOF
    
    print_status "info" "Dependency scan: Total vulnerabilities=$total_vulns"
    return $exit_code
}

# Function to run static analysis
run_static_analysis() {
    print_status "info" "Running static analysis..."
    
    local exit_code=0
    local total_issues=0
    
    # Run semgrep
    local semgrep_report="$REPORT_DIR/semgrep_results.json"
    if semgrep --config=auto --json --output="$semgrep_report" "$PROJECT_ROOT/templates" 2>/dev/null; then
        local issue_count=$(jq '.results | length // 0' "$semgrep_report" 2>/dev/null)
        total_issues=$((total_issues + issue_count))
        
        if [ "$issue_count" -gt 0 ]; then
            print_status "warning" "Semgrep found $issue_count static analysis issues"
        fi
    fi
    
    # Run language-specific tools
    # Go projects
    while IFS= read -r go_mod; do
        local project_dir=$(dirname "$go_mod")
        local rel_path="${project_dir#$PROJECT_ROOT/}"
        
        cd "$project_dir"
        
        local gosec_report="$REPORT_DIR/gosec_$(echo "$rel_path" | tr '/' '_').json"
        if gosec -fmt json -out "$gosec_report" ./... 2>/dev/null; then
            local issue_count=$(jq '.Issues | length // 0' "$gosec_report" 2>/dev/null)
            total_issues=$((total_issues + issue_count))
            
            if [ "$issue_count" -gt 0 ]; then
                print_status "warning" "Gosec found $issue_count issues in $rel_path"
            fi
        fi
        
        cd "$PROJECT_ROOT"
    done < <(find "$PROJECT_ROOT/templates" -name "go.mod" -type f)
    
    # Python projects
    while IFS= read -r req_file; do
        local project_dir=$(dirname "$req_file")
        local rel_path="${project_dir#$PROJECT_ROOT/}"
        
        local bandit_report="$REPORT_DIR/bandit_$(echo "$rel_path" | tr '/' '_').json"
        if bandit -r "$project_dir" -f json -o "$bandit_report" 2>/dev/null; then
            local issue_count=$(jq '.results | length // 0' "$bandit_report" 2>/dev/null)
            total_issues=$((total_issues + issue_count))
            
            if [ "$issue_count" -gt 0 ]; then
                print_status "warning" "Bandit found $issue_count issues in $rel_path"
            fi
        fi
    done < <(find "$PROJECT_ROOT/templates" -name "requirements.txt" -type f)
    
    # Generate static analysis results
    cat > "$REPORT_DIR/static_analysis_results.json" << EOF
{
    "scan_type": "static_analysis",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "results": {
        "total_issues": $total_issues
    }
}
EOF
    
    print_status "info" "Static analysis: Total issues=$total_issues"
    return $exit_code
}

# Function to generate CI/CD summary report
generate_cicd_summary() {
    local overall_exit_code=$1
    
    cat > "$REPORT_DIR/cicd_summary.json" << EOF
{
    "scan_summary": {
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
        "overall_status": $([ $overall_exit_code -eq 0 ] && echo '"PASS"' || echo '"FAIL"'),
        "exit_code": $overall_exit_code,
        "configuration": {
            "fail_on_high": $FAIL_ON_HIGH,
            "fail_on_medium": $FAIL_ON_MEDIUM,
            "max_critical": $MAX_CRITICAL_VULNS,
            "max_high": $MAX_HIGH_VULNS,
            "max_medium": $MAX_MEDIUM_VULNS
        },
        "report_directory": "$REPORT_DIR"
    }
}
EOF
    
    # Generate human-readable summary
    cat > "$REPORT_DIR/cicd_summary.md" << EOF
# CI/CD Security Scan Summary

**Scan Date:** $(date)  
**Overall Status:** $([ $overall_exit_code -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")  
**Exit Code:** $overall_exit_code

## Configuration
- Fail on High Severity: $FAIL_ON_HIGH
- Fail on Medium Severity: $FAIL_ON_MEDIUM
- Max Critical Vulnerabilities: $MAX_CRITICAL_VULNS
- Max High Vulnerabilities: $MAX_HIGH_VULNS
- Max Medium Vulnerabilities: $MAX_MEDIUM_VULNS

## Scan Results
EOF
    
    # Add results from individual scans
    if [ -f "$REPORT_DIR/container_scan_results.json" ]; then
        local critical=$(jq '.results.vulnerabilities.critical' "$REPORT_DIR/container_scan_results.json")
        local high=$(jq '.results.vulnerabilities.high' "$REPORT_DIR/container_scan_results.json")
        local medium=$(jq '.results.vulnerabilities.medium' "$REPORT_DIR/container_scan_results.json")
        
        cat >> "$REPORT_DIR/cicd_summary.md" << EOF
### Container Security
- Critical Vulnerabilities: $critical
- High Vulnerabilities: $high
- Medium Vulnerabilities: $medium

EOF
    fi
    
    if [ -f "$REPORT_DIR/dependency_scan_results.json" ]; then
        local deps=$(jq '.results.total_vulnerabilities' "$REPORT_DIR/dependency_scan_results.json")
        cat >> "$REPORT_DIR/cicd_summary.md" << EOF
### Dependency Security
- Total Vulnerable Dependencies: $deps

EOF
    fi
    
    if [ -f "$REPORT_DIR/static_analysis_results.json" ]; then
        local issues=$(jq '.results.total_issues' "$REPORT_DIR/static_analysis_results.json")
        cat >> "$REPORT_DIR/cicd_summary.md" << EOF
### Static Analysis
- Total Security Issues: $issues

EOF
    fi
    
    cat >> "$REPORT_DIR/cicd_summary.md" << EOF
## Report Files
- Summary: [cicd_summary.json](cicd_summary.json)
- Container Scan: [container_scan_results.json](container_scan_results.json)
- Dependency Scan: [dependency_scan_results.json](dependency_scan_results.json)
- Static Analysis: [static_analysis_results.json](static_analysis_results.json)

## Next Steps
EOF
    
    if [ $overall_exit_code -eq 0 ]; then
        cat >> "$REPORT_DIR/cicd_summary.md" << EOF
✅ Security scan passed! The build can proceed.

Consider reviewing any warnings in the detailed reports.
EOF
    else
        cat >> "$REPORT_DIR/cicd_summary.md" << EOF
❌ Security scan failed! The build should be blocked.

**Required Actions:**
1. Review and fix critical security issues
2. Update vulnerable dependencies
3. Address high-severity vulnerabilities
4. Re-run security scan to verify fixes
EOF
    fi
}

# Main execution
main() {
    echo "=================================================="
    echo "    DevX Platform CI/CD Security Integration"
    echo "=================================================="
    print_status "info" "Configuration: fail_on_high=$FAIL_ON_HIGH, max_critical=$MAX_CRITICAL_VULNS, max_high=$MAX_HIGH_VULNS"
    echo ""
    
    # Check tools
    check_tools
    
    local overall_exit_code=0
    
    # Run scans
    if ! run_container_scan; then
        overall_exit_code=1
    fi
    
    if ! run_dependency_scan; then
        overall_exit_code=1
    fi
    
    if ! run_static_analysis; then
        overall_exit_code=1
    fi
    
    # Generate summary
    generate_cicd_summary $overall_exit_code
    
    echo ""
    echo "=================================================="
    echo "    CI/CD Security Scan Complete"
    echo "=================================================="
    
    if [ $overall_exit_code -eq 0 ]; then
        print_status "success" "Security scan PASSED - build can proceed"
    else
        print_status "error" "Security scan FAILED - build should be blocked"
    fi
    
    print_status "info" "Reports available in: $REPORT_DIR"
    print_status "info" "Summary: $REPORT_DIR/cicd_summary.json"
    
    exit $overall_exit_code
}

# Run main function
main "$@"