/**
 * API Compatibility Bridge
 * Provides missing dashboard endpoints as a temporary bridge
 * until the full dashboard API is deployed
 */

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Basic live data simulation
app.get('/api/dashboard/live-data', (req, res) => {
  res.json({
    success: true,
    data: {
      agents: [], // Will be populated by frontend from /api/agents
      systemMetrics: {
        cpuUsage: Math.floor(Math.random() * 100),
        memoryUsage: Math.floor(Math.random() * 100),
        diskUsage: Math.floor(Math.random() * 100)
      },
      lastUpdated: new Date().toISOString()
    },
    timestamp: new Date().toISOString(),
    sources: 'Compatibility Bridge'
  });
});

// Data sources status
app.get('/api/dashboard/data-sources', (req, res) => {
  res.json({
    success: true,
    dataSources: [
      { name: 'EC2 Agent Server', status: 'connected', lastCheck: new Date().toISOString() },
      { name: 'Local Agents API', status: 'connected', lastCheck: new Date().toISOString() }
    ],
    connectedSources: 2,
    totalSources: 2,
    lastCheck: new Date().toISOString()
  });
});

// Refresh endpoint
app.post('/api/dashboard/refresh', (req, res) => {
  res.json({
    success: true,
    message: 'Data refresh completed (compatibility bridge)',
    lastUpdated: new Date().toISOString()
  });
});

// Agent control endpoint
app.post('/api/dashboard/agents/:agentId/control', (req, res) => {
  const { agentId } = req.params;
  const { action } = req.body;
  
  res.json({
    agentId,
    action,
    result: `Action '${action}' executed (compatibility bridge)`,
    timestamp: new Date().toISOString()
  });
});

// Deploy all endpoint
app.post('/api/dashboard/deploy-all', (req, res) => {
  res.json({
    action: 'deploy-all',
    result: 'Deployment initiated (compatibility bridge)',
    timestamp: new Date().toISOString()
  });
});

// GitHub issues endpoint
app.get('/api/github/issues', (req, res) => {
  res.json([
    {
      number: 1,
      title: 'Dashboard deployment verification',
      body: 'Verify that all dashboard components are working correctly',
      state: 'open',
      created_at: new Date().toISOString(),
      labels: [{ name: 'agent-task', color: '00ff88' }],
      repository: 'na-agent-dashboard'
    }
  ]);
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🔗 API Compatibility Bridge running on port ${PORT}`);
  console.log(`📍 Providing missing dashboard endpoints until full API deployment`);
});

module.exports = app;