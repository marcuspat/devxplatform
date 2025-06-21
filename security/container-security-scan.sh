#!/bin/bash

# Container Security Scanning Script for DevX Platform
# This script performs comprehensive container security scanning including:
# - Base image vulnerability scanning
# - Dockerfile security analysis
# - Container configuration review
# - Image layer analysis

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="$PROJECT_ROOT/security/reports/container_$TIMESTAMP"
SUMMARY_REPORT="$REPORT_DIR/container-security-summary.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create report directory
mkdir -p "$REPORT_DIR"

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

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Initialize summary report
init_report() {
    cat > "$SUMMARY_REPORT" << EOF
# Container Security Scan Report
Generated: $(date)
Platform: DevX Platform
Scan Type: Container Security Analysis

## Executive Summary
This report contains comprehensive container security analysis for all templates
in the DevX Platform, including Dockerfile security, base image vulnerabilities,
and container configuration best practices.

EOF
}

# Function to add section to report
add_to_report() {
    echo "$1" >> "$SUMMARY_REPORT"
}

# Function to scan all Dockerfiles
scan_dockerfiles() {
    print_status "info" "Scanning Dockerfiles with Hadolint..."
    add_to_report "## Dockerfile Security Analysis"
    add_to_report ""
    
    local dockerfile_count=0
    local total_issues=0
    local critical_issues=0
    local warning_issues=0
    
    # Find all Dockerfiles
    while IFS= read -r dockerfile; do
        ((dockerfile_count++))
        local rel_path="${dockerfile#$PROJECT_ROOT/}"
        print_status "info" "Analyzing: $rel_path"
        
        local report_file="$REPORT_DIR/hadolint_$(echo "$rel_path" | tr '/' '_').txt"
        local json_report="$REPORT_DIR/hadolint_$(echo "$rel_path" | tr '/' '_').json"
        
        # Run hadolint with detailed output
        hadolint --format json "$dockerfile" > "$json_report" 2>/dev/null || true
        hadolint "$dockerfile" > "$report_file" 2>&1 || true
        
        # Parse results
        if [ -s "$json_report" ]; then
            local issue_count=$(jq 'length' "$json_report" 2>/dev/null || echo "0")
            local critical_count=$(jq '[.[] | select(.level == "error")] | length' "$json_report" 2>/dev/null || echo "0")
            local warning_count=$(jq '[.[] | select(.level == "warning")] | length' "$json_report" 2>/dev/null || echo "0")
            
            ((total_issues += issue_count))
            ((critical_issues += critical_count))
            ((warning_issues += warning_count))
            
            if [ "$issue_count" -eq 0 ]; then
                print_status "success" "No issues found in $rel_path"
                add_to_report "- ✓ **$rel_path**: No issues found"
            else
                print_status "warning" "Found $issue_count issues in $rel_path ($critical_count critical, $warning_count warnings)"
                add_to_report "- ⚠ **$rel_path**: $issue_count issues ($critical_count critical, $warning_count warnings) [details]($(basename "$report_file"))"
            fi
        else
            add_to_report "- ⚠ **$rel_path**: Could not analyze"
        fi
    done < <(find "$PROJECT_ROOT/templates" -name "Dockerfile*" -type f)
    
    add_to_report ""
    add_to_report "**Summary:**"
    add_to_report "- Total Dockerfiles scanned: $dockerfile_count"
    add_to_report "- Total issues found: $total_issues"
    add_to_report "- Critical issues: $critical_issues"
    add_to_report "- Warning issues: $warning_issues"
    add_to_report ""
}

