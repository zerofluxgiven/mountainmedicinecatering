#!/bin/bash
# Quick test runner for React app

echo "🧪 Mountain Medicine Kitchen - Test Runner"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to run a test
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${BLUE}Running: $test_name${NC}"
    echo "----------------------------------------"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name passed${NC}\n"
        return 0
    else
        echo -e "${RED}❌ $test_name failed${NC}\n"
        return 1
    fi
}

# Track failures
FAILED_TESTS=()

# 1. Health Check
if ! run_test "Health Check" "$SCRIPT_DIR/test-health.sh"; then
    FAILED_TESTS+=("Health Check")
fi

# 2. Firebase Connection (only if .env exists)
if [ -f "$SCRIPT_DIR/.env" ]; then
    if ! run_test "Firebase Connection" "cd $SCRIPT_DIR && node test-firebase-connection.js"; then
        FAILED_TESTS+=("Firebase Connection")
    fi
else
    echo -e "${YELLOW}⚠️  Skipping Firebase test - no .env file${NC}\n"
fi

# 3. Unit Tests (if node_modules exists)
if [ -d "$SCRIPT_DIR/node_modules" ]; then
    echo -e "${BLUE}Running: Unit Tests${NC}"
    echo "----------------------------------------"
    cd "$SCRIPT_DIR" && npm test -- --watchAll=false --passWithNoTests
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Unit tests passed${NC}\n"
    else
        echo -e "${RED}❌ Unit tests failed${NC}\n"
        FAILED_TESTS+=("Unit Tests")
    fi
else
    echo -e "${YELLOW}⚠️  Skipping unit tests - run 'npm install' first${NC}\n"
fi

# Summary
echo "========================================"
echo "📊 Test Summary"
echo "========================================"

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "The React app is ready to run:"
    echo "  cd react-app"
    echo "  npm start"
    exit 0
else
    echo -e "${RED}❌ Some tests failed:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  - $test"
    done
    echo ""
    echo "Please fix the issues before proceeding."
    exit 1
fi