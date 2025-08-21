#!/bin/bash

echo "🚀 Deploying API to Agent Server..."

# Configuration
INSTANCE_ID="i-0af59b7036f7b0b77"
API_PORT="7777"
GITHUB_REPO_URL="https://github.com/yourusername/na-agent-dashboard"  # Update with actual repo

echo "📋 Agent Server Instance: $INSTANCE_ID"
echo "🌐 API Port: $API_PORT"

# Check if instance is running
echo "🔍 Checking instance status..."
INSTANCE_STATE=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query "Reservations[0].Instances[0].State.Name" --output text)

if [ "$INSTANCE_STATE" != "running" ]; then
    echo "❌ Instance $INSTANCE_ID is not running (current state: $INSTANCE_STATE)"
    exit 1
fi

echo "✅ Instance is running"

# Get instance public IP
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query "Reservations[0].Instances[0].PublicIpAddress" --output text)
echo "🌐 Public IP: $PUBLIC_IP"

# Create deployment commands
COMMANDS="#!/bin/bash
set -e

echo 'Starting API deployment...'

# Create project directory
sudo mkdir -p /opt/niro-agent-dashboard
cd /opt/niro-agent-dashboard

# Update system packages
sudo apt-get update

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Clone or update repository (for now, copy the API files manually)
# git clone $GITHUB_REPO_URL .

# Create a simple API server
cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 7777;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data for agents
const generateMockAgents = () => {
  const agents = [];
  const roles = ['ai-architect', 'ai-developer', 'ai-devops', 'ai-manager', 'ai-qa'];
  const statuses = ['active', 'idle', 'busy', 'error'];
  
  for (let i = 1; i <= 50; i++) {
    agents.push({
      id: \`agent-\${i}\`,
      name: \`Agent \${i}\`,
      role: roles[Math.floor(Math.random() * roles.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      lastHeartbeat: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      cpuUsage: Math.floor(Math.random() * 100),
      memoryUsage: Math.floor(Math.random() * 100),
      taskCount: Math.floor(Math.random() * 20),
      successRate: Math.floor(Math.random() * 40) + 60
    });
  }
  return agents;
};

let mockAgents = generateMockAgents();

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Niro Agent Dashboard API', version: '1.0.0' });
});

app.get('/api/agents', (req, res) => {
  res.json(mockAgents);
});

app.get('/api/agents/:id', (req, res) => {
  const agent = mockAgents.find(a => a.id === req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agent);
});

app.get('/api/stats', (req, res) => {
  const totalAgents = mockAgents.length;
  const activeAgents = mockAgents.filter(a => a.status === 'active').length;
  const busyAgents = mockAgents.filter(a => a.status === 'busy').length;
  const errorAgents = mockAgents.filter(a => a.status === 'error').length;
  
  res.json({
    totalAgents,
    activeAgents,
    busyAgents,
    errorAgents,
    averageCpuUsage: Math.floor(mockAgents.reduce((sum, a) => sum + a.cpuUsage, 0) / totalAgents),
    averageMemoryUsage: Math.floor(mockAgents.reduce((sum, a) => sum + a.memoryUsage, 0) / totalAgents)
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`API server running on http://0.0.0.0:\${PORT}\`);
});
EOF

# Create package.json
cat > package.json << 'EOF'
{
  \"name\": \"niro-agent-dashboard-api\",
  \"version\": \"1.0.0\",
  \"description\": \"API server for Niro Agent Dashboard\",
  \"main\": \"server.js\",
  \"scripts\": {
    \"start\": \"node server.js\"
  },
  \"dependencies\": {
    \"express\": \"^4.18.2\",
    \"cors\": \"^2.8.5\"
  }
}
EOF

# Install dependencies
sudo npm install

# Stop any existing PM2 processes
sudo pm2 delete niro-api || true

# Start API server with PM2
sudo pm2 start server.js --name niro-api

# Save PM2 configuration
sudo pm2 save
sudo pm2 startup

echo 'API deployment completed!'
echo \"API accessible at: http://$PUBLIC_IP:7777\"
"

# Write commands to a temporary file
echo "$COMMANDS" > /tmp/deploy-api-commands.sh
chmod +x /tmp/deploy-api-commands.sh

# Execute commands on the instance using SSM
echo "🚀 Executing deployment commands on instance..."
COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["bash /tmp/deploy-api-commands.sh"]' \
    --query "Command.CommandId" \
    --output text)

echo "📋 Command ID: $COMMAND_ID"
echo "⏳ Waiting for command execution..."

# Wait for command completion
aws ssm wait command-executed \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID"

# Get command output
echo "📄 Command output:"
aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --query "StandardOutputContent" \
    --output text

echo "✅ API deployment completed!"
echo "🌐 Frontend URL: http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com"
echo "🔗 API URL: http://$PUBLIC_IP:$API_PORT"
