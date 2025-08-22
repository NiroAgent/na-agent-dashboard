#!/bin/bash

# Comprehensive Deployment Validation Script
# Tests all aspects of the dashboard deployment

echo "🔍 NA Agent Dashboard Deployment Validation"
echo "==========================================="

# Configuration
DEV_API_URL="http://98.81.93.132:7777"
DEV_FRONTEND_URL="http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com"
STAGING_API_URL="http://98.81.93.132:7778"

echo ""
echo "📊 Testing Development Environment"
echo "================================="

echo -n "API Health: "
if curl -f -s --connect-timeout 5 "${DEV_API_URL}/health" > /dev/null; then
    echo "✅ Online"
else
    echo "❌ Offline"
fi

echo -n "Basic Agents Endpoint: "
if curl -f -s --connect-timeout 5 "${DEV_API_URL}/api/agents" | grep -q '"id"'; then
    echo "✅ Working"
else
    echo "❌ Failed"
fi

echo -n "Dashboard Live Data: "
if curl -f -s --connect-timeout 5 "${DEV_API_URL}/api/dashboard/live-data" | grep -q '"success"'; then
    echo "✅ Working"
else
    echo "❌ Not Available"
fi

echo -n "Dashboard Agents: "
if curl -f -s --connect-timeout 5 "${DEV_API_URL}/api/dashboard/agents" | grep -q '"success"'; then
    echo "✅ Working"
else
    echo "❌ Not Available"
fi

echo -n "S3 Frontend: "
if curl -f -s --connect-timeout 10 "${DEV_FRONTEND_URL}/" | grep -q "Agent.*Dashboard"; then
    echo "✅ Accessible"
else
    echo "❌ Not Accessible"
fi

echo ""
echo "📊 Testing Staging Environment"
echo "============================="

echo -n "Staging API Health: "
if curl -f -s --connect-timeout 5 "${STAGING_API_URL}/health" > /dev/null; then
    echo "✅ Online"
else
    echo "❌ Offline (expected if not deployed yet)"
fi

echo ""
echo "📋 Current System Status"
echo "======================="

echo "Development:"
echo "  - API: ${DEV_API_URL}"
echo "  - Frontend: ${DEV_FRONTEND_URL}"
echo ""
echo "Staging:"
echo "  - API: ${STAGING_API_URL}"
echo ""

echo "📈 API Response Analysis"
echo "======================"

echo ""
echo "Dev Health Response:"
curl -s "${DEV_API_URL}/health" | head -c 200

echo ""
echo ""
echo "Dev Agents Count:"
AGENT_COUNT=$(curl -s "${DEV_API_URL}/api/agents" | grep -o '"id"' | wc -l)
echo "Agents found: ${AGENT_COUNT}"

echo ""
echo "✅ Validation Complete"