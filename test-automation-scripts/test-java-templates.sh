#!/bin/bash

# Test all Java templates

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_java_template() {
    local template_name=$1
    local template_path=$2
    
    echo -e "\n${YELLOW}Testing $template_name...${NC}"
    
    cd "$template_path" || return 1
    
    # Check if Maven is available
    if command -v mvn >/dev/null 2>&1; then
        # Clean and install
        echo "Building with Maven..."
        mvn clean install || echo -e "${RED}Maven build failed${NC}"
        
        # Run tests
        echo "Running tests..."
        mvn test || echo -e "${RED}Tests failed${NC}"
        
        # Generate coverage report
        if grep -q jacoco pom.xml; then
            echo "Generating coverage report..."
            mvn jacoco:report || true
        fi
        
        # Run SpotBugs
        if grep -q spotbugs pom.xml; then
            echo "Running SpotBugs..."
            mvn spotbugs:check || echo -e "${RED}SpotBugs found issues${NC}"
        fi
        
        # OWASP dependency check
        if grep -q dependency-check pom.xml; then
            echo "Running OWASP dependency check..."
            mvn dependency-check:check || echo -e "${RED}Security vulnerabilities found${NC}"
        fi
    elif command -v gradle >/dev/null 2>&1 && [ -f "build.gradle" ]; then
        # Gradle build
        echo "Building with Gradle..."
        ./gradlew clean build || echo -e "${RED}Gradle build failed${NC}"
        
        # Run tests
        echo "Running tests..."
        ./gradlew test || echo -e "${RED}Tests failed${NC}"
    else
        echo -e "${RED}No build tool found (Maven or Gradle)${NC}"
    fi
    
    # Docker build if Dockerfile exists
    if [ -f "Dockerfile" ] && command -v docker >/dev/null 2>&1; then
        echo "Building Docker image..."
        docker build -t "$template_name-test" . || echo -e "${RED}Docker build failed${NC}"
    fi
    
    cd - > /dev/null
}

# Test each Java template
test_java_template "springboot" "templates/java/springboot"

# Check for other Java templates
if [ -d "templates/java/springcloud" ] && [ "$(ls -A templates/java/springcloud)" ]; then
    test_java_template "springcloud" "templates/java/springcloud"
fi

echo -e "\n${GREEN}Java template testing complete${NC}"