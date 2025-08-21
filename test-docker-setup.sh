#!/bin/bash

# Test Docker Setup for Niro Agent Dashboard
# This script validates the local development environment before AWS deployment

set -e

echo "🚀 Testing Niro Agent Dashboard Docker Setup..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop."
    exit 1
fi
print_status "Docker is running"

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    print_error "docker-compose is not installed"
    exit 1
fi
print_status "docker-compose is available"

# Stop any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose -f docker-compose.local.yml down --remove-orphans 2>/dev/null || true

# Build and start containers
echo "🏗️  Building and starting containers..."
docker-compose -f docker-compose.local.yml up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Test service health
echo "🔍 Testing service health..."

# Test API health endpoint
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:7777/health 2>/dev/null || echo "000")
if [ "$API_HEALTH" = "200" ]; then
    print_status "API server is healthy (port 7777)"
else
    print_error "API server health check failed (expected 200, got $API_HEALTH)"
fi

# Test frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    print_status "Frontend is accessible (port 3000)"
else
    print_error "Frontend is not accessible (expected 200, got $FRONTEND_STATUS)"
fi

# Test Nginx proxy (simulating dev-visualforge.ai/agents/dashboard)
PROXY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/agents/dashboard 2>/dev/null || echo "000")
if [ "$PROXY_STATUS" = "200" ] || [ "$PROXY_STATUS" = "301" ] || [ "$PROXY_STATUS" = "302" ]; then
    print_status "Nginx proxy is working (/agents/dashboard route)"
else
    print_warning "Nginx proxy test inconclusive (got $PROXY_STATUS)"
fi

# Test API through proxy
API_PROXY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "000")
if [ "$API_PROXY_STATUS" = "200" ]; then
    print_status "API accessible through proxy (/api/health)"
else
    print_warning "API proxy test inconclusive (got $API_PROXY_STATUS)"
fi

# Check container status
echo "📊 Container Status:"
docker-compose -f docker-compose.local.yml ps

# Show logs for any failed containers
FAILED_CONTAINERS=$(docker-compose -f docker-compose.local.yml ps --services --filter "status=exited")
if [ -n "$FAILED_CONTAINERS" ]; then
    print_warning "Some containers failed. Showing logs:"
    for container in $FAILED_CONTAINERS; do
        echo "--- Logs for $container ---"
        docker-compose -f docker-compose.local.yml logs --tail=20 "$container"
    done
fi

# Final summary
echo ""
echo "🎯 Test Summary:"
echo "==============="
echo "Frontend:     http://localhost:3000"
echo "API:          http://localhost:7777"
echo "Dashboard:    http://localhost/agents/dashboard (simulates dev-visualforge.ai)"
echo "API Proxy:    http://localhost/api"
echo ""

if [ "$API_HEALTH" = "200" ] && [ "$FRONTEND_STATUS" = "200" ]; then
    print_status "Local environment is ready for development!"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Test the dashboard functionality"
    echo "  2. Validate agent data is loading"
    echo "  3. Deploy to AWS using GitHub Actions"
    echo ""
    print_status "To deploy to AWS, push to your branch and GitHub Actions will handle the rest!"
else
    print_error "Some services are not working properly. Check the logs above."
    exit 1
fi
