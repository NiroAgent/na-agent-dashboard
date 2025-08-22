#!/bin/bash

# Force Deploy Dashboard API to EC2
# Replaces any existing API with the correct dashboard implementation

set -e

INSTANCE_ID="i-0af59b7036f7b0b77"
REGION="us-east-1"
API_PORT="7777"

echo "🚀 Force deploying Dashboard API to EC2"
echo "Instance: ${INSTANCE_ID}"
echo "Port: ${API_PORT}"

# Test if we can connect to the API currently
echo "📍 Current API status:"
curl -s "http://98.81.93.132:${API_PORT}/health" || echo "API not responding"

echo ""
echo "📦 Triggering deployment via GitHub Actions workflow..."

# Since we can't directly deploy from WSL, let's create a GitHub workflow dispatch
echo "Manual deployment trigger needed:"
echo "1. Go to: https://github.com/NiroAgent/na-agent-dashboard/actions/workflows/deploy-application.yml"
echo "2. Click 'Run workflow'"
echo "3. Select 'dev' environment"
echo "4. Click 'Run workflow'"

echo ""
echo "🔄 Alternative: Check if GitHub Actions is already running"
echo "Visit: https://github.com/NiroAgent/na-agent-dashboard/actions"

echo ""
echo "📊 Expected endpoints after deployment:"
echo "- Health: http://98.81.93.132:${API_PORT}/health"
echo "- Agents: http://98.81.93.132:${API_PORT}/api/agents"
echo "- Dashboard Live Data: http://98.81.93.132:${API_PORT}/api/dashboard/live-data"
echo "- Dashboard Agents: http://98.81.93.132:${API_PORT}/api/dashboard/agents"
echo "- Dashboard Metrics: http://98.81.93.132:${API_PORT}/api/dashboard/metrics"

echo ""
echo "🎯 Frontend should connect to:"
echo "- S3 URL: http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com/"
echo "- API URL: http://98.81.93.132:${API_PORT}"

echo ""
echo "✅ Deployment information prepared"
echo "Next: Wait for GitHub Actions to complete, then test endpoints"