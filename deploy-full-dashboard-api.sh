#!/bin/bash

# Deploy Full Dashboard API - Direct Approach
# This script deploys the complete dashboard API with all endpoints

set -e

INSTANCE_ID="i-0af59b7036f7b0b77"
API_PORT="7777"
API_URL="http://98.81.93.132:${API_PORT}"

echo "🚀 Deploying Full Dashboard API"
echo "================================"
echo "Target: ${API_URL}"
echo "Instance: ${INSTANCE_ID}"

# Create the deployment package
echo "📦 Preparing deployment package..."

# Create temporary deployment directory
DEPLOY_DIR="/tmp/dashboard-api-deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy API source code
cp -r api/* "$DEPLOY_DIR/"

# Create production package.json with all dependencies
cat > "$DEPLOY_DIR/package.json" << 'PACKAGE_JSON'
{
  "name": "na-agent-dashboard-api",
  "version": "2.0.0",
  "description": "NA Agent Dashboard API Server",
  "main": "dist/server.js",
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc",
    "dev": "ts-node src/server.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.3.1",
    "ws": "^8.13.0",
    "socket.io": "^4.7.2",
    "winston": "^3.10.0",
    "aws-sdk": "^2.1450.0",
    "@aws-sdk/client-ec2": "^3.400.0",
    "@aws-sdk/client-cloudwatch": "^3.400.0",
    "@octokit/rest": "^20.0.1",
    "node-fetch": "^2.6.7",
    "axios": "^1.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.5.0",
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/ws": "^8.5.5",
    "typescript": "^5.1.6",
    "ts-node": "^10.9.1"
  }
}
PACKAGE_JSON

# Create production environment file
cat > "$DEPLOY_DIR/.env" << 'ENV_FILE'
NODE_ENV=production
PORT=7777
AWS_DEFAULT_REGION=us-east-1
AWS_REGION=us-east-1

# Database/Agent Integration
EC2_INSTANCE_ID=i-0af59b7036f7b0b77
TYPESCRIPT_AGENTS_URL=http://localhost
ENABLE_FALLBACK_TESTING=true

# GitHub Integration (load from Secrets Manager)
GITHUB_ORG=NiroAgent

# Monitoring
MONITORING_INTERVAL=30000
COST_UPDATE_INTERVAL=300000
LOG_LEVEL=info
USE_GITHUB_COPILOT_FOR_ALL=false

# CORS Configuration
FRONTEND_URL=http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com
CORS_ORIGIN=*
ENV_FILE

# Create PM2 ecosystem configuration
cat > "$DEPLOY_DIR/ecosystem.config.js" << 'PM2_CONFIG'
module.exports = {
  apps: [
    {
      name: 'na-dashboard-api',
      script: './dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 7777
      },
      error_file: '/opt/na-agent-dashboard/logs/api-error.log',
      out_file: '/opt/na-agent-dashboard/logs/api-out.log',
      log_file: '/opt/na-agent-dashboard/logs/api-combined.log',
      time: true
    }
  ]
};
PM2_CONFIG

echo "✅ Deployment package prepared at: $DEPLOY_DIR"

# Test current API to see what we're replacing
echo ""
echo "📊 Current API Status:"
curl -s "${API_URL}/health" | head -c 100 || echo "API not responding"

echo ""
echo ""
echo "🎯 Next Steps:"
echo "1. Package created at: $DEPLOY_DIR"
echo "2. This contains the full dashboard API source"
echo "3. GitHub Actions deployment should use this structure"
echo "4. Expected endpoints after deployment:"
echo "   - GET  /health"
echo "   - GET  /api/agents"
echo "   - GET  /api/dashboard/live-data"
echo "   - GET  /api/dashboard/agents"
echo "   - GET  /api/dashboard/metrics"
echo "   - POST /api/dashboard/refresh"
echo "   - GET  /api/dashboard/data-sources"

echo ""
echo "📋 Manual Deployment:"
echo "If GitHub Actions isn't working, manually:"
echo "1. Copy $DEPLOY_DIR to EC2 instance"
echo "2. Run: npm install --production"
echo "3. Run: npm run build"
echo "4. Run: pm2 start ecosystem.config.js"

rm -rf "$DEPLOY_DIR"

echo ""
echo "✅ Full Dashboard API deployment preparation complete"