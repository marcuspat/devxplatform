#!/bin/bash

# Health check script for DevX Platform services

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "DevX Platform Health Check"
echo "=========================="
echo ""

# Function to check service health
check_service() {
    local service_name=$1
    local url=$2
    
    if curl -s -f "$url" > /dev/null; then
        echo -e "${GREEN}[✓]${NC} $service_name is healthy"
        return 0
    else
        echo -e "${RED}[✗]${NC} $service_name is unhealthy"
        return 1
    fi
}

# Check each service
check_service "Portal UI" "http://localhost:3000/api/health"
check_service "API Backend" "http://localhost:3001/health"
check_service "Nginx Proxy" "http://localhost/health"

# Check database connection
if docker-compose exec -T postgres pg_isready -U devx -d devxplatform &> /dev/null; then
    echo -e "${GREEN}[✓]${NC} PostgreSQL is healthy"
else
    echo -e "${RED}[✗]${NC} PostgreSQL is unhealthy"
fi

# Check Redis
if docker-compose exec -T redis redis-cli --raw ping &> /dev/null; then
    echo -e "${GREEN}[✓]${NC} Redis is healthy"
else
    echo -e "${RED}[✗]${NC} Redis is unhealthy"
fi

echo ""
echo "Container Status:"
docker-compose ps

echo ""
echo "For detailed logs, run: docker-compose logs -f [service-name]"