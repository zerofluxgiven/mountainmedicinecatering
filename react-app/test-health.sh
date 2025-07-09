#!/bin/bash
# React App Health Check Script

echo "🔍 Running React App Health Check..."
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check current directory
echo "📁 Current directory: $(pwd)"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found${NC}"
    echo "   Make sure you're in the react-app directory"
    exit 1
else
    echo -e "${GREEN}✅ package.json found${NC}"
fi

# Check Node.js version
echo ""
echo "🟢 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not installed${NC}"
    exit 1
fi

# Check npm version
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✅ npm installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm not installed${NC}"
    exit 1
fi

# Check if node_modules exists
echo ""
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found${NC}"
    echo "   Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ node_modules found${NC}"
fi

# Check for .env file
echo ""
echo "🔐 Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
    echo "   Firebase configuration is required to run the app"
    echo "   Run: cp .env.example .env"
    echo "   Then add your Firebase credentials"
else
    echo -e "${GREEN}✅ .env file found${NC}"
    
    # Check if required env vars are set
    if grep -q "your-api-key" .env; then
        echo -e "${YELLOW}⚠️  Warning: .env contains placeholder values${NC}"
        echo "   Please update with real Firebase credentials"
    fi
fi

# Check React app structure
echo ""
echo "🏗️  Checking app structure..."
REQUIRED_DIRS=("src" "public" "src/components" "src/pages" "src/contexts")
MISSING_DIRS=()

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        MISSING_DIRS+=("$dir")
    fi
done

if [ ${#MISSING_DIRS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All required directories present${NC}"
else
    echo -e "${RED}❌ Missing directories: ${MISSING_DIRS[*]}${NC}"
fi

# Check key files
REQUIRED_FILES=("src/App.jsx" "src/index.js" "public/index.html")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All required files present${NC}"
else
    echo -e "${RED}❌ Missing files: ${MISSING_FILES[*]}${NC}"
fi

# Try to build the app
echo ""
echo "🏗️  Testing build process..."
echo "   This may take a moment..."

# Create a temporary .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "   Creating temporary .env for build test..."
    cp .env.example .env.temp
    mv .env.temp .env
    TEMP_ENV=true
fi

# Run build
npm run build > build.log 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo "   Build output in: build/"
    
    # Check build size
    if [ -d "build" ]; then
        BUILD_SIZE=$(du -sh build | cut -f1)
        echo "   Build size: $BUILD_SIZE"
    fi
else
    echo -e "${RED}❌ Build failed!${NC}"
    echo "   Check build.log for details"
    echo ""
    echo "Common issues:"
    echo "  - Missing dependencies (run: npm install)"
    echo "  - Syntax errors in code"
    echo "  - Import errors"
    tail -n 10 build.log
fi

# Clean up temp .env if created
if [ "$TEMP_ENV" = true ]; then
    rm .env
fi

# Summary
echo ""
echo "=================================="
echo "📊 Health Check Summary"
echo "=================================="

if [ $? -eq 0 ] && [ ${#MISSING_DIRS[@]} -eq 0 ] && [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ React app is healthy and ready to run!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Set up .env file with Firebase config"
    echo "  2. Run: npm start"
    echo "  3. Open http://localhost:3000"
else
    echo -e "${RED}❌ Issues found. Please fix them before running the app.${NC}"
fi

echo ""