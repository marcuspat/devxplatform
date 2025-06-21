#!/bin/bash

# Docker Build Verification Script
# Tests Docker builds across multiple DevX Platform templates

set -e

echo "🐳 Docker Build Verification for DevX Platform"
echo "================================================"

# Ensure Docker credential helpers are in PATH
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

# Function to test Docker build
test_docker_build() {
    local template_path=$1
    local image_name=$2
    
    echo ""
    echo "📦 Testing: $template_path"
    echo "Image: $image_name"
    
    if [ -f "$template_path/Dockerfile" ]; then
        echo "✅ Dockerfile found"
        
        # Check if build succeeds
        if docker build -t "$image_name" "$template_path" > /dev/null 2>&1; then
            echo "✅ Build successful"
            
            # Check if image was created
            if docker images "$image_name" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep -q "$image_name"; then
                echo "✅ Image created successfully"
                docker images "$image_name" --format "{{.Repository}}:{{.Tag}} - {{.Size}}"
            else
                echo "❌ Image not found after build"
                return 1
            fi
        else
            echo "❌ Build failed"
            return 1
        fi
    else
        echo "❌ No Dockerfile found"
        return 1
    fi
}

# Test templates
TEMPLATES=(
    "templates/rest-api:verify-rest-api"
    "templates/graphql-api:verify-graphql-api" 
    "templates/grpc-service:verify-grpc-service"
    "templates/python/fastapi:verify-fastapi"
    "templates/python/flask:verify-flask"
    "templates/go/gin:verify-gin"
    "templates/webapp-nextjs:verify-nextjs"
)

SUCCESS_COUNT=0
TOTAL_COUNT=${#TEMPLATES[@]}

for template_spec in "${TEMPLATES[@]}"; do
    IFS=':' read -r template_path image_name <<< "$template_spec"
    
    if test_docker_build "$template_path" "$image_name"; then
        ((SUCCESS_COUNT++))
    fi
done

echo ""
echo "================================================"
echo "🎯 Docker Build Summary"
echo "Success Rate: $SUCCESS_COUNT/$TOTAL_COUNT"

if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
    echo "🎉 All Docker builds successful!"
    echo "✅ Docker infrastructure is working correctly"
    exit 0
else
    echo "⚠️  Some builds failed"
    exit 1
fi