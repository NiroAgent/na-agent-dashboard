#!/bin/bash

# Application Deployment Script
# Deploys frontend and API using CloudFormation outputs

set -e

ENVIRONMENT=${1:-dev}
STACK_NAME="niro-agent-dashboard-${ENVIRONMENT}"

echo "🚀 Deploying application for environment: $ENVIRONMENT"

# Get infrastructure outputs
if [ ! -f "stack-outputs-${ENVIRONMENT}.json" ]; then
  echo "📊 Getting stack outputs..."
  aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs' \
    --output json > "stack-outputs-${ENVIRONMENT}.json"
fi

# Extract values
FRONTEND_BUCKET=$(jq -r '.[] | select(.OutputKey=="FrontendBucketName") | .OutputValue' "stack-outputs-${ENVIRONMENT}.json")
CLOUDFRONT_ID=$(jq -r '.[] | select(.OutputKey=="CloudFrontDistributionId") | .OutputValue' "stack-outputs-${ENVIRONMENT}.json")
API_ENDPOINT=$(jq -r '.[] | select(.OutputKey=="ApiEndpoint") | .OutputValue' "stack-outputs-${ENVIRONMENT}.json")
AGENT_INSTANCE_ID=$(jq -r '.[] | select(.OutputKey=="AgentInstanceId") | .OutputValue' "stack-outputs-${ENVIRONMENT}.json")

echo "📋 Deployment Configuration:"
echo "  Frontend Bucket: $FRONTEND_BUCKET"
echo "  CloudFront ID: $CLOUDFRONT_ID"
echo "  API Endpoint: $API_ENDPOINT"
echo "  Agent Instance: $AGENT_INSTANCE_ID"

# Build and deploy frontend
echo "🔨 Building frontend..."
cd mfe

# Create environment file
cat > .env.production << EOF
VITE_API_BASE_URL=$API_ENDPOINT
VITE_WS_URL=$API_ENDPOINT
VITE_ENVIRONMENT=$ENVIRONMENT
EOF

npm ci
npm run build

echo "☁️ Deploying frontend to S3..."
aws s3 sync dist/ s3://$FRONTEND_BUCKET/ \
  --delete \
  --cache-control "public, max-age=31536000" \
  --exclude "*.html" \
  --exclude "*.json"

# Deploy HTML files with shorter cache
aws s3 sync dist/ s3://$FRONTEND_BUCKET/ \
  --delete \
  --cache-control "public, max-age=0, must-revalidate" \
  --include "*.html" \
  --include "*.json"

echo "🔄 Creating CloudFront invalidation..."
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_ID \
  --paths "/*"

cd ..

# Deploy API
echo "🔧 Deploying API to agent server..."
cd api

# Create deployment package
npm ci --production
tar -czf ../api-deployment.tar.gz \
  --exclude=node_modules/.cache \
  --exclude=*.log \
  --exclude=.env.local \
  .

cd ..

# Upload to S3 for transfer
DEPLOYMENT_KEY="deployments/api-$(date +%Y%m%d-%H%M%S).tar.gz"
aws s3 cp api-deployment.tar.gz s3://$FRONTEND_BUCKET/$DEPLOYMENT_KEY

