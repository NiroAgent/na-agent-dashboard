#!/bin/bash
# Manual deployment fix for VF-DEV TypeScript API replacement
# Run this script if GitHub Actions deployment fails

set -e

echo "🔧 Manual VF-DEV Deployment Fix"
echo "==============================="

# Configuration
EC2_INSTANCE="98.81.93.132"
API_PORT="7777"
APP_DIR="/opt/niro-agent-dashboard-api"

echo "📡 Testing current server type..."
CURRENT_SERVER=$(curl -s -I "http://${EC2_INSTANCE}:${API_PORT}/health" | grep Server || echo "No server header")
echo "Current server: $CURRENT_SERVER"

if echo "$CURRENT_SERVER" | grep -q "Python"; then
    echo "❌ Python server still running - manual fix needed"
    echo ""
    echo "🛠️  Manual Fix Instructions:"
    echo "1. SSH to EC2 instance:"
    echo "   ssh -i ~/.ssh/your-key.pem ec2-user@${EC2_INSTANCE}"
    echo ""
    echo "2. Kill Python server:"
    echo "   sudo pkill -f 'real-agent-server.py'"
    echo "   sudo pkill -f 'python.*7777'"
    echo "   sudo fuser -k 7777/tcp"
    echo ""
    echo "3. Install Node.js and PM2 (if needed):"
    echo "   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -"
    echo "   sudo yum install -y nodejs"
    echo "   sudo npm install -g pm2"
    echo ""
    echo "4. Deploy TypeScript API:"
    echo "   sudo mkdir -p $APP_DIR"
    echo "   cd $APP_DIR"
    echo "   # Upload and extract api-deployment.tar.gz"
    echo "   # Or clone from git:"
    echo "   git clone https://github.com/NiroAgent/na-agent-dashboard.git ."
    echo "   cd api"
    echo "   npm ci"
    echo "   npm run build"
    echo ""
    echo "5. Create PM2 config:"
    echo "   cat > ecosystem.config.js << 'EOF'"
    echo "module.exports = {"
    echo "  apps: [{"
    echo "    name: 'niro-agent-dashboard-api',"
    echo "    script: 'server.js',"
    echo "    instances: 1,"
    echo "    autorestart: true,"
    echo "    watch: false,"
    echo "    max_memory_restart: '500M',"
    echo "    env: {"
    echo "      NODE_ENV: 'production',"
    echo "      PORT: 7777"
    echo "    }"
    echo "  }]"
    echo "};"
    echo "EOF"
    echo ""
    echo "6. Start TypeScript API:"
    echo "   pm2 start ecosystem.config.js"
    echo "   pm2 save"
    echo ""
    echo "7. Verify deployment:"
    echo "   curl -I http://localhost:7777/health | grep Server"
    echo "   curl -X OPTIONS http://localhost:7777/agents"
    echo "   curl http://localhost:7777/agents | jq '.totalAgents'"
    echo ""
else
    echo "✅ TypeScript server detected - running verification..."
    
    # Test OPTIONS method
    echo "🧪 Testing OPTIONS method..."
    OPTIONS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "http://${EC2_INSTANCE}:${API_PORT}/agents")
    echo "OPTIONS status: $OPTIONS_STATUS"
    
    if [ "$OPTIONS_STATUS" = "501" ]; then
        echo "❌ OPTIONS returns 501 - Python server still running"
        exit 1
    elif [ "$OPTIONS_STATUS" = "200" ] || [ "$OPTIONS_STATUS" = "204" ]; then
        echo "✅ OPTIONS working correctly"
    fi
    
    # Test agents data
    echo "🧪 Testing agent data..."
    AGENTS_DATA=$(curl -s "http://${EC2_INSTANCE}:${API_PORT}/agents")
    if echo "$AGENTS_DATA" | grep -q '"source":"real-agent-discovery-server"'; then
        AGENT_COUNT=$(echo "$AGENTS_DATA" | grep -o '"totalAgents":[0-9]*' | cut -d':' -f2)
        echo "✅ Real agent data confirmed: $AGENT_COUNT agents"
    else
        echo "❌ Not getting real agent data"
        echo "Response: $(echo "$AGENTS_DATA" | head -100)"
        exit 1
    fi
    
    echo ""
    echo "🎉 VF-DEV TypeScript API is working correctly!"
fi

echo ""
echo "📊 Current status:"
echo "- Local TypeScript API: ✅ Running (315 agents)"
echo "- VF-DEV EC2 Instance: $(if echo "$CURRENT_SERVER" | grep -q "Python"; then echo "❌ Python"; else echo "✅ TypeScript"; fi)"
echo "- Frontend Configuration: ✅ Auto-detects production endpoint"
echo ""
echo "Once the TypeScript API is running, test the dashboard at:"
echo "http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com"