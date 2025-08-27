#!/bin/bash

# Frontend Health Monitoring Script
# Continuously monitors the frontend for errors and issues
# Can be run as a background service

echo "🔍 Frontend Health Monitor Starting..."
echo "======================================"

# Configuration
FRONTEND_URL="http://localhost:3002"
PYTHON_API_URL="http://localhost:7778"
TYPESCRIPT_API_URL="http://localhost:7779"
CHECK_INTERVAL=30  # seconds
LOG_FILE="logs/frontend-health.log"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create logs directory if it doesn't exist
mkdir -p logs

# Initialize counters
TOTAL_CHECKS=0
FAILED_CHECKS=0
LAST_ERROR=""
START_TIME=$(date)

log_message() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local message="$1"
    echo "[$timestamp] $message" | tee -a "$LOG_FILE"
}

check_service_health() {
    local service_name="$1"
    local url="$2"
    local timeout="$3"
    
    response=$(curl -s -m "$timeout" "$url" 2>/dev/null)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $service_name"
        return 0
    else
        echo -e "${RED}✗${NC} $service_name (Error: $exit_code)"
        log_message "ERROR: $service_name failed health check (exit code: $exit_code)"
        return 1
    fi
}

check_api_data_quality() {
    local api_name="$1"
    local url="$2"
    local expected_field="$3"
    
    response=$(curl -s -m 5 "$url" 2>/dev/null)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        if [[ "$response" == *"$expected_field"* ]]; then
            echo -e "${GREEN}✓${NC} $api_name data"
            return 0
        else
            echo -e "${YELLOW}⚠${NC} $api_name data format issue"
            log_message "WARNING: $api_name data missing expected field: $expected_field"
            return 1
        fi
    else
        echo -e "${RED}✗${NC} $api_name data (unreachable)"
        log_message "ERROR: $api_name data endpoint unreachable"
        return 1
    fi
}

check_frontend_assets() {
    response=$(curl -s -m 10 "$FRONTEND_URL" 2>/dev/null)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        # Check for critical elements
        if [[ "$response" == *"id=\"root\""* ]]; then
            echo -e "${GREEN}✓${NC} Frontend HTML structure"
        else
            echo -e "${RED}✗${NC} Frontend HTML structure"
            log_message "ERROR: Frontend missing React root container"
            return 1
        fi
        
        # Check for obvious error messages
        if [[ "$response" == *"Error"* ]] || [[ "$response" == *"error"* ]]; then
            echo -e "${YELLOW}⚠${NC} Potential error content in HTML"
            log_message "WARNING: Error keywords found in frontend HTML"
        fi
        
        return 0
    else
        echo -e "${RED}✗${NC} Frontend accessibility"
        log_message "ERROR: Frontend not accessible"
        return 1
    fi
}

monitor_system_resources() {
    # Check if Node processes are consuming excessive resources
    if command -v tasklist >/dev/null 2>&1; then
        # Windows
        node_processes=$(tasklist 2>/dev/null | grep -i "node.exe" | wc -l)
        if [ "$node_processes" -gt 5 ]; then
            echo -e "${YELLOW}⚠${NC} High Node.js process count: $node_processes"
            log_message "WARNING: High number of Node.js processes detected: $node_processes"
        fi
    fi
    
    # Check port availability
    local ports_check=0
    for port in 3002 7778 7779; do
        if netstat -an 2>/dev/null | grep -q ":$port.*LISTEN"; then
            ((ports_check++))
        fi
    done
    
    if [ $ports_check -eq 3 ]; then
        echo -e "${GREEN}✓${NC} All required ports active"
    else
        echo -e "${RED}✗${NC} Missing active ports ($ports_check/3)"
        log_message "ERROR: Not all required ports are active ($ports_check/3)"
        return 1
    fi
    
    return 0
}

run_health_check() {
    local timestamp=$(date '+%H:%M:%S')
    echo ""
    echo -e "${BLUE}[$timestamp] Health Check #$((TOTAL_CHECKS + 1))${NC}"
    echo "----------------------------------------"
    
    local check_errors=0
    
    # Service connectivity
    check_service_health "Python API (7778)" "$PYTHON_API_URL/health" 5 || ((check_errors++))
    check_service_health "TypeScript API (7779)" "$TYPESCRIPT_API_URL/health" 5 || ((check_errors++))
    check_service_health "Frontend (3002)" "$FRONTEND_URL" 10 || ((check_errors++))
    
    # Data quality checks
    check_api_data_quality "Python API" "$PYTHON_API_URL/api/agents" '"id"' || ((check_errors++))
    check_api_data_quality "TypeScript API" "$TYPESCRIPT_API_URL/api/dashboard/agents" '"success"' || ((check_errors++))
    
    # Frontend asset checks
    check_frontend_assets || ((check_errors++))
    
    # System resource monitoring
    monitor_system_resources || ((check_errors++))
    
    # Update counters
    ((TOTAL_CHECKS++))
    if [ $check_errors -gt 0 ]; then
        ((FAILED_CHECKS++))
        LAST_ERROR="$timestamp - $check_errors issues detected"
        echo -e "${RED}❌ Health check failed ($check_errors issues)${NC}"
        log_message "HEALTH CHECK FAILED: $check_errors issues detected"
    else
        echo -e "${GREEN}✅ All systems healthy${NC}"
    fi
    
    # Status summary
    local success_rate=$((100 * (TOTAL_CHECKS - FAILED_CHECKS) / TOTAL_CHECKS))
    echo "Status: $success_rate% healthy ($FAILED_CHECKS/$TOTAL_CHECKS failed)"
}

print_summary() {
    echo ""
    echo "=================================="
    echo "HEALTH MONITORING SUMMARY"
    echo "=================================="
    echo "Start Time: $START_TIME"
    echo "End Time: $(date)"
    echo "Total Checks: $TOTAL_CHECKS"
    echo "Failed Checks: $FAILED_CHECKS"
    local success_rate=0
    if [ $TOTAL_CHECKS -gt 0 ]; then
        success_rate=$((100 * (TOTAL_CHECKS - FAILED_CHECKS) / TOTAL_CHECKS))
    fi
    echo "Success Rate: $success_rate%"
    echo "Last Error: ${LAST_ERROR:-None}"
    echo "Log File: $LOG_FILE"
    echo "=================================="
}

# Trap signals for graceful shutdown
trap 'echo ""; print_summary; exit 0' INT TERM

# Print initial configuration
log_message "Frontend Health Monitor started"
log_message "Configuration: Frontend=$FRONTEND_URL, Python=$PYTHON_API_URL, TypeScript=$TYPESCRIPT_API_URL"
log_message "Check interval: ${CHECK_INTERVAL}s"

echo ""
echo "Configuration:"
echo "  Frontend: $FRONTEND_URL"
echo "  Python API: $PYTHON_API_URL"
echo "  TypeScript API: $TYPESCRIPT_API_URL"
echo "  Check interval: ${CHECK_INTERVAL}s"
echo "  Log file: $LOG_FILE"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

# Main monitoring loop
while true; do
    run_health_check
    
    # Check if we should alert on consecutive failures
    if [ $FAILED_CHECKS -gt 0 ] && [ $((FAILED_CHECKS % 5)) -eq 0 ]; then
        echo -e "${RED}🚨 ALERT: $FAILED_CHECKS consecutive failures detected!${NC}"
        log_message "ALERT: High failure rate detected - $FAILED_CHECKS failures out of $TOTAL_CHECKS checks"
    fi
    
    sleep $CHECK_INTERVAL
done