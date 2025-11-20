#!/bin/bash

# Health Check Script for SIPREMS
# Tests all critical components

set -e

BASE_URL=${1:-http://localhost}
TIMEOUT=5

echo "╔════════════════════════════════════════════════════════╗"
echo "║   SIPREMS Health Check                                ║"
echo "╚════════════════════════════════════════════════════════╝"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

check_endpoint() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Checking $name... "
    
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "$BASE_URL$url" 2>/dev/null || echo "000")
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $http_code)"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code, expected $expected_status)"
        return 1
    fi
}

# Test basic health
echo -e "\n${YELLOW}Basic Health Checks:${NC}"
check_endpoint "Basic Health" "/health" "200" || true

# Test readiness
echo -e "\n${YELLOW}Readiness Checks:${NC}"
check_endpoint "Readiness Check" "/ready" "200" || true

# Test metrics
echo -e "\n${YELLOW}Metrics & Monitoring:${NC}"
check_endpoint "Metrics Endpoint" "/metrics" "200" || true
check_endpoint "Cache Stats" "/cache-stats" "200" || true

# Test API endpoints
echo -e "\n${YELLOW}API Endpoints (Requires Auth):${NC}"
check_endpoint "Products API" "/api/products" "401" || true
check_endpoint "System Status" "/api/system/settings/status" "200" || true

# Test Nginx
echo -e "\n${YELLOW}Load Balancer (Nginx):${NC}"
if command -v nc &> /dev/null; then
    nc -zv localhost 80 2>/dev/null && echo -e "${GREEN}✓${NC} Nginx listening on port 80" || echo -e "${RED}✗${NC} Nginx not responding"
else
    echo -e "${YELLOW}!${NC} netcat not available, skipping port check"
fi

# Test individual backend instances
echo -e "\n${YELLOW}Backend Instances:${NC}"
for i in 1 2; do
    port=$((5000 + i))
    echo -n "Checking backend_$i (port $port)... "
    if curl -s -o /dev/null -w "" --connect-timeout 2 "http://localhost:$port/health" 2>/dev/null; then
        echo -e "${GREEN}✓ Running${NC}"
    else
        echo -e "${YELLOW}! Not running${NC}"
    fi
done

# Test databases
echo -e "\n${YELLOW}Database Services:${NC}"
if command -v psql &> /dev/null; then
    echo -n "PostgreSQL... "
    if psql -h localhost -U postgres -c "SELECT version();" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Connected${NC}"
    else
        echo -e "${YELLOW}! Not available${NC}"
    fi
else
    echo -e "${YELLOW}! psql not available${NC}"
fi

if command -v redis-cli &> /dev/null; then
    echo -n "Redis... "
    if redis-cli -h localhost ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Connected${NC}"
    else
        echo -e "${YELLOW}! Not available${NC}"
    fi
else
    echo -e "${YELLOW}! redis-cli not available${NC}"
fi

# Test pgBouncer
if command -v psql &> /dev/null; then
    echo -n "pgBouncer... "
    if psql -h localhost -p 6432 -U postgres -d siprems_db -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Connected${NC}"
    else
        echo -e "${YELLOW}! Not available${NC}"
    fi
fi

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Health Check Complete                               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${YELLOW}To view detailed metrics:${NC}"
echo "  curl http://localhost/metrics | jq '.'"

echo -e "\n${YELLOW}To view cache stats:${NC}"
echo "  curl http://localhost/cache-stats | jq '.'"

echo -e "\n${YELLOW}To monitor logs:${NC}"
echo "  docker-compose logs -f [service_name]"
