#!/bin/bash

# Novee Lead Generation Platform - Development Environment Setup
# This script sets up and runs the development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Novee Lead Generation Platform - Dev Setup          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check Node.js version
echo -e "${YELLOW}Checking Node.js version...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js version 18+ is required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# Check pnpm
echo -e "${YELLOW}Checking pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm not found. Installing pnpm...${NC}"
    npm install -g pnpm
fi
echo -e "${GREEN}✓ pnpm $(pnpm -v) detected${NC}"

# Install dependencies
echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"
pnpm install

# Setup environment files if not exist
echo ""
echo -e "${YELLOW}Checking environment configuration...${NC}"

if [ ! -f "apps/web/.env.local" ]; then
    if [ -f "apps/web/.env.example" ]; then
        cp apps/web/.env.example apps/web/.env.local
        echo -e "${YELLOW}Created apps/web/.env.local from example. Please update with your Supabase credentials.${NC}"
    else
        echo -e "${YELLOW}Creating apps/web/.env.local template...${NC}"
        cat > apps/web/.env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google OAuth (optional for development)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
        echo -e "${YELLOW}⚠ Please update apps/web/.env.local with your Supabase credentials${NC}"
    fi
fi

if [ ! -f "apps/desktop/.env" ]; then
    echo -e "${YELLOW}Creating apps/desktop/.env template...${NC}"
    cat > apps/desktop/.env << 'EOF'
# Supabase Configuration (same as web app)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Desktop App Settings
PLAYWRIGHT_CACHE_DIR=./playwright-cache
EOF
    echo -e "${YELLOW}⚠ Please update apps/desktop/.env with your Supabase credentials${NC}"
fi

# Build shared packages
echo ""
echo -e "${YELLOW}Building shared packages...${NC}"
pnpm --filter @novee/shared build 2>/dev/null || echo -e "${YELLOW}Shared package will be built on first run${NC}"

# Start development servers
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                 Development Environment                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Starting development servers...${NC}"
echo ""
echo -e "  ${GREEN}Web App:${NC}     http://localhost:3000"
echo -e "  ${GREEN}Desktop App:${NC} Run 'pnpm --filter @novee/desktop dev' in another terminal"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the servers${NC}"
echo ""

# Run web app dev server
pnpm --filter @novee/web dev
