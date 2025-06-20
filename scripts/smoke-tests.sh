#!/bin/bash
# Smoke tests for deployment verification

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-http://localhost:8080}"
TIMEOUT="${2:-30}"
RETRY_INTERVAL="${3:-5}"

echo "Running smoke tests against: $BASE_URL"
echo "Timeout: ${TIMEOUT}s, Retry interval: ${RETRY_INTERVAL}s"
echo "========================================"

# Function to check endpoint
check_endpoint() {
    local endpoint="$1"
    local expected_status="$2"
    local description="$3"
    
    echo -n "Testing $description... "
    
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL$endpoint")
    
    if [ "$response_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response_code)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: HTTP $expected_status, Got: HTTP $response_code)"
        return 1
    fi
}

# Function to check response time
check_response_time() {
    local endpoint="$1"
    local max_time="$2"
    local description="$3"
    
    echo -n "Testing response time for $description... "
    
    local response_time
    response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$BASE_URL$endpoint")
    response_time_ms=$(echo "$response_time * 1000" | bc | cut -d. -f1)
    
    if [ "$response_time_ms" -lt "$max_time" ]; then
        echo -e "${GREEN}✓ PASS${NC} (${response_time_ms}ms < ${max_time}ms)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (${response_time_ms}ms > ${max_time}ms)"
        return 1
    fi
}

# Function to check JSON response
check_json_response() {
    local endpoint="$1"
    local json_path="$2"
    local expected_value="$3"
    local description="$4"
    
    echo -n "Testing JSON response for $description... "
    
    local actual_value
    actual_value=$(curl -s "$BASE_URL$endpoint" | jq -r "$json_path" 2>/dev/null || echo "PARSE_ERROR")
    
    if [ "$actual_value" = "$expected_value" ]; then
        echo -e "${GREEN}✓ PASS${NC} ($json_path = $expected_value)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_value, Got: $actual_value)"
        return 1
    fi
}

# Wait for service to be ready
echo "Waiting for service to be ready..."
elapsed=0
while [ $elapsed -lt $TIMEOUT ]; do
    if curl -s -o /dev/null --max-time 5 "$BASE_URL/health"; then
        echo -e "${GREEN}Service is ready!${NC}"
        break
    fi
    echo "Service not ready yet, retrying in ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
    elapsed=$((elapsed + RETRY_INTERVAL))
done

if [ $elapsed -ge $TIMEOUT ]; then
    echo -e "${RED}Service failed to become ready within ${TIMEOUT}s${NC}"
    exit 1
fi

# Run tests
echo ""
echo "Running smoke tests..."
echo "===================="

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

# Health check endpoint
if check_endpoint "/health" 200 "Health check endpoint"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Readiness check endpoint
if check_endpoint "/ready" 200 "Readiness check endpoint"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# API endpoints
if check_endpoint "/api/v1/status" 200 "API status endpoint"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Check 404 handling
if check_endpoint "/non-existent-endpoint" 404 "404 error handling"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Performance checks
if check_response_time "/health" 100 "Health endpoint response time"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

if check_response_time "/api/v1/status" 500 "API endpoint response time"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# JSON response checks
if check_json_response "/api/v1/status" ".status" "ok" "API status response"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

if check_json_response "/health" ".healthy" "true" "Health status response"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Metrics endpoint
if check_endpoint "/metrics" 200 "Prometheus metrics endpoint"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# OpenAPI documentation
if check_endpoint "/api-docs" 200 "OpenAPI documentation"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Security headers check
echo -n "Testing security headers... "
security_headers=$(curl -s -I "$BASE_URL/health")
if echo "$security_headers" | grep -q "X-Content-Type-Options: nosniff" && \
   echo "$security_headers" | grep -q "X-Frame-Options: DENY" && \
   echo "$security_headers" | grep -q "X-XSS-Protection: 1; mode=block"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Missing security headers)"
    ((TESTS_FAILED++))
fi

# Summary
echo ""
echo "===================="
echo "Smoke Test Summary"
echo "===================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All smoke tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some smoke tests failed!${NC}"
    exit 1
fi