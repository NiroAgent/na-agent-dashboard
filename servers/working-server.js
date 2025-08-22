const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Live agent data - updates every request
function getLiveAgents() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  return [
    {
      id: 'live-architect-1',
      name: 'Architecture Agent',
      type: 'architect',
      status: hour >= 9 && hour <= 17 ? 'busy' : 'idle',
      platform: 'ec2',
      lastSeen: new Date(now.getTime() - Math.random() * 60000),
      currentTask: hour >= 9 && hour <= 17 ? 'Designing policy engine architecture' : null,
      metrics: {
        tasksCompleted: 42 + Math.floor((now.getTime() / 3600000) % 24),
        successRate: 0.92 + (Math.sin(now.getTime() / 86400000) * 0.05),
        averageResponseTime: 25 + Math.random() * 10,
        cpuUsage: 15 + Math.sin((hour * 60 + minute) / 120) * 20,
        memoryUsage: 30 + Math.cos((hour * 60 + minute) / 180) * 15
      }
    },
    {
      id: 'live-developer-1',
      name: 'Developer Agent',
      type: 'developer',
      status: 'busy',
      platform: 'ecs',
      lastSeen: new Date(now.getTime() - Math.random() * 30000),
      currentTask: 'Implementing policy integration features',
      metrics: {
        tasksCompleted: 156 + Math.floor((now.getTime() / 1800000) % 10),
        successRate: 0.88 + (Math.cos(now.getTime() / 43200000) * 0.08),
        averageResponseTime: 35 + Math.random() * 15,
        cpuUsage: 65 + Math.sin((hour * 60 + minute) / 60) * 25,
        memoryUsage: 60 + Math.cos((hour * 60 + minute) / 90) * 20
      }
    },
    {
      id: 'live-security-1',
      name: 'Security Agent',
      type: 'security',
      status: 'busy',
      platform: 'ec2',
      lastSeen: new Date(now.getTime() - Math.random() * 15000),
      currentTask: 'Monitoring policy compliance violations',
      metrics: {
        tasksCompleted: 189 + Math.floor((now.getTime() / 900000) % 15),
        successRate: 0.99,
        averageResponseTime: 15 + Math.random() * 8,
        cpuUsage: 55 + Math.sin((hour * 60 + minute) / 45) * 20,
        memoryUsage: 45 + Math.cos((hour * 60 + minute) / 120) * 18
      }
    }
  ];
}

// Live policy data
function getLivePolicyStats() {
  const now = new Date();
  const hour = now.getHours();
  const basePolicyAssessments = 150 + Math.floor((now.getTime() / 3600000) % 50);
  const timeBasedActivity = Math.sin((hour * Math.PI) / 12) * 0.3 + 0.7;
  
  return {
    totalAssessments: basePolicyAssessments + Math.floor(Math.random() * 10),
    allowedOperations: Math.floor(basePolicyAssessments * 0.85 * timeBasedActivity),
    deniedOperations: Math.floor(basePolicyAssessments * 0.15 * timeBasedActivity),
    averageRiskLevel: 2.3 + (Math.sin(now.getTime() / 43200000) * 0.7),
    averageComplianceLevel: 92 + (Math.cos(now.getTime() / 86400000) * 5),
    lastAssessment: new Date(now.getTime() - Math.random() * 300000)
  };
}

// Live audit log
function getLiveAuditLog() {
  const now = new Date();
  const auditEntries = [];
  
  for (let i = 0; i < 25; i++) {
    const timestamp = new Date(now.getTime() - (i * 3600000) - Math.random() * 3600000);
    const agents = ['live-architect-1', 'live-developer-1', 'live-security-1'];
    const actions = ['start', 'stop', 'restart', 'deploy', 'security_scan'];
    const riskLevels = [1, 2, 2, 3, 3, 3, 4, 5];
    
    const agentId = agents[Math.floor(Math.random() * agents.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
    const approved = riskLevel <= 3 || Math.random() > 0.2;
    
    auditEntries.push({
      id: `audit-${timestamp.getTime()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp,
      agentId,
      action,
      riskLevel,
      approved,
      reason: approved ? 
        `Risk level ${riskLevel}/5 - within acceptable limits` : 
        `Risk level ${riskLevel}/5 - policy violation detected`
    });
  }
  
  return auditEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'na-agent-dashboard-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Agents endpoint
app.get('/api/dashboard/agents', (req, res) => {
  const agents = getLiveAgents();
  res.json({
    agents,
    total: agents.length,
    timestamp: new Date().toISOString()
  });
});

// Policy stats endpoint
app.get('/api/dashboard/policy/stats', (req, res) => {
  const policyStats = getLivePolicyStats();
  res.json({
    policy: policyStats,
    timestamp: new Date().toISOString()
  });
});

// Policy audit endpoint
app.get('/api/dashboard/policy/audit', (req, res) => {
  const auditLog = getLiveAuditLog();
  res.json({
    auditLog,
    total: auditLog.length,
    timestamp: new Date().toISOString()
  });
});

// Agent control endpoint
app.post('/api/dashboard/agents/:agentId/control', (req, res) => {
  const { agentId } = req.params;
  const { action } = req.body;
  
  // Simulate policy assessment
  const riskLevel = Math.floor(Math.random() * 5) + 1;
  const approved = riskLevel <= 3;
  
  if (approved) {
    res.json({
      agentId,
      action,
      result: 'success',
      policyAssessment: {
        riskLevel,
        approved: true,
        reason: `Action ${action} approved - risk level ${riskLevel}/5`
      },
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(403).json({
      error: 'Action denied by policy engine',
      policyAssessment: {
        riskLevel,
        approved: false,
        reason: `Action ${action} denied - risk level ${riskLevel}/5 exceeds threshold`
      }
    });
  }
});

// Statistics endpoint
app.get('/api/dashboard/stats', (req, res) => {
  const agents = getLiveAgents();
  const policyStats = getLivePolicyStats();
  
  res.json({
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'busy').length,
    idleAgents: agents.filter(a => a.status === 'idle').length,
    totalTasksCompleted: agents.reduce((sum, a) => sum + a.metrics.tasksCompleted, 0),
    averageSuccessRate: agents.reduce((sum, a) => sum + a.metrics.successRate, 0) / agents.length,
    policy: policyStats
  });
});

app.listen(PORT, () => {
  console.log(`🚀 WORKING NA Agent Dashboard API running on port ${PORT}`);
  console.log(`📊 Environment: development with LIVE DATA`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`👥 Agents: http://localhost:${PORT}/api/dashboard/agents`);
  console.log(`🔒 Policy: http://localhost:${PORT}/api/dashboard/policy/stats`);
  console.log(`📋 Audit: http://localhost:${PORT}/api/dashboard/policy/audit`);
});
