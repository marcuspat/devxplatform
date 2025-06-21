#!/bin/bash
set -e

echo "Validating Kubernetes YAML manifests..."
echo "======================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Counter for errors
ERROR_COUNT=0
WARNING_COUNT=0

# Function to check YAML syntax
check_yaml() {
    local file=$1
    echo -n "Checking $file... "
    
    # Check if file exists
    if [ ! -f "$file" ]; then
        echo -e "${RED}FILE NOT FOUND${NC}"
        ((ERROR_COUNT++))
        return
    fi
    
    # Check YAML syntax using python
    if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2> /tmp/yaml-error.log; then
        # Check for required Kubernetes fields
        if grep -q "apiVersion:" "$file" && grep -q "kind:" "$file" && grep -q "metadata:" "$file"; then
            echo -e "${GREEN}OK${NC}"
        else
            echo -e "${YELLOW}WARNING: Missing required Kubernetes fields${NC}"
            ((WARNING_COUNT++))
        fi
    else
        echo -e "${RED}INVALID YAML${NC}"
        echo "Error details:"
        cat /tmp/yaml-error.log
        ((ERROR_COUNT++))
    fi
}

# Check Python and PyYAML availability
if ! command -v python3 &> /dev/null; then
    echo "Python3 not found. Installing validation tools..."
    exit 1
fi

if ! python3 -c "import yaml" 2> /dev/null; then
    echo "PyYAML not found. Please install it with: pip3 install pyyaml"
    exit 1
fi

echo "Checking Components:"
echo "-------------------"
for file in components/*/*.yaml; do
    if [ -f "$file" ]; then
        check_yaml "$file"
    fi
done

echo ""
echo "Checking Base Resources:"
echo "-----------------------"
for file in base/api-service/*.yaml; do
    if [ -f "$file" ]; then
        check_yaml "$file"
    fi
done

echo ""
echo "Checking Overlay Patches:"
echo "------------------------"
for file in overlays/*/*.yaml; do
    if [ -f "$file" ]; then
        check_yaml "$file"
    fi
done

echo ""
echo "Checking Kustomization Files:"
echo "----------------------------"

# Special validation for kustomization.yaml files
for kustomization in $(find . -name "kustomization.yaml" -type f); do
    echo -n "Checking $kustomization... "
    
    if python3 -c "
import yaml
with open('$kustomization') as f:
    data = yaml.safe_load(f)
    # Check for required fields
    if 'apiVersion' in data and 'kind' in data:
        if data['kind'] == 'Kustomization':
            print('valid')
        else:
            print('invalid: wrong kind')
            exit(1)
    else:
        print('invalid: missing required fields')
        exit(1)
" 2> /tmp/kustomize-error.log | grep -q "valid"; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}INVALID${NC}"
        if [ -s /tmp/kustomize-error.log ]; then
            cat /tmp/kustomize-error.log
        fi
        ((ERROR_COUNT++))
    fi
done

echo ""
echo "======================================="
echo "Summary:"
echo "--------"
if [ $ERROR_COUNT -eq 0 ] && [ $WARNING_COUNT -eq 0 ]; then
    echo -e "${GREEN}All YAML files are valid!${NC}"
    exit 0
elif [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${YELLOW}Found $WARNING_COUNT warnings but no errors.${NC}"
    exit 0
else
    echo -e "${RED}Found $ERROR_COUNT errors and $WARNING_COUNT warnings.${NC}"
    exit 1
fi