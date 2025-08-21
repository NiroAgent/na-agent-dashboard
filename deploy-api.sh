#!/bin/bash

# API Deployment Script for Agent Server
# Deploys Node.js API to existing agent server (i-0af59b7036f7b0b77)

set -e

# Configuration
AGENT_SERVER_IP="98.81.93.132"
AGENT_SERVER_USER="ec2-user"  # Default for Amazon Linux
SSH_KEY_PATH="~/.ssh/id_rsa"  # Update with your key path
API_PORT="7777"
APP_NAME="niro-agent-dashboard-api"

echo "🚀 Starting API Deployment to Agent Server..."

# Check if SSH key exists
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "❌ SSH key not found at $SSH_KEY_PATH"
    echo "Please update SSH_KEY_PATH in this script or ensure your SSH key is available"
    exit 1
fi

# Test SSH connection
echo "🔑 Testing SSH connection to agent server..."
if ! ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$AGENT_SERVER_USER@$AGENT_SERVER_IP" "echo 'SSH connection successful'"; then
    echo "❌ Cannot connect to agent server via SSH"
    echo "Please ensure:"
    echo "1. SSH key path is correct: $SSH_KEY_PATH"
    echo "2. Security group allows SSH (port 22) from your IP"
    echo "3. Username is correct: $AGENT_SERVER_USER"
    exit 1
fi

echo "✅ SSH connection successful"

# Create deployment package
echo "📦 Creating deployment package..."
cd api
npm run build 2>/dev/null || echo "No build script found, using source files"

# Create deployment archive
tar -czf "../api-deployment.tar.gz" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude="*.log" \
    --exclude=".env.local" \
    .

cd ..

# Upload deployment package
echo "⬆️ Uploading API to agent server..."
scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no \
    api-deployment.tar.gz \
    "$AGENT_SERVER_USER@$AGENT_SERVER_IP:/tmp/"

# Deploy on agent server
echo "🔧 Deploying and configuring API on agent server..."
ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$AGENT_SERVER_USER@$AGENT_SERVER_IP" << 'DEPLOY_SCRIPT'
set -e

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
fi

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    sudo npm install -g pm2
fi

# Create application directory
sudo mkdir -p /opt/niro-agent-dashboard-api
sudo chown $USER:$USER /opt/niro-agent-dashboard-api

# Extract and setup application
cd /opt/niro-agent-dashboard-api
tar -xzf /tmp/api-deployment.tar.gz
rm -f /tmp/api-deployment.tar.gz

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create production environment file
cat > .env << 'ENV_FILE'
NODE_ENV=production
PORT=7777
AWS_REGION=us-east-1
CORS_ORIGIN=*
ENV_FILE

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'PM2_CONFIG'
module.exports = {
  apps: [{
    name: 'niro-agent-dashboard-api',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 7777
    },
    error_file: '/var/log/niro-api-error.log',
    out_file: '/var/log/niro-api-out.log',
    log_file: '/var/log/niro-api.log'
  }]
};
PM2_CONFIG

# Stop existing instance if running
pm2 stop niro-agent-dashboard-api 2>/dev/null || echo "No existing instance to stop"
pm2 delete niro-agent-dashboard-api 2>/dev/null || echo "No existing instance to delete"

# Start the application
echo "🚀 Starting API with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# Configure firewall for API port
echo "🔥 Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 7777
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-port=7777/tcp
    sudo firewall-cmd --reload
fi

# Test the deployment
echo "🧪 Testing API deployment..."
sleep 5
if curl -s http://localhost:7777/health > /dev/null; then
    echo "✅ API is running and responding"
    pm2 status
else
    echo "❌ API health check failed"
    pm2 logs niro-agent-dashboard-api --lines 10
    exit 1
fi

DEPLOY_SCRIPT

# Clean up local deployment package
rm -f api-deployment.tar.gz

# Test external access
echo "🌐 Testing external API access..."
sleep 3
if curl -s "http://$AGENT_SERVER_IP:$API_PORT/health" > /dev/null; then
    echo "✅ API is accessible externally"
else
    echo "⚠️ API might not be accessible externally. Check security group settings."
    echo "Ensure security group allows inbound traffic on port $API_PORT"
fi

echo ""
echo "✅ API deployment complete!"
echo "📍 API URL: http://$AGENT_SERVER_IP:$API_PORT"
echo "🔍 Health Check: http://$AGENT_SERVER_IP:$API_PORT/health"
echo "📊 Agents Endpoint: http://$AGENT_SERVER_IP:$API_PORT/api/dashboard/agents"
echo ""
echo "To manage the API:"
echo "  ssh -i $SSH_KEY_PATH $AGENT_SERVER_USER@$AGENT_SERVER_IP"
echo "  pm2 status"
echo "  pm2 logs niro-agent-dashboard-api"
echo "  pm2 restart niro-agent-dashboard-api"
echo ""
