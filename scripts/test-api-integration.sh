#!/bin/bash

# API Integration Test Script
# Tests the complete fixed API system

echo "=================================================================================="
echo "API INTEGRATION TEST - FIXED TYPESCRIPT API"
echo "=================================================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "Testing $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}[PASS]${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}[FAIL]${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "1. REAL AGENT SERVER (Python - Port 7778)"
echo "----------------------------------------"

# Test Python real agent server
run_test "Real agent server health" "curl -f -s http://localhost:7778/health"
run_test "Real agent API agents endpoint" "curl -f -s http://localhost:7778/api/agents | python -c 'import sys,json; data=json.load(sys.stdin); assert len(data) > 200'"

echo ""
echo "2. TYPESCRIPT API SERVER (Node.js - Port 7779)"  
echo "----------------------------------------"

# Test TypeScript API server
run_test "TypeScript API health" "curl -f -s http://localhost:7779/health"
run_test "TypeScript agents endpoint" "curl -f -s http://localhost:7779/agents"
run_test "TypeScript dashboard endpoint" "curl -f -s http://localhost:7779/api/dashboard/agents"

echo ""
echo "3. REACT FRONTEND (Vite - Port 3000)"
echo "----------------------------------------"

# Test React frontend
run_test "React development server" "curl -f -s http://localhost:3000"

echo ""
echo "4. DATA INTEGRATION VALIDATION"
echo "----------------------------------------"

# Test data flow
run_test "TypeScript API gets real agent data" "curl -s http://localhost:7779/health | grep -q '237'"

echo ""
echo "5. CONFIGURATION VALIDATION"
echo "----------------------------------------"

# Test configuration files
run_test "Frontend environment config" "grep -q 'VITE_API_BASE_URL=http://localhost:7779' mfe/.env.development"
run_test "TypeScript API package.json" "grep -q '\"start\": \"node dist/index.js\"' api/package.json"

echo ""
echo "=================================================================================="
echo "API INTEGRATION TEST COMPLETE"
echo "=================================================================================="
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}[SUCCESS] All API integration tests passed!${NC}"
    echo ""
    echo "SYSTEM STATUS: FULLY INTEGRATED"
    echo ""
    echo "Active Services:"
    echo "- Real Agent Server:  http://localhost:7778 (237 agents discovered)"
    echo "- TypeScript API:     http://localhost:7779 (real-time features)"  
    echo "- React Frontend:     http://localhost:3000 (production UI)"
    echo ""
    echo "Data Flow:"
    echo "Python Server (7778) → TypeScript API (7779) → React Frontend (3000)"
    echo ""
    exit 0
else
    echo -e "${RED}[WARNING] Some integration tests failed${NC}"
    echo "Please review failed tests before production use"
    exit 1
fi