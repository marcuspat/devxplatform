#!/bin/bash

# Test all Go templates

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_go_template() {
    local template_name=$1
    local template_path=$2
    
    echo -e "\n${YELLOW}Testing $template_name...${NC}"
    
    cd "$template_path" || return 1
    
    # Download dependencies
    echo "Downloading dependencies..."
    go mod download
    
    # Build
    echo "Building..."
    go build ./... || echo -e "${RED}Build failed${NC}"
    
    # Run tests
    echo "Running tests..."
    go test ./... -v || echo -e "${RED}Tests failed${NC}"
    
    # Run tests with race detector
    echo "Running tests with race detector..."
    go test -race ./... || echo -e "${RED}Race conditions detected${NC}"
    
    # Lint (if golangci-lint is installed)
    if command -v golangci-lint >/dev/null 2>&1; then
        echo "Running linter..."
        golangci-lint run || echo -e "${RED}Linting failed${NC}"
    fi
    
    # Verify dependencies
    echo "Verifying dependencies..."
    go mod verify || echo -e "${RED}Dependency verification failed${NC}"
    
    # Docker build if Dockerfile exists
    if [ -f "Dockerfile" ] && command -v docker >/dev/null 2>&1; then
        echo "Building Docker image..."
        docker build -t "$template_name-test" . || echo -e "${RED}Docker build failed${NC}"
    fi
    
    cd - > /dev/null
}

# Test each Go template
test_go_template "gin" "templates/go/gin"

# Check for other Go templates
if [ -d "templates/go/grpc" ] && [ "$(ls -A templates/go/grpc)" ]; then
    test_go_template "grpc" "templates/go/grpc"
fi

if [ -d "templates/go/worker" ] && [ "$(ls -A templates/go/worker)" ]; then
    test_go_template "worker" "templates/go/worker"
fi

echo -e "\n${GREEN}Go template testing complete${NC}"