# Function to scan base images
scan_base_images() {
    print_status "info" "Scanning base images with Trivy..."
    add_to_report "## Base Image Vulnerability Analysis"
    add_to_report ""
    
    # Extract base images from Dockerfiles
    local images=()
    while IFS= read -r dockerfile; do
        while IFS= read -r image; do
            if [[ ! " ${images[@]} " =~ " ${image} " ]]; then
                images+=("$image")
            fi
        done < <(grep -i "^FROM" "$dockerfile" | awk '{print $2}' | grep -v "^scratch$" | head -1)
    done < <(find "$PROJECT_ROOT/templates" -name "Dockerfile*" -type f)
    
    # Add common base images used in templates
    local common_images=(
        "node:18-alpine"
        "node:20-alpine"
        "python:3.11-slim"
        "python:3.12-slim"
        "golang:1.21-alpine"
        "golang:1.22-alpine"
        "openjdk:17-jdk-slim"
        "openjdk:21-jdk-slim"
        "rust:1.75-slim"
        "nginx:alpine"
    )
    
    for image in "${common_images[@]}"; do
        if [[ ! " ${images[@]} " =~ " ${image} " ]]; then
            images+=("$image")
        fi
    done
    
    local scan_count=0
    local total_vulns=0
    local critical_vulns=0
    local high_vulns=0
    
    for image in "${images[@]}"; do
        ((scan_count++))
        print_status "info" "Scanning image: $image"
        
        local report_file="$REPORT_DIR/trivy_$(echo "$image" | tr ':/' '__').json"
        local summary_file="$REPORT_DIR/trivy_$(echo "$image" | tr ':/' '__')_summary.txt"
        
        if trivy image --format json --output "$report_file" "$image" 2>/dev/null; then
            # Parse vulnerability counts
            local vuln_count=$(jq '[.Results[]?.Vulnerabilities // [] | length] | add // 0' "$report_file" 2>/dev/null)
            local critical_count=$(jq '[.Results[]?.Vulnerabilities // [] | .[] | select(.Severity == "CRITICAL")] | length' "$report_file" 2>/dev/null || echo "0")
            local high_count=$(jq '[.Results[]?.Vulnerabilities // [] | .[] | select(.Severity == "HIGH")] | length' "$report_file" 2>/dev/null || echo "0")
            
            ((total_vulns += vuln_count))
            ((critical_vulns += critical_count))
            ((high_vulns += high_count))
            
            # Generate summary
            echo "Image: $image" > "$summary_file"
            echo "Total Vulnerabilities: $vuln_count" >> "$summary_file"
            echo "Critical: $critical_count" >> "$summary_file"
            echo "High: $high_count" >> "$summary_file"
            
            if [ "$vuln_count" -eq 0 ]; then
                print_status "success" "No vulnerabilities found in $image"
                add_to_report "- ✓ **$image**: No vulnerabilities found"
            else
                print_status "warning" "Found $vuln_count vulnerabilities in $image ($critical_count critical, $high_count high)"
                add_to_report "- ⚠ **$image**: $vuln_count vulnerabilities ($critical_count critical, $high_count high) [details]($(basename "$report_file"))"
            fi
        else
            print_status "error" "Failed to scan $image"
            add_to_report "- ✗ **$image**: Scan failed"
        fi
    done
    
    add_to_report ""
    add_to_report "**Summary:**"
    add_to_report "- Total images scanned: $scan_count"
    add_to_report "- Total vulnerabilities: $total_vulns"
    add_to_report "- Critical vulnerabilities: $critical_vulns"
    add_to_report "- High severity vulnerabilities: $high_vulns"
    add_to_report ""
}

