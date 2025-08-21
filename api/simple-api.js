const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 7778;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Generate realistic demo agents
function generateDemoAgents() {
  const agentTypes = [
    { type: 'architect', count: 5 },
    { type: 'developer', count: 20 },
    { type: 'qa', count: 10 },
    { type: 'devops', count: 5 },
    { type: 'manager', count: 5 },
    { type: 'security', count: 3 },
    { type: 'analytics', count: 2 }
  ];

  const agents = [];
  let agentIndex = 1;

  for (const agentType of agentTypes) {
    for (let i = 0; i < agentType.count; i++) {
      const statuses = ['running', 'stopped', 'starting', 'error'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      agents.push({
        id: `agent-${agentIndex}`,
        name: `${agentType.type}-${i + 1}`,
        type: agentType.type,
        status: randomStatus,
        platform: 'ec2',
        instanceId: `i-${agentIndex.toString().padStart(8, '0')}`,
        cpuUsage: Math.floor(Math.random() * 100),
        memoryUsage: Math.floor(Math.random() * 100),
        taskCount: Math.floor(Math.random() * 20),
        metrics: {
          cpuUtilization: Math.floor(Math.random() * 100),
          memoryUtilization: Math.floor(Math.random() * 100),
          networkIn: Math.floor(Math.random() * 1000000),
          networkOut: Math.floor(Math.random() * 1000000),
          diskUsage: Math.floor(Math.random() * 100)
        },
        cost: {
          hourly: 0.035,
          daily: 0.84,
          monthly: 25.2
        },
        launchTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        lastStatusChange: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        lastSeen: new Date()
      });
      
      agentIndex++;
    }
  }

  return agents;
}

// Generate agents once at startup
const demoAgents = generateDemoAgents();

// Update agent metrics every 30 seconds to simulate live data
setInterval(() => {
  demoAgents.forEach(agent => {
    agent.cpuUsage = Math.floor(Math.random() * 100);
    agent.memoryUsage = Math.floor(Math.random() * 100);
    agent.taskCount = Math.max(0, agent.taskCount + Math.floor(Math.random() * 3) - 1);
    agent.metrics.cpuUtilization = Math.floor(Math.random() * 100);
    agent.metrics.memoryUtilization = Math.floor(Math.random() * 100);
    agent.lastSeen = new Date();
    
    // Occasionally change status
    if (Math.random() < 0.1) { // 10% chance
      const statuses = ['running', 'idle', 'busy', 'error'];
      agent.status = statuses[Math.floor(Math.random() * statuses.length)];
      agent.lastStatusChange = new Date();
    }
  });
}, 30000);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'na-agent-dashboard-api-simple',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: 'development',
    agentCount: demoAgents.length
  });
});

// Simple agents endpoint (compatible with both old and new frontend)
app.get('/api/agents', (req, res) => {
  // Return data in the same format as the Python API for compatibility
  const compatibleAgents = demoAgents.map(agent => ({
    id: agent.id,
    name: agent.name,
    status: agent.status,
    cpuUsage: agent.cpuUsage,
    memoryUsage: agent.memoryUsage,
    taskCount: agent.taskCount
  }));
  
  res.json(compatibleAgents);
});

// Full agents endpoint (with all TypeScript features)
app.get('/api/agents/full', (req, res) => {
  res.json(demoAgents);
});

// Dashboard agents endpoint (for new frontend)
app.get('/api/dashboard/agents', (req, res) => {
  res.json({
    success: true,
    agents: demoAgents,
    lastUpdated: new Date().toISOString(),
    totalAgents: demoAgents.length,
    activeAgents: demoAgents.filter(a => a.status === 'running').length,
    dataSources: ['Demo Mode']
  });
});

// Live data endpoint
app.get('/api/dashboard/live-data', (req, res) => {
  res.json({
    success: true,
    data: {
      agents: demoAgents,
      systemMetrics: {
        overallCpuUsage: demoAgents.reduce((sum, a) => sum + a.cpuUsage, 0) / demoAgents.length,
        overallMemoryUsage: demoAgents.reduce((sum, a) => sum + a.memoryUsage, 0) / demoAgents.length,
        activeInstances: demoAgents.filter(a => a.status === 'running').length,
        totalCost: demoAgents.length * 0.035
      },
      policies: {
        totalAssessments: 150,
        allowedOperations: 120,
        deniedOperations: 30,
        averageRiskLevel: 0.3
      },
      lastUpdated: new Date().toISOString(),
      dataSources: ['Demo Mode']
    },
    timestamp: new Date().toISOString(),
    sources: 'Demo Mode - TypeScript API'
  });
});

// Agent statistics
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    totalAgents: demoAgents.length,
    activeAgents: demoAgents.filter(a => a.status === 'running').length,
    totalTasks: demoAgents.reduce((sum, a) => sum + a.taskCount, 0),
    averageCpu: Math.round(demoAgents.reduce((sum, a) => sum + a.cpuUsage, 0) / demoAgents.length),
    timestamp: new Date().toISOString()
  });
});

// Agent heartbeat endpoint (for live agents to report to)
app.post('/api/agents/:agentId/heartbeat', (req, res) => {
  const { agentId } = req.params;
  const heartbeat = req.body;
  
  console.log(`💓 Heartbeat from ${agentId}:`, {
    status: heartbeat.status,
    cpu: heartbeat.metrics?.cpuUsage,
    tasks: heartbeat.metrics?.currentTasks
  });
  
  res.json({
    success: true,
    message: 'Heartbeat recorded',
    agentId,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'GET /health',
      'GET /api/agents',
      'GET /api/dashboard/agents',
      'GET /api/dashboard/live-data',
      'GET /api/dashboard/stats',
      'POST /api/agents/:agentId/heartbeat'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple TypeScript-compatible API running on port ${PORT}`);
  console.log(`📊 Generated ${demoAgents.length} demo agents`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Agents API: http://localhost:${PORT}/api/agents`);
  console.log(`📈 Live updating every 30 seconds`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
