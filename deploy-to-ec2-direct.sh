#!/bin/bash

# Direct deployment to EC2 instance
INSTANCE_IP="54.175.94.45"
INSTANCE_ID="i-0cf0c4521a4ea0eb3"

echo "🚀 Deploying Live API to EC2 instance $INSTANCE_IP"

# Create deployment script for EC2
cat > deploy-on-ec2.sh << 'EOF'
#!/bin/bash
cd /opt

# Download and setup
sudo dnf update -y
sudo dnf install -y wget nodejs npm --allowerasing

# Download deployment package
wget https://niro-agent-dashboard-dev-816454053517.s3.amazonaws.com/deployments/production-api-20250823-105849.tar.gz -O api.tar.gz
tar -xzf api.tar.gz

# Install dependencies and start
npm install --production
PORT=7777 nohup node minimal-server.js > api.log 2>&1 &

# Test deployment
sleep 5
curl http://localhost:7777/health

echo "✅ Deployment complete"
echo "🔗 API available at: http://54.175.94.45:7777"
EOF

# Try to upload and execute via SCP if SSH key exists
if [[ -f ~/.ssh/niroforge-dev.pem ]]; then
    echo "📤 Uploading deployment script via SCP..."
    scp -i ~/.ssh/niroforge-dev.pem deploy-on-ec2.sh ec2-user@$INSTANCE_IP:/tmp/
    ssh -i ~/.ssh/niroforge-dev.pem ec2-user@$INSTANCE_IP "chmod +x /tmp/deploy-on-ec2.sh && sudo /tmp/deploy-on-ec2.sh"
else
    echo "❌ No SSH key found. Deployment script created but cannot execute automatically."
    echo "💡 Manual deployment required:"
    echo "1. Copy this script to the EC2 instance"
    echo "2. Execute: chmod +x deploy-on-ec2.sh && sudo ./deploy-on-ec2.sh"
fi

# Cleanup
rm deploy-on-ec2.sh