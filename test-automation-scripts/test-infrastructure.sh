#!/bin/bash

# Test infrastructure components (K8s, Helm, Terraform)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

RESULTS_DIR="test-results/infrastructure"
mkdir -p "$RESULTS_DIR"

# Test Kubernetes manifests
echo -e "\n${YELLOW}Testing Kubernetes manifests...${NC}"
if command -v kubectl >/dev/null 2>&1; then
    k8s_results="$RESULTS_DIR/k8s-validation.log"
    echo "Kubernetes Manifest Validation Results" > "$k8s_results"
    echo "====================================" >> "$k8s_results"
    
    find . -name "*.yaml" -o -name "*.yml" | grep -E "(k8s|kubernetes|deploy)" | while read -r file; do
        echo -e "\nValidating: $file" >> "$k8s_results"
        if kubectl apply --dry-run=client -f "$file" >> "$k8s_results" 2>&1; then
            echo -e "${GREEN}✅ Valid: $file${NC}"
        else
            echo -e "${RED}❌ Invalid: $file${NC}"
        fi
    done
else
    echo -e "${RED}kubectl not installed - skipping K8s validation${NC}"
fi

# Test Helm charts
echo -e "\n${YELLOW}Testing Helm charts...${NC}"
if command -v helm >/dev/null 2>&1; then
    helm_results="$RESULTS_DIR/helm-validation.log"
    echo "Helm Chart Validation Results" > "$helm_results"
    echo "============================" >> "$helm_results"
    
    find . -name "Chart.yaml" | while read -r chart; do
        chart_dir=$(dirname "$chart")
        echo -e "\nValidating: $chart_dir" >> "$helm_results"
        
        # Lint the chart
        if helm lint "$chart_dir" >> "$helm_results" 2>&1; then
            echo -e "${GREEN}✅ Valid: $chart_dir${NC}"
            
            # Template the chart
            helm template "$chart_dir" >> "$helm_results" 2>&1
        else
            echo -e "${RED}❌ Invalid: $chart_dir${NC}"
        fi
    done
else
    echo -e "${RED}helm not installed - skipping Helm validation${NC}"
fi

# Test Terraform modules
echo -e "\n${YELLOW}Testing Terraform modules...${NC}"
if command -v terraform >/dev/null 2>&1; then
    tf_results="$RESULTS_DIR/terraform-validation.log"
    echo "Terraform Module Validation Results" > "$tf_results"
    echo "==================================" >> "$tf_results"
    
    find . -name "*.tf" -exec dirname {} \; | sort -u | while read -r tf_dir; do
        echo -e "\nValidating: $tf_dir" >> "$tf_results"
        
        cd "$tf_dir" || continue
        
        # Initialize
        if terraform init -backend=false >> "../../$tf_results" 2>&1; then
            # Validate
            if terraform validate >> "../../$tf_results" 2>&1; then
                echo -e "${GREEN}✅ Valid: $tf_dir${NC}"
                
                # Plan (dry run)
                terraform plan -input=false >> "../../$tf_results" 2>&1 || true
            else
                echo -e "${RED}❌ Invalid: $tf_dir${NC}"
            fi
        else
            echo -e "${RED}❌ Init failed: $tf_dir${NC}"
        fi
        
        cd - > /dev/null
    done
else
    echo -e "${RED}terraform not installed - skipping Terraform validation${NC}"
fi

echo -e "\n${GREEN}Infrastructure testing complete${NC}"
echo "Results saved in $RESULTS_DIR/"