# Function to analyze container configurations
analyze_container_configs() {
    print_status "info" "Analyzing container configurations..."
    add_to_report "## Container Configuration Analysis"
    add_to_report ""
    
    local config_issues=0
    
    # Check for common container security misconfigurations
    while IFS= read -r dockerfile; do
        local rel_path="${dockerfile#$PROJECT_ROOT/}"
        local issues=()
        
        # Check for running as root
        if ! grep -q "USER " "$dockerfile"; then
            issues+=("Running as root user")
        fi
        
        # Check for latest tag usage
        if grep -q "FROM.*:latest" "$dockerfile"; then
            issues+=("Using 'latest' tag")
        fi
        
        # Check for missing healthcheck
        if ! grep -q "HEALTHCHECK" "$dockerfile"; then
            issues+=("Missing health check")
        fi
        
        # Check for unnecessary packages
        if grep -q "curl\|wget" "$dockerfile"; then
            issues+=("Contains network tools (curl/wget)")
        fi
        
        # Check for exposed privileged ports
        if grep -q "EXPOSE.*80\|EXPOSE.*443\|EXPOSE.*22" "$dockerfile"; then
            issues+=("Exposes privileged ports")
        fi
        
        if [ ${#issues[@]} -eq 0 ]; then
            add_to_report "- ✓ **$rel_path**: No configuration issues found"
        else
            ((config_issues += ${#issues[@]}))
            add_to_report "- ⚠ **$rel_path**: ${#issues[@]} configuration issues:"
            for issue in "${issues[@]}"; do
                add_to_report "  - $issue"
            done
        fi
    done < <(find "$PROJECT_ROOT/templates" -name "Dockerfile*" -type f)
    
    add_to_report ""
    add_to_report "**Total configuration issues found:** $config_issues"
    add_to_report ""
}

# Function to check for secrets in containers
scan_for_secrets() {
    print_status "info" "Scanning for embedded secrets..."
    add_to_report "## Secret Detection in Container Configurations"
    add_to_report ""
    
    local secrets_found=0
    
    # Pattern to look for secrets
    local secret_patterns=(
        "password\s*[:=]\s*['\"][^'\"]+['\"]"
        "secret\s*[:=]\s*['\"][^'\"]+['\"]"
        "api_key\s*[:=]\s*['\"][^'\"]+['\"]"
        "token\s*[:=]\s*['\"][^'\"]+['\"]"
        "private_key"
        "-----BEGIN.*PRIVATE KEY-----"
    )
    
    while IFS= read -r dockerfile; do
        local rel_path="${dockerfile#$PROJECT_ROOT/}"
        local found_secrets=()
        
        for pattern in "${secret_patterns[@]}"; do
            if grep -iE "$pattern" "$dockerfile" >/dev/null 2>&1; then
                found_secrets+=("Potential secret pattern: $pattern")
            fi
        done
        
        if [ ${#found_secrets[@]} -eq 0 ]; then
            add_to_report "- ✓ **$rel_path**: No secrets detected"
        else
            ((secrets_found += ${#found_secrets[@]}))
            add_to_report "- ⚠ **$rel_path**: ${#found_secrets[@]} potential secrets found:"
            for secret in "${found_secrets[@]}"; do
                add_to_report "  - $secret"
            done
        fi
    done < <(find "$PROJECT_ROOT/templates" -name "Dockerfile*" -type f)
    
    add_to_report ""
    add_to_report "**Total potential secrets found:** $secrets_found"
    add_to_report ""
}

# Function to generate recommendations
generate_recommendations() {
    add_to_report "## Security Recommendations"
    add_to_report ""
    add_to_report "### Dockerfile Best Practices"
    add_to_report "1. **Use specific image tags** instead of 'latest'"
    add_to_report "2. **Run as non-root user** with USER directive"
    add_to_report "3. **Add health checks** with HEALTHCHECK directive"
    add_to_report "4. **Minimize attack surface** by removing unnecessary packages"
    add_to_report "5. **Use multi-stage builds** to reduce final image size"
    add_to_report "6. **Scan images regularly** for vulnerabilities"
    add_to_report ""
    add_to_report "### Base Image Security"
    add_to_report "1. **Choose minimal base images** (alpine, distroless)"
    add_to_report "2. **Update base images regularly** to get security patches"
    add_to_report "3. **Use official images** from trusted sources"
    add_to_report "4. **Pin image versions** for reproducible builds"
    add_to_report ""
    add_to_report "### Container Runtime Security"
    add_to_report "1. **Use security policies** (Pod Security Standards, AppArmor, SELinux)"
    add_to_report "2. **Implement resource limits** for CPU and memory"
    add_to_report "3. **Use read-only filesystems** where possible"
    add_to_report "4. **Avoid privileged containers** unless absolutely necessary"
    add_to_report ""
    add_to_report "### Secrets Management"
    add_to_report "1. **Never embed secrets** in container images"
    add_to_report "2. **Use secret management systems** (Kubernetes secrets, Vault)"
    add_to_report "3. **Use environment variables** for configuration"
    add_to_report "4. **Implement secret rotation** policies"
    add_to_report ""
}

# Function to generate summary
generate_summary() {
    add_to_report "## Overall Container Security Status"
    add_to_report ""
    
    local total_issues=$(grep -c "⚠" "$SUMMARY_REPORT" || true)
    local total_passed=$(grep -c "✓" "$SUMMARY_REPORT" || true)
    local total_failed=$(grep -c "✗" "$SUMMARY_REPORT" || true)
    
    add_to_report "- **Passed checks:** $total_passed"
    add_to_report "- **Warnings/Issues:** $total_issues"
    add_to_report "- **Failed scans:** $total_failed"
    add_to_report ""
    
    if [ "$total_issues" -eq 0 ] && [ "$total_failed" -eq 0 ]; then
        add_to_report "### 🎉 All container security checks passed!"
        add_to_report "Your containers follow security best practices."
    elif [ "$total_issues" -le 5 ]; then
        add_to_report "### ✅ Good container security posture"
        add_to_report "Minor issues detected - review and address when possible."
    elif [ "$total_issues" -le 15 ]; then
        add_to_report "### ⚠️ Moderate security issues detected"
        add_to_report "Several issues require attention - prioritize critical vulnerabilities."
    else
        add_to_report "### 🚨 Significant security issues detected"
        add_to_report "Many issues require immediate attention - implement fixes before production."
    fi
    
    add_to_report ""
    add_to_report "## Next Steps"
    add_to_report "1. **Review detailed reports** in $REPORT_DIR"
    add_to_report "2. **Address critical vulnerabilities** first"
    add_to_report "3. **Update base images** to latest secure versions"
    add_to_report "4. **Implement recommended Dockerfile changes**"
    add_to_report "5. **Set up automated container scanning** in CI/CD"
    add_to_report ""
    add_to_report "## Report Files"
    add_to_report "- **Summary**: [container-security-summary.md](container-security-summary.md)"
    add_to_report "- **Detailed reports**: Available in $REPORT_DIR"
}

# Main execution
main() {
    echo "=================================================="
    echo "    DevX Platform Container Security Scan"
    echo "=================================================="
    echo ""
    
    # Check if tools are installed
    if ! command_exists trivy || ! command_exists hadolint; then
        print_status "error" "Required tools not found. Please run ./security/setup-tools.sh"
        exit 1
    fi
    
    # Initialize report
    init_report
    
    print_status "info" "Starting comprehensive container security scan..."
    echo ""
    
    # Run all scans
    scan_dockerfiles
    echo ""
    
    scan_base_images
    echo ""
    
    analyze_container_configs
    echo ""
    
    scan_for_secrets
    echo ""
    
    # Generate recommendations and summary
    generate_recommendations
    generate_summary
    
    echo ""
    echo "=================================================="
    echo "    Container Security Scan Complete!"
    echo "=================================================="
    echo ""
    
    print_status "success" "Summary report: $SUMMARY_REPORT"
    print_status "info" "Detailed reports: $REPORT_DIR"
    echo ""
    
    # Display quick summary
    echo "Quick Summary:"
    grep -E "(Passed checks|Warnings|Failed scans):" "$SUMMARY_REPORT" | sed 's/- /  /'
    echo ""
    
    print_status "info" "Consider running ./security/enhanced-scan-all.sh for complete security analysis"
}

# Run main function
main "$@"