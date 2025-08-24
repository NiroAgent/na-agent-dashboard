#!/bin/bash
set -e

INSTANCE_IP="54.175.94.45"
INSTANCE_ID="i-0cf0c4521a4ea0eb3"
DEPLOYMENT_URL="https://niro-agent-dashboard-dev-816454053517.s3.amazonaws.com/deployments/live-api-$(date +%Y%m%d-%H%M%S).tar.gz"

echo "Deploying live TypeScript API to existing instance: $INSTANCE_IP"

# Deploy via SSM
aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters commands="[
        'echo \"Starting live API deployment...\"',
        'sudo dnf update -y',
        'sudo dnf install -y wget git nodejs npm --allowerasing',
        'sudo npm install -g pm2@latest',
        'sudo mkdir -p /opt/niro-live-api',
        'cd /opt/niro-live-api',
        'wget https://niro-agent-dashboard-dev-816454053517.s3.amazonaws.com/deployments/live-api-20250823-104648.tar.gz -O deployment.tar.gz',
        'tar -xzf deployment.tar.gz',
        'cd live-api',
        'npm install --production',
        'sudo pm2 delete niro-live-api || true',
        'PORT=7777 pm2 start dist/index.js --name niro-live-api',
        'pm2 save',
        'pm2 startup systemd || true',
        'curl -f http://localhost:7777/api/health',
        'echo \"Deployment complete!\"'
    ]" \
    --region us-east-1 \
    --output text \
    --query 'Command.CommandId'
