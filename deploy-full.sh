#!/bin/bash

# Master Deployment Script
# Deploys both frontend (S3) and API (Agent Server) in correct order

set -e

echo "🚀 Starting Full Deployment Pipeline..."
echo "================================="

# Step 1: Configure security group for API access
echo ""
echo "Step 1: Configuring Security Group..."
chmod +x configure-security-group.sh
./configure-security-group.sh

# Step 2: Deploy API to agent server
echo ""
echo "Step 2: Deploying API to Agent Server..."
chmod +x deploy-api.sh
./deploy-api.sh

# Step 3: Deploy frontend to S3
echo ""
echo "Step 3: Deploying Frontend to S3..."
chmod +x deploy-frontend.sh
./deploy-frontend.sh

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================="
echo ""
echo "📊 Dashboard Components:"
echo "  🌐 Frontend: http://niro-agent-dashboard-frontend.s3-website-us-east-1.amazonaws.com"
echo "  🔧 API: http://98.81.93.132:7777"
echo ""
echo "🧪 Quick Test URLs:"
echo "  ❤️ API Health: http://98.81.93.132:7777/health"
echo "  📈 Agents Data: http://98.81.93.132:7777/api/dashboard/agents"
echo ""
echo "💰 Cost Optimization:"
echo "  ✅ Frontend: ~$1-2/month (S3 + data transfer)"
echo "  ✅ API: $0/month (runs on existing agent server)"
echo "  💵 Total Additional Cost: ~$1-2/month"
echo ""
echo "🔧 Management Commands:"
echo "  Monitor API: ssh ec2-user@98.81.93.132 'pm2 status'"
echo "  View Logs: ssh ec2-user@98.81.93.132 'pm2 logs niro-agent-dashboard-api'"
echo "  Restart API: ssh ec2-user@98.81.93.132 'pm2 restart niro-agent-dashboard-api'"
echo ""
