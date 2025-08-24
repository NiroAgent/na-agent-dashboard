#!/bin/bash

# Deploy Full TypeScript API to EC2 Instance
# This replaces the bootstrap with the complete live agent management system

set -e

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <instance-public-ip>"
    echo "Example: $0 98.81.93.132"
    exit 1
fi

INSTANCE_IP=$1
PORT=7777
SSH_KEY_PATH="$HOME/.ssh/niroforge-dev.pem"

echo "🚀 Deploying Full TypeScript API to $INSTANCE_IP:$PORT"
echo ""

# Build the TypeScript API
echo "🔨 Building TypeScript API..."
cd api
npm run build

if [[ $? -ne 0 ]]; then
    echo "❌ TypeScript build failed"
    exit 1
fi

echo "✅ TypeScript API built successfully"
cd ..

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf deployment-package.tar.gz \
    api/dist/ \
    api/package.json \
    api/package-lock.json \
    api/src/services/ \
    api/src/config/ \
    na-business-service/ai-agent-deployment/ \
    na-autonomous-system/*.py

echo "✅ Deployment package created"

# Deploy via SSM (preferred) or SCP if SSH key exists
if aws ssm describe-instance-information --filters "Name=tag:Service,Values=live-typescript-api" --region us-east-1 | grep -q "InstanceInformationList"; then
    echo "📡 Using SSM for deployment..."
    
    # Get instance ID from IP
    INSTANCE_ID=$(aws ec2 describe-instances \
        --filters "Name=ip-address,Values=$INSTANCE_IP" "Name=instance-state-name,Values=running" \
        --query 'Reservations[].Instances[].InstanceId' \
        --output text \
        --region us-east-1)
    
    if [[ -z "$INSTANCE_ID" ]]; then
        echo "❌ Could not find instance ID for IP: $INSTANCE_IP"
        exit 1
    fi
    
    echo "🔍 Found instance: $INSTANCE_ID"
    
    # Upload deployment package via S3 (temporary)
    BUCKET_NAME="niroforge-deployment-temp-$(date +%s)"
    aws s3 mb s3://$BUCKET_NAME --region us-east-1
    aws s3 cp deployment-package.tar.gz s3://$BUCKET_NAME/
    
    # Deploy via SSM
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters commands="[
            'cd /opt/niro-agent-api',
            'pm2 stop niro-live-api',
            'aws s3 cp s3://$BUCKET_NAME/deployment-package.tar.gz .',
            'tar -xzf deployment-package.tar.gz',
            'npm install --production',
            'pm2 start dist/index.js --name niro-live-api-full',
            'pm2 save',
            'echo \"✅ Full TypeScript API deployed\"'
        ]" \
        --region us-east-1
        
    # Cleanup S3 bucket
    aws s3 rm s3://$BUCKET_NAME/deployment-package.tar.gz
    aws s3 rb s3://$BUCKET_NAME
    
    echo "📡 SSM deployment command sent"

elif [[ -f "$SSH_KEY_PATH" ]]; then
    echo "🔑 Using SSH for deployment..."
    
    # Copy deployment package
    scp -i "$SSH_KEY_PATH" deployment-package.tar.gz ec2-user@$INSTANCE_IP:/tmp/
    
    # Deploy via SSH
    ssh -i "$SSH_KEY_PATH" ec2-user@$INSTANCE_IP << 'EOF'
        cd /opt/niro-agent-api
        
        # Stop current service
        pm2 stop niro-live-api
        
        # Backup current version
        cp -r . ../niro-agent-api-backup-$(date +%s)
        
        # Extract new version
        tar -xzf /tmp/deployment-package.tar.gz
        
        # Install dependencies
        npm install --production
        
        # Start full TypeScript API
        pm2 start dist/index.js --name niro-live-api-full
        pm2 save
        
        echo "✅ Full TypeScript API deployed via SSH"
EOF
    
    echo "🔑 SSH deployment completed"
    
else
    echo "❌ No deployment method available"
    echo "Either configure SSM access or provide SSH key at: $SSH_KEY_PATH"
    exit 1
fi

# Test the deployment
echo "🧪 Testing full TypeScript API deployment..."
sleep 10

echo "Health check:"
curl -f "http://$INSTANCE_IP:$PORT/api/health" | jq '.'

echo ""
echo "Live agents check:"
curl -f "http://$INSTANCE_IP:$PORT/api/dashboard/agents" | jq '.totalAgents'

echo ""
echo "✅ Full TypeScript API deployment completed!"
echo "🔗 API Endpoint: http://$INSTANCE_IP:$PORT/api/dashboard/agents"
echo "🔌 WebSocket: ws://$INSTANCE_IP:$PORT"

# Cleanup
rm -f deployment-package.tar.gz

echo "🎯 Ready to update frontend configuration!"