# Deploy via SSM
echo "📦 Deploying API via Systems Manager..."
COMMAND_ID=$(aws ssm send-command \
  --instance-ids $AGENT_INSTANCE_ID \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    \"#!/bin/bash\",
    \"set -e\",
    \"echo 'Starting API deployment...'\",
    \"# Install Node.js if not present\",
    \"if ! command -v node &> /dev/null; then\",
    \"  curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -\",
    \"  sudo yum install -y nodejs\",
    \"fi\",
    \"# Install PM2 if not present\",
    \"if ! command -v pm2 &> /dev/null; then\",
    \"  sudo npm install -g pm2\",
    \"fi\",
    \"# Create application directory\",
    \"sudo mkdir -p /opt/niro-agent-dashboard-api\",
    \"sudo chown \$USER:\$USER /opt/niro-agent-dashboard-api\",
    \"# Download deployment package\",
    \"cd /opt/niro-agent-dashboard-api\",
    \"aws s3 cp s3://$FRONTEND_BUCKET/$DEPLOYMENT_KEY ./api-deployment.tar.gz\",
    \"tar -xzf api-deployment.tar.gz\",
    \"rm -f api-deployment.tar.gz\",
    \"# Create production environment\",
    \"cat > .env << 'ENV_EOF'\",
    \"NODE_ENV=production\",
    \"PORT=7777\",
    \"AWS_REGION=${AWS_REGION:-us-east-1}\",
    \"CORS_ORIGIN=*\",
    \"ENV_EOF\",
    \"# Create PM2 config\",
    \"cat > ecosystem.config.js << 'PM2_EOF'\",
    \"module.exports = {\",
    \"  apps: [{\",
    \"    name: 'niro-agent-dashboard-api',\",
    \"    script: 'server.js',\",
    \"    instances: 1,\",
    \"    autorestart: true,\",
    \"    watch: false,\",
    \"    max_memory_restart: '500M',\",
    \"    env: {\",
    \"      NODE_ENV: 'production',\",
    \"      PORT: 7777\",
    \"    }\",
    \"  }]\",
    \"};\",
    \"PM2_EOF\",
    \"# Stop and restart API\",
    \"pm2 stop niro-agent-dashboard-api 2>/dev/null || echo 'No existing instance'\",
    \"pm2 delete niro-agent-dashboard-api 2>/dev/null || echo 'No existing instance'\",
    \"pm2 start ecosystem.config.js\",
    \"pm2 save\",
    \"# Setup startup script\",
    \"sudo env PATH=\$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u \$USER --hp \$HOME\",
    \"# Test deployment\",
    \"sleep 5\",
    \"curl -f http://localhost:7777/health || (pm2 logs niro-agent-dashboard-api --lines 10 && exit 1)\",
    \"echo 'API deployment successful'\"
  ]" \
  --comment "Deploy Niro Agent Dashboard API - $ENVIRONMENT" \
  --timeout-seconds 300 \
  --query 'Command.CommandId' \
  --output text)

echo "⏳ Waiting for API deployment (Command ID: $COMMAND_ID)..."
sleep 30

# Check deployment status
for i in {1..10}; do
  STATUS=$(aws ssm get-command-invocation \
    --command-id $COMMAND_ID \
    --instance-id $AGENT_INSTANCE_ID \
    --query 'Status' \
    --output text)
  
  if [ "$STATUS" = "Success" ]; then
    echo "✅ API deployment successful"
    break
  elif [ "$STATUS" = "Failed" ]; then
    echo "❌ API deployment failed"
    aws ssm get-command-invocation \
      --command-id $COMMAND_ID \
      --instance-id $AGENT_INSTANCE_ID \
      --query 'StandardErrorContent' \
      --output text
    exit 1
  else
    echo "⏳ Deployment status: $STATUS (attempt $i/10)"
    sleep 10
  fi
done

# Test API health
echo "🧪 Testing API health..."
for i in {1..5}; do
  if curl -f $API_ENDPOINT/health; then
    echo "✅ API is healthy"
    break
  else
    echo "⏳ Waiting for API... (attempt $i/5)"
    sleep 10
  fi
done

# Cleanup
rm -f api-deployment.tar.gz

echo ""
echo "🎉 Application deployment complete!"
echo "📍 Frontend URL: $(jq -r '.[] | select(.OutputKey=="WebsiteURL") | .OutputValue' "stack-outputs-${ENVIRONMENT}.json")"
echo "🔧 API Endpoint: $API_ENDPOINT"
echo "❤️ Health Check: $API_ENDPOINT/health"
echo "📊 Agents Data: $API_ENDPOINT/api/dashboard/agents"
