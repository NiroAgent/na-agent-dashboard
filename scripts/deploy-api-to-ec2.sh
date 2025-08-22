#!/bin/bash

# Deploy NA-Agent Dashboard API to EC2 Instance
# This deploys the backend API to work with the S3 frontend

set -e

INSTANCE_ID=${1:-i-0af59b7036f7b0b77}
REGION=${AWS_REGION:-us-east-1}
API_PORT=${2:-7777}

echo "🚀 Deploying NA-Agent Dashboard API to EC2"
echo "📍 Instance ID: ${INSTANCE_ID}"
echo "📍 Region: ${REGION}"
echo "📍 API Port: ${API_PORT}"
echo ""

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is required but not installed."
    exit 1
fi

# Check AWS credentials
echo "🔐 Checking AWS credentials..."
aws sts get-caller-identity > /dev/null || { echo "❌ AWS credentials not configured properly."; exit 1; }

# Check instance status
echo "🔍 Checking EC2 instance status..."
INSTANCE_STATE=$(aws ec2 describe-instances \
    --instance-ids ${INSTANCE_ID} \
    --region ${REGION} \
    --query "Reservations[0].Instances[0].State.Name" \
    --output text 2>/dev/null || echo "not-found")

if [ "$INSTANCE_STATE" != "running" ]; then
    echo "❌ Instance ${INSTANCE_ID} is not running (state: ${INSTANCE_STATE})"
    exit 1
fi

# Get instance public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids ${INSTANCE_ID} \
    --region ${REGION} \
    --query "Reservations[0].Instances[0].PublicIpAddress" \
    --output text)

echo "✅ Instance is running at IP: ${PUBLIC_IP}"

# Create deployment script for API backend
cat > deploy-dashboard-api.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

echo "🔄 Deploying Dashboard API on EC2..."

# Create dashboard API directory
sudo mkdir -p /opt/na-agent-dashboard
sudo chown ec2-user:ec2-user /opt/na-agent-dashboard
cd /opt/na-agent-dashboard

# Clone dashboard repository if not exists
if [ ! -d .git ]; then
    echo "📥 Cloning dashboard repository..."
    git clone https://github.com/NiroAgent/na-agent-dashboard.git .
else
    echo "📥 Updating dashboard repository..."
    git pull origin main
fi

# Install Node.js 18 if not present
if ! node --version | grep -q "v18"; then
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
fi

# Install global dependencies
echo "📦 Installing global dependencies..."
sudo npm install -g pm2

# Install API dependencies
echo "📦 Installing API dependencies..."
cd api
npm ci

# Create production environment file
echo "⚙️ Creating production environment file..."
cat > .env << 'ENV_CONFIG'
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
ENV_CONFIG

# Load secrets from AWS Secrets Manager if available
if aws secretsmanager get-secret-value --secret-id github-agent-token --region us-east-1 >/dev/null 2>&1; then
    echo "🔑 Loading GitHub token from Secrets Manager..."
    GITHUB_TOKEN=$(aws secretsmanager get-secret-value --secret-id github-agent-token --region us-east-1 --query SecretString --output text)
    echo "GITHUB_TOKEN=${GITHUB_TOKEN}" >> .env
fi

if aws secretsmanager get-secret-value --secret-id visualforge-ai/api-keys/development --region us-east-1 >/dev/null 2>&1; then
    echo "🔑 Loading Anthropic API key from Secrets Manager..."
    ANTHROPIC_KEY=$(aws secretsmanager get-secret-value --secret-id visualforge-ai/api-keys/development --region us-east-1 --query SecretString --output text | jq -r .anthropic_api_key)
    echo "ANTHROPIC_API_KEY=${ANTHROPIC_KEY}" >> .env
fi

# Create PM2 ecosystem for dashboard API
echo "📝 Creating PM2 ecosystem for dashboard API..."
cat > ecosystem.config.js << 'PM2_CONFIG'
module.exports = {
  apps: [
    {
      name: 'dashboard-api',
      script: './src/server.ts',
      interpreter: 'npx',
      interpreter_args: 'ts-node',
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

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p /opt/na-agent-dashboard/logs

# Stop existing dashboard API if running
echo "⏹️ Stopping existing dashboard API..."
pm2 delete dashboard-api 2>/dev/null || true

# Start dashboard API with PM2
echo "🚀 Starting dashboard API with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Test API endpoint
echo "🧪 Testing API endpoint..."
sleep 5  # Give API time to start

echo -n "API Health Check: "
if curl -f -s --connect-timeout 5 http://localhost:7777/health > /dev/null; then
    echo "✅ API is online"
else
    echo "❌ API not responding"
    pm2 logs dashboard-api --lines 20
fi

echo ""
echo "✅ Dashboard API deployment complete!"
echo ""
echo "📋 API Information:"
echo "  Port: 7777"
echo "  Health: http://localhost:7777/health"
echo "  Agents: http://localhost:7777/api/dashboard/agents"
echo ""
echo "📝 PM2 Commands:"
echo "  pm2 status"
echo "  pm2 logs dashboard-api"
echo "  pm2 restart dashboard-api"
DEPLOY_SCRIPT

# Deploy using SSM
echo ""
echo "📤 Deploying dashboard API to EC2 instance..."
echo "This may take a few minutes..."

# Send deployment script via SSM
COMMAND_ID=$(aws ssm send-command \
    --instance-ids ${INSTANCE_ID} \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"$(cat deploy-dashboard-api.sh | base64 -w 0)\"]" \
    --comment "Deploy Dashboard API to EC2" \
    --timeout-seconds 600 \
    --region ${REGION} \
    --query "Command.CommandId" \
    --output text)

echo "📝 SSM Command ID: ${COMMAND_ID}"
echo "⏳ Waiting for deployment to complete..."

# Wait for command to complete
aws ssm wait command-executed \
    --command-id ${COMMAND_ID} \
    --instance-id ${INSTANCE_ID} \
    --region ${REGION} 2>/dev/null || true

# Get command result
echo ""
echo "📊 Deployment Result:"
aws ssm get-command-invocation \
    --command-id ${COMMAND_ID} \
    --instance-id ${INSTANCE_ID} \
    --region ${REGION} \
    --query "Status" \
    --output text

# Clean up
rm -f deploy-dashboard-api.sh

echo ""
echo "🎉 Dashboard API deployment initiated!"
echo ""
echo "🌐 API URLs:"
echo "   Health Check: http://${PUBLIC_IP}:7777/health"
echo "   Agents API: http://${PUBLIC_IP}:7777/api/dashboard/agents"
echo "   Live Data: http://${PUBLIC_IP}:7777/api/dashboard/live-data"
echo ""
echo "🔗 Frontend URL:"
echo "   S3 Website: http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com/"
echo ""
echo "📝 Next Steps:"
echo "   1. Update S3 frontend to use API endpoint: http://${PUBLIC_IP}:7777"
echo "   2. Configure CORS in API to allow S3 origin"
echo "   3. Test dashboard functionality"
echo ""

# Test API connectivity
echo "🧪 Testing API connectivity (waiting 30 seconds for startup)..."
sleep 30

echo -n "Dashboard API: "
if curl -f -s --connect-timeout 5 http://${PUBLIC_IP}:7777/health > /dev/null; then
    echo "✅ Online"
else
    echo "⏳ Still starting..."
fi

echo ""
echo "✅ Dashboard API deployment completed!"
echo "📊 Monitor with: ssh -i ~/.ssh/your-key.pem ec2-user@${PUBLIC_IP} 'pm2 status'"