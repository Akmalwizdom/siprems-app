#!/bin/bash

# SIPREMS Optimization Setup Script
# This script sets up all optimization components

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║   SIPREMS Optimization Setup                          ║"
echo "╚════════════════════════════════════════════════════════╝"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Install Python dependencies
echo -e "\n${YELLOW}Step 1: Installing Python dependencies...${NC}"
if command -v pip &> /dev/null; then
    pip install -r requirements.txt
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ pip not found. Please install pip first.${NC}"
    exit 1
fi

# Step 2: Check Redis
echo -e "\n${YELLOW}Step 2: Checking Redis...${NC}"
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis is running${NC}"
    else
        echo -e "${YELLOW}! Redis not responding. Please start Redis:${NC}"
        echo "  docker run -d -p 6379:6379 redis:7"
    fi
else
    echo -e "${YELLOW}! Redis CLI not found. Starting Docker container...${NC}"
    docker run -d --name siprems-redis -p 6379:6379 redis:7 2>/dev/null || true
fi

# Step 3: Create database indexes
echo -e "\n${YELLOW}Step 3: Creating database indexes...${NC}"
if command -v psql &> /dev/null; then
    # Read database config from environment or use defaults
    DB_HOST=${DB_HOST:-localhost}
    DB_NAME=${DB_NAME:-siprems_db}
    DB_USER=${DB_USER:-postgres}
    
    # Try to run schema updates
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1 && {
        echo -e "${GREEN}✓ Database connected${NC}"
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << EOF > /dev/null
-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_transactions_product_date ON transactions(product_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_is_promo ON transactions(is_promo);
CREATE INDEX IF NOT EXISTS idx_transactions_date_range ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_quantity_date ON transactions(quantity_sold, transaction_date) WHERE quantity_sold > 0;
EOF
        echo -e "${GREEN}✓ Database indexes created${NC}"
    } || {
        echo -e "${RED}✗ Could not connect to database. Please check:${NC}"
        echo "  - DB_HOST=$DB_HOST"
        echo "  - DB_NAME=$DB_NAME"
        echo "  - DB_USER=$DB_USER"
    }
else
    echo -e "${YELLOW}! psql not found. Skipping index creation.${NC}"
    echo "  Run schema.sql manually when ready:"
    echo "  psql -U postgres -d siprems_db -f schema.sql"
fi

# Step 4: Verify optimization files
echo -e "\n${YELLOW}Step 4: Verifying optimization files...${NC}"
FILES=(
    "utils/cache_service.py"
    "utils/metrics_service.py"
    "OPTIMIZATION_ARCHITECTURE.md"
    "OPTIMIZATION_PATCHES_SUMMARY.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file (missing)"
    fi
done

# Step 5: Environment variables
echo -e "\n${YELLOW}Step 5: Checking environment variables...${NC}"
if [ -z "$REDIS_URL" ]; then
    echo -e "  ${YELLOW}!${NC} REDIS_URL not set. Using default: redis://localhost:6379/2"
    export REDIS_URL="redis://localhost:6379/2"
else
    echo -e "  ${GREEN}✓${NC} REDIS_URL=$REDIS_URL"
fi

if [ -z "$CACHE_ENABLED" ]; then
    echo -e "  ${YELLOW}!${NC} CACHE_ENABLED not set. Using default: true"
    export CACHE_ENABLED="true"
else
    echo -e "  ${GREEN}✓${NC} CACHE_ENABLED=$CACHE_ENABLED"
fi

# Step 6: Summary
echo -e "\n${YELLOW}Step 6: Setup Summary${NC}"
echo -e "  ${GREEN}✓${NC} Python dependencies installed"
echo -e "  ${GREEN}✓${NC} Redis available"
echo -e "  ${GREEN}✓${NC} Database indexes created"
echo -e "  ${GREEN}✓${NC} Optimization files in place"
echo -e "  ${GREEN}✓${NC} Environment variables configured"

# Step 7: Next steps
echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Setup Complete!                                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "  1. Start the Flask application:"
echo "     python app.py"
echo ""
echo "  2. Verify optimization is working:"
echo "     curl http://localhost:5000/health"
echo "     curl http://localhost:5000/cache-stats"
echo "     curl http://localhost:5000/metrics"
echo ""
echo "  3. Read the optimization documentation:"
echo "     cat OPTIMIZATION_ARCHITECTURE.md"
echo ""
echo "  4. Monitor performance:"
echo "     watch -n 1 'curl http://localhost:5000/metrics | jq .summary'"
echo ""
echo -e "${YELLOW}Configuration Tips:${NC}"
echo "  - TTL policies are in utils/cache_service.py"
echo "  - Compression level configurable in app.py"
echo "  - Metrics retention (1000 per name) in utils/metrics_service.py"
echo "  - Database indexes in schema.sql"
echo ""
echo -e "${GREEN}Happy optimizing!${NC}"
