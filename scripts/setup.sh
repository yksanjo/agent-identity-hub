#!/bin/bash

set -e

echo "🤖 Agent Identity Hub Setup"
echo "============================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Installing backend dependencies...${NC}"
npm install

echo -e "${BLUE}Step 2: Installing dashboard dependencies...${NC}"
cd dashboard
npm install
cd ..

echo -e "${BLUE}Step 3: Setting up environment...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}Created .env file from .env.example${NC}"
    echo -e "${YELLOW}Please edit .env with your configuration${NC}"
else
    echo -e "${GREEN}.env file already exists${NC}"
fi

echo -e "${BLUE}Step 4: Starting PostgreSQL...${NC}"
if docker ps | grep -q agent-identity-db; then
    echo -e "${GREEN}PostgreSQL is already running${NC}"
elif docker ps -a | grep -q agent-identity-db; then
    echo -e "${BLUE}Starting existing PostgreSQL container...${NC}"
    docker start agent-identity-db
else
    echo -e "${BLUE}Creating PostgreSQL container...${NC}"
    docker run -d \
        --name agent-identity-db \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=agent_identity_hub \
        -p 5432:5432 \
        postgres:15-alpine
fi

echo -e "${BLUE}Step 5: Waiting for database to be ready...${NC}"
sleep 3

echo -e "${BLUE}Step 6: Building the project...${NC}"
npm run build

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run database migrations: npm run db:migrate"
echo "3. Start the API server: npm run dev"
echo "4. Start the dashboard: cd dashboard && npm start"
echo ""
echo "Or use Docker Compose:"
echo "  docker-compose up -d"
