#!/bin/bash

# Deploy TypeScript API to replace Python API on EC2
# This script will deploy the TypeScript API to port 7777 on the EC2 instance

echo "🚀 Deploying TypeScript API to EC2 instance..."

# Build the API
echo "📦 Building TypeScript API..."
cd /e/Projects/NiroAgent/na-agent-dashboard/api
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ TypeScript API built successfully"

# Create deployment package
echo "📁 Creating deployment package..."
tar -czf api-deployment.tar.gz dist/ package.json package-lock.json simple-api.js

# The deployment would typically involve:
# 1. Stopping the Python server on port 7777
# 2. Copying the TypeScript API files to the EC2 instance  
# 3. Installing dependencies and starting the TypeScript API
# 4. Updating any systemd services or PM2 processes

echo "📦 Deployment package created: api-deployment.tar.gz"
echo ""
echo "🔧 Manual deployment steps:"
echo "1. SSH to EC2 instance: ssh -i ~/.ssh/your-key.pem ec2-user@98.81.93.132"
echo "2. Stop the Python API: sudo pkill -f python"
echo "3. Copy api-deployment.tar.gz to the instance"
echo "4. Extract: tar -xzf api-deployment.tar.gz"
echo "5. Install dependencies: npm install --production"
echo "6. Start TypeScript API: PORT=7777 node simple-api.js"
echo ""
echo "💡 For now, let's test with the TypeScript API on port 7778 and update the frontend"
