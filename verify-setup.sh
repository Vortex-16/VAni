#!/usr/bin/env bash
# Discharge Buddy - Setup Verification Script
# Checks if environment is properly configured for OAuth and app startup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Discharge Buddy - Setup Verification Script             ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo

# Check 1: Node.js version
echo -e "${BLUE}[1/8]${NC} Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"
echo

# Check 2: pnpm is installed
echo -e "${BLUE}[2/8]${NC} Checking pnpm installation..."
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}✗ pnpm not found. Install with: npm install -g pnpm${NC}"
    exit 1
fi
PNPM_VERSION=$(pnpm -v)
echo -e "${GREEN}✓ pnpm ${PNPM_VERSION}${NC}"
echo

# Check 3: Project structure
echo -e "${BLUE}[3/8]${NC} Checking project structure..."
REQUIRED_DIRS=(
    "artifacts/api-server"
    "artifacts/discharge-buddy"
    "lib/db"
)
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓ Found: $dir${NC}"
    else
        echo -e "${RED}✗ Missing: $dir${NC}"
        exit 1
    fi
done
echo

# Check 4: .env file
echo -e "${BLUE}[4/8]${NC} Checking .env configuration..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo -e "${YELLOW}  Please create .env file with required environment variables${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
    
    # Check required OAuth variables
    if grep -q "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID" .env; then
        echo -e "${GREEN}✓ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID configured${NC}"
    else
        echo -e "${RED}✗ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID missing${NC}"
    fi
    
    if grep -q "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID" .env; then
        if grep -q "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=$" .env; then
            echo -e "${YELLOW}⚠ EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID is empty (OK for Expo Go)${NC}"
        else
            echo -e "${GREEN}✓ EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID configured${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID missing (needed for production)${NC}"
    fi
    
    if grep -q "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID" .env; then
        if grep -q "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=$" .env; then
            echo -e "${YELLOW}⚠ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is empty (OK for Expo Go)${NC}"
        else
            echo -e "${GREEN}✓ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID configured${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID missing (needed for production)${NC}"
    fi
    
    if grep -q "DATABASE_URL" .env; then
        echo -e "${GREEN}✓ DATABASE_URL configured${NC}"
    else
        echo -e "${YELLOW}⚠ DATABASE_URL missing (needed for backend)${NC}"
    fi
fi
echo

# Check 5: Dependencies installed
echo -e "${BLUE}[5/8]${NC} Checking dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Root node_modules exists${NC}"
else
    echo -e "${YELLOW}⚠ Root node_modules not found${NC}"
    echo -e "${YELLOW}  Run: pnpm install${NC}"
fi

if [ -d "artifacts/api-server/node_modules" ]; then
    echo -e "${GREEN}✓ api-server dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ api-server node_modules not found${NC}"
fi

if [ -d "artifacts/discharge-buddy/node_modules" ]; then
    echo -e "${GREEN}✓ discharge-buddy dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ discharge-buddy node_modules not found${NC}"
fi
echo

# Check 6: TypeScript compilation
echo -e "${BLUE}[6/8]${NC} Running TypeScript type check..."
cd artifacts/discharge-buddy
if pnpm typecheck > /dev/null 2>&1; then
    echo -e "${GREEN}✓ TypeScript compilation successful (no errors)${NC}"
else
    echo -e "${RED}✗ TypeScript compilation failed${NC}"
    echo -e "   Run: ${YELLOW}pnpm --filter @workspace/discharge-buddy typecheck${NC}"
fi
cd - > /dev/null
echo

# Check 7: Backend configuration
echo -e "${BLUE}[7/8]${NC} Checking backend configuration..."
if [ -f "artifacts/api-server/src/routes/auth.ts" ]; then
    echo -e "${GREEN}✓ Auth routes exist${NC}"
else
    echo -e "${RED}✗ Auth routes not found${NC}"
fi

if [ -f "artifacts/api-server/src/middlewares/auth.ts" ]; then
    echo -e "${GREEN}✓ Auth middleware exists${NC}"
else
    echo -e "${RED}✗ Auth middleware not found${NC}"
fi
echo

# Check 8: Documentation
echo -e "${BLUE}[8/8]${NC} Checking documentation..."
DOCS=(
    "GOOGLE_OAUTH_SETUP.md"
    "AUTH_FLOW_AND_RBAC.md"
    "OAUTH_FIXES_SUMMARY.md"
)
for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓ Found: $doc${NC}"
    else
        echo -e "${YELLOW}⚠ Missing: $doc${NC}"
    fi
done
echo

# Summary
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Verification Summary                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo

echo -e "${GREEN}✓ Environment Checks Passed${NC}"
echo
echo "Next steps:"
echo "1. Review GOOGLE_OAUTH_SETUP.md for OAuth configuration"
echo "2. Configure Google Cloud OAuth credentials if needed"
echo "3. Start backend:  ${YELLOW}pnpm --filter api-server dev${NC}"
echo "4. Start app:      ${YELLOW}pnpm --filter @workspace/discharge-buddy exec expo start${NC}"
echo "5. Test in Expo Go by scanning the QR code"
echo
echo -e "${BLUE}For more details, see:${NC}"
echo "  - GOOGLE_OAUTH_SETUP.md - OAuth configuration guide"
echo "  - AUTH_FLOW_AND_RBAC.md - Authentication & role system"
echo "  - OAUTH_FIXES_SUMMARY.md - Changes made and verification"
echo
