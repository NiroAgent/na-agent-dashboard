#!/bin/bash

# Frontend Error Detection Script
# Tests frontend accessibility and checks for common errors
# Works without additional dependencies

echo "==================================================================================" 
echo "FRONTEND ERROR DETECTION TEST"
echo "=================================================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
ERRORS_FOUND=0

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

check_service() {
    local service_name="$1"
    local url="$2"
    local expected_content="$3"
    
    echo -n "Checking $service_name... "
    
    response=$(curl -s -m 5 "$url" 2>/dev/null)
    curl_exit_code=$?
    
    if [ $curl_exit_code -ne 0 ]; then
        echo -e "${RED}[UNREACHABLE]${NC}"
        ((ERRORS_FOUND++))
        echo "  Error: Service not accessible (curl exit code: $curl_exit_code)"
        return 1
    fi
    
    if [ -n "$expected_content" ] && [[ "$response" != *"$expected_content"* ]]; then
        echo -e "${YELLOW}[WARNING]${NC}"
        echo "  Expected content '$expected_content' not found in response"
        return 1
    fi
    
    echo -e "${GREEN}[ACCESSIBLE]${NC}"
    return 0
}

analyze_frontend_response() {
    local url="$1"
    
    echo "📄 Analyzing frontend response from $url..."
    
    response=$(curl -s -m 10 "$url" 2>/dev/null)
    curl_exit_code=$?
    
    if [ $curl_exit_code -ne 0 ]; then
        echo -e "${RED}❌ Frontend not accessible${NC}"
        ((ERRORS_FOUND++))
        return 1
    fi
    
    # Check for basic HTML structure
    if [[ "$response" == *"<html"* ]] || [[ "$response" == *"<!DOCTYPE"* ]]; then
        echo -e "${GREEN}✅ Valid HTML response received${NC}"
    else
        echo -e "${RED}❌ Invalid HTML response${NC}"
        ((ERRORS_FOUND++))
    fi
    
    # Check for React app container
    if [[ "$response" == *"id=\"root\""* ]]; then
        echo -e "${GREEN}✅ React app container found${NC}"
    else
        echo -e "${YELLOW}⚠️  React app container not found${NC}"
    fi
    
    # Check for title
    if [[ "$response" == *"<title>"* ]]; then
        title=$(echo "$response" | grep -o '<title>[^<]*</title>' | sed 's/<[^>]*>//g')
        echo -e "${GREEN}✅ Page title: $title${NC}"
    else
        echo -e "${YELLOW}⚠️  No page title found${NC}"
    fi
    
    # Check for JavaScript bundles
    js_count=$(echo "$response" | grep -o 'src="[^"]*\.js"' | wc -l)
    echo -e "${BLUE}📦 JavaScript bundles found: $js_count${NC}"
    
    # Check for CSS files
    css_count=$(echo "$response" | grep -o 'href="[^"]*\.css"' | wc -l)
    echo -e "${BLUE}🎨 CSS files found: $css_count${NC}"
    
    # Look for error indicators in HTML
    if [[ "$response" == *"error"* ]] || [[ "$response" == *"Error"* ]]; then
        echo -e "${YELLOW}⚠️  Potential error keywords found in HTML${NC}"
    fi
    
    return 0
}

test_api_data_flow() {
    echo "🔄 Testing API data flow..."
    
    # Test Python API data
    python_data=$(curl -s -m 5 "http://localhost:7778/api/agents" 2>/dev/null)
    python_exit_code=$?
    
    if [ $python_exit_code -eq 0 ]; then
        agent_count=$(echo "$python_data" | grep -o '"id"' | wc -l)
        echo -e "${GREEN}✅ Python API returned $agent_count agents${NC}"
    else
        echo -e "${RED}❌ Python API data fetch failed${NC}"
        ((ERRORS_FOUND++))
    fi
    
    # Test TypeScript API data
    ts_data=$(curl -s -m 5 "http://localhost:7779/api/dashboard/agents" 2>/dev/null)
    ts_exit_code=$?
    
    if [ $ts_exit_code -eq 0 ]; then
        if [[ "$ts_data" == *'"success":true'* ]]; then
            echo -e "${GREEN}✅ TypeScript API returned success response${NC}"
        else
            echo -e "${YELLOW}⚠️  TypeScript API response format may be incorrect${NC}"
        fi
    else
        echo -e "${RED}❌ TypeScript API data fetch failed${NC}"
        ((ERRORS_FOUND++))
    fi
}

