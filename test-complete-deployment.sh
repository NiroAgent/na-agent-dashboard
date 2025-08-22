#!/bin/bash

# Complete Deployment Test Script
# Tests all components of the NA Agent Dashboard deployment

set -e

echo "🧪 Testing Complete NA Agent Dashboard Deployment"
echo "=================================================="

# Configuration
S3_FRONTEND_URL="http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com"
EC2_API_URL="http://98.81.93.132:7777"
API_ENDPOINTS=(
    "/health"
    "/api/agents"
    "/api/dashboard/live-data"
    "/api/dashboard/agents"
    "/api/dashboard/metrics"
    "/api/dashboard/data-sources"
)

echo ""
echo "🌐 Testing S3 Frontend Accessibility"
echo "URL: ${S3_FRONTEND_URL}"
if curl -f -s --connect-timeout 10 "${S3_FRONTEND_URL}" > /dev/null; then
    echo "✅ S3 Frontend is accessible"
else
    echo "❌ S3 Frontend is not accessible"
fi

echo ""
echo "🔌 Testing EC2 API Backend"
echo "URL: ${EC2_API_URL}"

for endpoint in "${API_ENDPOINTS[@]}"; do
    echo -n "Testing ${endpoint}: "
    if curl -f -s --connect-timeout 5 "${EC2_API_URL}${endpoint}" > /dev/null; then
        echo "✅ Responding"
    else
        echo "❌ Not responding"
    fi
done

echo ""
echo "📊 Testing API Response Content"
echo "================================"

echo ""
echo "Health Endpoint:"
curl -s "${EC2_API_URL}/health" | head -3

echo ""
echo ""
echo "Agents Endpoint (first 200 chars):"
curl -s "${EC2_API_URL}/api/agents" | head -c 200

echo ""
echo ""
echo "Dashboard Live Data (first 200 chars):"
curl -s "${EC2_API_URL}/api/dashboard/live-data" | head -c 200

echo ""
echo ""
echo "Dashboard Agents (first 200 chars):"
curl -s "${EC2_API_URL}/api/dashboard/agents" | head -c 200

echo ""
echo ""
echo "🔄 Testing CORS Headers"
echo "======================="
echo "Checking CORS headers for frontend connectivity:"
curl -s -I -H "Origin: ${S3_FRONTEND_URL}" "${EC2_API_URL}/api/agents" | grep -i "access-control"

echo ""
echo "📈 Testing WebSocket Connectivity"
echo "================================="
echo "WebSocket endpoint should be available at: ws://98.81.93.132:7777/ws"

echo ""
echo "🎯 Summary"
echo "=========="
echo "Frontend URL: ${S3_FRONTEND_URL}"
echo "API Backend: ${EC2_API_URL}"
echo "Status: Testing complete"

echo ""
echo "🔗 Quick Access Links"
echo "===================="
echo "Dashboard: ${S3_FRONTEND_URL}"
echo "API Health: ${EC2_API_URL}/health"
echo "API Agents: ${EC2_API_URL}/api/agents"
echo "Dashboard Live Data: ${EC2_API_URL}/api/dashboard/live-data"