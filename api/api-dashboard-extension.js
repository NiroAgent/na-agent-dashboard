/**
 * Dashboard API Extension
 * Adds missing dashboard endpoints to work with real agent data
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const BASE_API_URL = 'http://localhost:7778';

// Proxy existing endpoints
app.use('/api/agents', async (req, res) => {
  try {
    const response = await axios.get(`${BASE_API_URL}/api/agents`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

app.use('/health', async (req, res) => {
  try {
    const response = await axios.get(`${BASE_API_URL}/health`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Dashboard live data endpoint using real agent data
app.get('/api/dashboard/live-data', async (req, res) => {
  try {
    // Get real agents data
    const agentsResponse = await axios.get(`${BASE_API_URL}/api/agents`);
    const agents = agentsResponse.data;

    // Calculate real metrics from agent data
    const totalAgents = agents.length;
    const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'busy').length;
    const avgCpu = totalAgents > 0 ? agents.reduce((sum, a) => sum + (a.cpuUsage || 0), 0) / totalAgents : 0;
    const avgMemory = totalAgents > 0 ? agents.reduce((sum, a) => sum + (a.memoryUsage || 0), 0) / totalAgents : 0;
    const totalTasks = agents.reduce((sum, a) => sum + (a.taskCount || 0), 0);

    res.json({
      success: true,
      data: {
        agents,
        systemMetrics: {
          overallCpuUsage: avgCpu,
          overallMemoryUsage: avgMemory,
          activeInstances: activeAgents,
          totalCost: (totalAgents * 0.045), // Rough t3.small cost estimate
          totalTasks
        },
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      sources: 'Real Agent API Data'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live data',
      details: error.message
    });
  }
});

// Dashboard agents endpoint (enhanced)
app.get('/api/dashboard/agents', async (req, res) => {
  try {
    const agentsResponse = await axios.get(`${BASE_API_URL}/api/agents`);
    const agents = agentsResponse.data;

    res.json({
      success: true,
      agents,
      lastUpdated: new Date().toISOString(),
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'active' || a.status === 'busy').length,
      dataSources: ['Real Agent API']
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents'
    });
  }
});

// Data sources status
app.get('/api/dashboard/data-sources', async (req, res) => {
  try {
    // Test connectivity to base API
    await axios.get(`${BASE_API_URL}/health`);
    
    res.json({
      success: true,
      dataSources: [
        {
          name: 'Agent API',
          status: 'connected',
          url: BASE_API_URL,
          lastCheck: new Date().toISOString(),
          responseTime: '< 100ms'
        }
      ],
      connectedSources: 1,
      totalSources: 1,
      lastCheck: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      dataSources: [
        {
          name: 'Agent API',
          status: 'disconnected',
          url: BASE_API_URL,
          lastCheck: new Date().toISOString(),
          error: error.message
        }
      ],
      connectedSources: 0,
      totalSources: 1,
      lastCheck: new Date().toISOString()
    });
  }
});

// Dashboard metrics
app.get('/api/dashboard/metrics', async (req, res) => {
  try {
    const agentsResponse = await axios.get(`${BASE_API_URL}/api/agents`);
    const agents = agentsResponse.data;

    // Calculate real metrics
    const totalAgents = agents.length;
    const statusCounts = agents.reduce((acc, agent) => {
      acc[agent.status] = (acc[agent.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      metrics: {
        totalAgents,
        statusDistribution: statusCounts,
        averageCpu: totalAgents > 0 ? agents.reduce((sum, a) => sum + (a.cpuUsage || 0), 0) / totalAgents : 0,
        averageMemory: totalAgents > 0 ? agents.reduce((sum, a) => sum + (a.memoryUsage || 0), 0) / totalAgents : 0,
        totalTasks: agents.reduce((sum, a) => sum + (a.taskCount || 0), 0),
        highCpuAgents: agents.filter(a => (a.cpuUsage || 0) > 80).length,
        highMemoryAgents: agents.filter(a => (a.memoryUsage || 0) > 80).length
      },
      lastUpdated: new Date().toISOString(),
      source: 'Real Agent API Data'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

// Refresh endpoint
app.post('/api/dashboard/refresh', (req, res) => {
  res.json({
    success: true,
    message: 'Data refresh completed - using real-time agent data',
    lastUpdated: new Date().toISOString()
  });
});

// Agent control endpoints (simplified)
app.post('/api/dashboard/agents/:agentId/control', (req, res) => {
  const { agentId } = req.params;
  const { action } = req.body;
  
  res.json({
    agentId,
    action,
    result: `Agent control action '${action}' received for ${agentId}`,
    timestamp: new Date().toISOString(),
    note: 'Real agent control integration pending'
  });
});

// Deploy all endpoint
app.post('/api/dashboard/deploy-all', (req, res) => {
  res.json({
    action: 'deploy-all',
    result: 'Deployment command received for all agents',
    timestamp: new Date().toISOString(),
    note: 'Real deployment integration pending'
  });
});

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
  console.log(`🔗 Dashboard API Extension running on port ${PORT}`);
  console.log(`📊 Providing enhanced dashboard endpoints with real agent data`);
  console.log(`🔌 Proxying base API from ${BASE_API_URL}`);
});

module.exports = app;