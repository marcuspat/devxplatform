#!/bin/bash
set -e

echo "Basic validation of Kubernetes manifests..."
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counter for errors
ERROR_COUNT=0
FILE_COUNT=0

# Function to check YAML file
check_file() {
    local file=$1
    echo -n "Checking $file... "
    
    # Check if file exists
    if [ ! -f "$file" ]; then
        echo -e "${RED}FILE NOT FOUND${NC}"
        ((ERROR_COUNT++))
        return
    fi
    
    # Basic checks
    if grep -q "apiVersion:" "$file" && \
       grep -q "kind:" "$file" && \
       grep -q "metadata:" "$file"; then
        echo -e "${GREEN}OK${NC}"
        ((FILE_COUNT++))
    else
        echo -e "${RED}Missing required fields${NC}"
        ((ERROR_COUNT++))
    fi
}

echo "Checking Components:"
echo "-------------------"
for file in components/*/*.yaml; do
    if [ -f "$file" ]; then
        check_file "$file"
    fi
done

echo ""
echo "Checking Base Resources:"
echo "-----------------------"
for file in base/api-service/*.yaml; do
    if [ -f "$file" ]; then
        check_file "$file"
    fi
done

echo ""
echo "Checking Overlays:"
echo "-----------------"
for file in overlays/*/*.yaml; do
    if [ -f "$file" ]; then
        check_file "$file"
    fi
done

echo ""
echo "=========================================="
echo "Summary: Checked $((FILE_COUNT + ERROR_COUNT)) files"
if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}All files have required Kubernetes fields!${NC}"
    
    echo ""
    echo "File Structure:"
    echo "--------------"
    echo "Components:"
    ls -la components/*/*.yaml 2>/dev/null | grep -v "^total" || true
    echo ""
    echo "Overlays:"
    ls -la overlays/*/*.yaml 2>/dev/null | grep -v "^total" || true
    
    exit 0
else
    echo -e "${RED}Found $ERROR_COUNT files with issues.${NC}"
    exit 1
fi