#!/bin/bash

# Security testing for all templates

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

RESULTS_DIR="test-results/security"
mkdir -p "$RESULTS_DIR"

# Check for secrets in code
echo -e "\n${YELLOW}Scanning for hardcoded secrets...${NC}"
secrets_report="$RESULTS_DIR/secrets-scan.log"
echo "Secrets Scan Report" > "$secrets_report"
echo "==================" >> "$secrets_report"

# Common secret patterns
patterns=(
    "password.*=.*['\"].*['\"]" 
    "api_key.*=.*['\"].*['\"]" 
    "secret.*=.*['\"].*['\"]" 
    "token.*=.*['\"].*['\"]" 
    "private_key" 
    "aws_access_key" 
    "aws_secret"
)

for pattern in "${patterns[@]}"; do
    echo -e "\nSearching for pattern: $pattern" >> "$secrets_report"
    grep -r -i "$pattern" --include="*.js" --include="*.ts" --include="*.py" \
        --include="*.java" --include="*.go" --include="*.yaml" --include="*.yml" \
        --include="*.json" --exclude-dir="node_modules" --exclude-dir=".git" \
        --exclude-dir="venv" --exclude-dir="dist" --exclude-dir="build" \
        . >> "$secrets_report" 2>/dev/null || true
done

# Docker security scan
echo -e "\n${YELLOW}Scanning Dockerfiles...${NC}"
docker_report="$RESULTS_DIR/docker-scan.log"
echo "Docker Security Scan Report" > "$docker_report"
echo "==========================" >> "$docker_report"

find . -name "Dockerfile*" | while read -r dockerfile; do
    echo -e "\nAnalyzing: $dockerfile" >> "$docker_report"
    
    # Check for common security issues
    if grep -q "USER" "$dockerfile"; then
        echo "✅ Non-root user configured" >> "$docker_report"
    else
        echo "⚠️  WARNING: No USER instruction - runs as root" >> "$docker_report"
    fi
    
    if grep -q "HEALTHCHECK" "$dockerfile"; then
        echo "✅ Health check configured" >> "$docker_report"
    else
        echo "⚠️  WARNING: No HEALTHCHECK instruction" >> "$docker_report"
    fi
    
    if grep -q "latest" "$dockerfile"; then
        echo "⚠️  WARNING: Using 'latest' tag - pin versions instead" >> "$docker_report"
    fi
    
    # Hadolint if available
    if command -v hadolint >/dev/null 2>&1; then
        echo "\nHadolint results:" >> "$docker_report"
        hadolint "$dockerfile" >> "$docker_report" 2>&1 || true
    fi
done

# Container scanning with Trivy
if command -v trivy >/dev/null 2>&1; then
    echo -e "\n${YELLOW}Running Trivy container scans...${NC}"
    trivy_report="$RESULTS_DIR/trivy-scan.log"
    echo "Trivy Container Scan Report" > "$trivy_report"
    echo "==========================" >> "$trivy_report"
    
    # Scan built images
    docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(test|template)" | while read -r image; do
        echo -e "\nScanning: $image" >> "$trivy_report"
        trivy image "$image" >> "$trivy_report" 2>&1 || true
    done
else
    echo -e "${RED}Trivy not installed - install with: brew install trivy${NC}"
fi

# OWASP dependency check for Node.js
echo -e "\n${YELLOW}Checking Node.js dependencies...${NC}"
npm_report="$RESULTS_DIR/npm-audit.log"
echo "NPM Security Audit Report" > "$npm_report"
echo "========================" >> "$npm_report"

find . -name "package.json" -not -path "*/node_modules/*" | while read -r package; do
    dir=$(dirname "$package")
    echo -e "\nAuditing: $dir" >> "$npm_report"
    cd "$dir" && npm audit --production >> "../../$npm_report" 2>&1 || true
    cd - > /dev/null
done

# Python security with safety
if command -v safety >/dev/null 2>&1; then
    echo -e "\n${YELLOW}Checking Python dependencies...${NC}"
    python_report="$RESULTS_DIR/python-safety.log"
    echo "Python Safety Check Report" > "$python_report"
    echo "=========================" >> "$python_report"
    
    find . -name "requirements*.txt" | while read -r req; do
        echo -e "\nChecking: $req" >> "$python_report"
        safety check -r "$req" >> "$python_report" 2>&1 || true
    done
fi

echo -e "\n${GREEN}Security testing complete${NC}"
echo "Results saved in $RESULTS_DIR/"

# Summary
echo -e "\n${YELLOW}Security Summary:${NC}"
if [ -s "$secrets_report" ]; then
    secret_count=$(grep -c "password\|secret\|key\|token" "$secrets_report" || true)
    if [ "$secret_count" -gt 0 ]; then
        echo -e "${RED}⚠️  Found potential secrets in code - review $secrets_report${NC}"
    else
        echo -e "${GREEN}✅ No obvious secrets found${NC}"
    fi
fi