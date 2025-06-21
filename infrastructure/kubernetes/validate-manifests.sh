#!/bin/bash
set -e

echo "Validating Kubernetes manifests..."
echo "================================"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "kubectl command not found. Please install kubectl to validate manifests."
    exit 1
fi

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counter for errors
ERROR_COUNT=0

# Function to validate a YAML file
validate_yaml() {
    local file=$1
    echo -n "Validating $file... "
    
    if kubectl apply --dry-run=client --validate=false -f "$file" &> /tmp/kubectl-validate.log; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        echo "Error details:"
        cat /tmp/kubectl-validate.log
        echo ""
        ((ERROR_COUNT++))
    fi
}

# Validate all component files
echo "Validating Components:"
echo "---------------------"
for file in components/*/*.yaml; do
    if [ -f "$file" ]; then
        validate_yaml "$file"
    fi
done

echo ""
echo "Validating Base Resources:"
echo "-------------------------"
for file in base/api-service/*.yaml; do
    if [ -f "$file" ]; then
        validate_yaml "$file"
    fi
done

echo ""
echo "Validating Overlays:"
echo "-------------------"

# Validate development overlay
echo "Development overlay:"
if command -v kustomize &> /dev/null; then
    echo -n "Building development overlay... "
    if kustomize build overlays/development > /tmp/dev-manifest.yaml 2> /tmp/kustomize-dev.log; then
        echo -e "${GREEN}OK${NC}"
        validate_yaml "/tmp/dev-manifest.yaml"
    else
        echo -e "${RED}FAILED${NC}"
        echo "Error details:"
        cat /tmp/kustomize-dev.log
        ((ERROR_COUNT++))
    fi
else
    echo "kustomize not found, using kubectl..."
    echo -n "Building development overlay with kubectl... "
    if kubectl kustomize overlays/development > /tmp/dev-manifest.yaml 2> /tmp/kubectl-dev.log; then
        echo -e "${GREEN}OK${NC}"
        validate_yaml "/tmp/dev-manifest.yaml"
    else
        echo -e "${RED}FAILED${NC}"
        echo "Error details:"
        cat /tmp/kubectl-dev.log
        ((ERROR_COUNT++))
    fi
fi

echo ""
echo "Production overlay:"
if command -v kustomize &> /dev/null; then
    echo -n "Building production overlay... "
    if kustomize build overlays/production > /tmp/prod-manifest.yaml 2> /tmp/kustomize-prod.log; then
        echo -e "${GREEN}OK${NC}"
        validate_yaml "/tmp/prod-manifest.yaml"
    else
        echo -e "${RED}FAILED${NC}"
        echo "Error details:"
        cat /tmp/kustomize-prod.log
        ((ERROR_COUNT++))
    fi
else
    echo "kustomize not found, using kubectl..."
    echo -n "Building production overlay with kubectl... "
    if kubectl kustomize overlays/production > /tmp/prod-manifest.yaml 2> /tmp/kubectl-prod.log; then
        echo -e "${GREEN}OK${NC}"
        validate_yaml "/tmp/prod-manifest.yaml"
    else
        echo -e "${RED}FAILED${NC}"
        echo "Error details:"
        cat /tmp/kubectl-prod.log
        ((ERROR_COUNT++))
    fi
fi

echo ""
echo "================================"
if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}All manifests validated successfully!${NC}"
    exit 0
else
    echo -e "${RED}Found $ERROR_COUNT errors during validation.${NC}"
    exit 1
fi