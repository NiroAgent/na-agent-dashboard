#!/bin/bash
# Deploy Real Agent Server to AWS Instance
# Instance: i-0ccef64d08cb88e6a (18.209.35.249)

INSTANCE_IP="18.209.35.249"
INSTANCE_ID="i-0ccef64d08cb88e6a"
KEY_PATH="~/.ssh/aws-key.pem"  # Update with actual key path

echo "🚀 Deploying Real Agent Server to AWS..."

# Method 1: Try direct SSH upload (if key is available)
if [ -f "$KEY_PATH" ]; then
    echo "📤 Uploading server file via SSH..."
    scp -i "$KEY_PATH" -o StrictHostKeyChecking=no \
        aws-real-agent-server.py ubuntu@$INSTANCE_IP:~/real-agent-server.py
        
    echo "🔧 Installing dependencies and starting server..."
    ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'EOF'
        sudo apt-get update
        sudo apt-get install -y python3 python3-pip
        pip3 install flask flask-cors psutil
        
        # Kill any existing server
        pkill -f "real-agent-server.py" || true
        pkill -f "python3.*7778" || true
        
        # Start the server in background
        nohup python3 ~/real-agent-server.py > ~/agent-server.log 2>&1 &
        sleep 3
        
        # Check if server started
        if curl -s http://localhost:7778/health > /dev/null; then
            echo "✅ Server started successfully on port 7778"
            curl -s http://localhost:7778/health | jq .
        else
            echo "❌ Server failed to start"
            tail -20 ~/agent-server.log
        fi
EOF
    
else
    echo "🔧 SSH key not found. Using alternative deployment method..."
    
    # Method 2: Use AWS Systems Manager (if configured)
    echo "📤 Deploying via AWS SSM..."
    
    # Upload file to S3 first
    aws s3 cp aws-real-agent-server.py s3://niro-agent-dashboard-dev-816454053517/aws-real-agent-server.py
    
    # Use SSM to download and run
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=[
            "sudo apt-get update && sudo apt-get install -y python3 python3-pip curl jq",
            "pip3 install flask flask-cors psutil",
            "aws s3 cp s3://niro-agent-dashboard-dev-816454053517/aws-real-agent-server.py ~/real-agent-server.py",
            "chmod +x ~/real-agent-server.py",
            "pkill -f \"real-agent-server.py\" || true",
            "nohup python3 ~/real-agent-server.py > ~/agent-server.log 2>&1 &",
            "sleep 5",
            "curl -s http://localhost:7778/health || echo \"Server not responding\""
        ]' \
        --output table
        
    echo "⏳ Waiting for deployment to complete..."
    sleep 30
fi

# Test the deployed server
echo "🧪 Testing deployed server..."
curl -s http://$INSTANCE_IP:7778/health && echo "✅ Health endpoint working" || echo "❌ Health endpoint failed"
curl -s http://$INSTANCE_IP:7778/api/agents | head -5 && echo "✅ Agents endpoint working" || echo "❌ Agents endpoint failed"

echo "🎯 Deployment complete!"
echo "🌐 Server should be available at: http://$INSTANCE_IP:7778"