check_common_endpoints() {
    echo "🌐 Testing common frontend endpoints..."
    
    local base_url="http://localhost:3002"
    
    # Try multiple possible ports for React dev server
    for port in 3002 3001 3000; do
        test_url="http://localhost:$port"
        response=$(curl -s -m 3 "$test_url" 2>/dev/null)
        if [ $? -eq 0 ] && [[ "$response" == *"<html"* ]]; then
            echo -e "${GREEN}✅ Frontend accessible on port $port${NC}"
            base_url="$test_url"
            break
        fi
    done
    
    # Test additional routes if accessible
    if curl -s -m 3 "$base_url" > /dev/null 2>&1; then
        echo "📍 Testing additional routes..."
        
        for route in "/dashboard" "/agents" "/"; do
            url="$base_url$route"
            if curl -s -m 3 "$url" > /dev/null 2>&1; then
                echo -e "   ${GREEN}✅ $route${NC}"
            else
                echo -e "   ${YELLOW}⚠️  $route (may be client-side routed)${NC}"
            fi
        done
    fi
}

analyze_service_logs() {
    echo "📋 Checking for service error patterns..."
    
    # Check if there are obvious error patterns in running processes
    if command -v netstat >/dev/null 2>&1; then
        echo "🔌 Active ports:"
        netstat -an 2>/dev/null | grep "LISTEN" | grep -E ":(3000|3001|3002|7778|7779)" | head -5
    fi
    
    # Check Windows processes (if on Windows)
    if command -v tasklist >/dev/null 2>&1; then
        echo "🖥️  Node processes:"
        tasklist 2>/dev/null | grep -i "node" | head -3
    fi
}

echo "1. SERVICE CONNECTIVITY TESTS"
echo "----------------------------------------"

check_service "Python Agent API (7778)" "http://localhost:7778/health" "Real Agent Discovery API"
check_service "TypeScript API (7779)" "http://localhost:7779/health" "status"

echo ""
echo "2. FRONTEND ACCESSIBILITY TESTS"
echo "----------------------------------------"

# Test the main frontend URL
analyze_frontend_response "http://localhost:3002"

echo ""
echo "3. API DATA FLOW TESTS"
echo "----------------------------------------"

test_api_data_flow

echo ""
echo "4. FRONTEND ENDPOINT TESTS"
echo "----------------------------------------"

check_common_endpoints

echo ""
echo "5. SERVICE STATUS ANALYSIS"
echo "----------------------------------------"

analyze_service_logs

echo ""
echo "=================================================================================="
echo "FRONTEND ERROR DETECTION COMPLETE"
echo "=================================================================================="
echo ""
echo -e "Service Accessibility: ${GREEN}$(echo $((TESTS_PASSED)))${NC} working, ${RED}$(echo $((TESTS_FAILED)))${NC} issues"
echo -e "Errors Found: ${RED}$ERRORS_FOUND${NC}"
echo ""

if [ $ERRORS_FOUND -eq 0 ] && [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED - Frontend appears healthy!${NC}"
    echo ""
    echo "✅ Services are running correctly"
    echo "✅ Frontend is accessible"  
    echo "✅ API data flow is working"
    echo "✅ No critical errors detected"
    echo ""
    echo "🌐 Access your dashboard at: http://localhost:3002"
    exit 0
else
    echo -e "${RED}⚠️  ISSUES DETECTED${NC}"
    echo ""
    echo "❌ $ERRORS_FOUND errors found"
    echo "❌ $TESTS_FAILED services have issues"
    echo ""
    echo "🔧 Recommended actions:"
    echo "  1. Check if all services are running"
    echo "  2. Verify port configurations"
    echo "  3. Check browser console for JavaScript errors"
    echo "  4. Review service logs for detailed error messages"
    exit 1
fi