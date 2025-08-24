const express = require('express');
const app = express();
const PORT = 4003;

app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Simple test server running'
  });
});

// Live agent data
app.get('/api/dashboard/agents', (req, res) => {
  const agents = [
    {
      id: 'live-architect-1',
      name: 'Architecture Agent',
      type: 'architect',
      status: 'busy',
      platform: 'ec2',
      lastSeen: new Date(),
      currentTask: 'Designing policy engine integration',
      capabilities: ['system-design', 'api-design', 'database-design'],
      metrics: {
        tasksCompleted: 45 + Math.floor(Math.random() * 10),
        successRate: 0.93,
        averageResponseTime: 28 + Math.random() * 10,
        cpuUsage: 25 + Math.random() * 20,
        memoryUsage: 40 + Math.random() * 15
      }
    },
    {
      id: 'live-developer-1',
      name: 'Developer Agent',
      type: 'developer',
      status: 'busy',
      platform: 'ecs',
      lastSeen: new Date(),
      currentTask: 'Implementing policy enforcement',
      capabilities: ['coding', 'debugging', 'refactoring', 'testing'],
      metrics: {
        tasksCompleted: 167 + Math.floor(Math.random() * 15),
        successRate: 0.89,
        averageResponseTime: 42 + Math.random() * 15,
        cpuUsage: 65 + Math.random() * 20,
        memoryUsage: 58 + Math.random() * 18
      }
    },
    {
      id: 'live-security-1',
      name: 'Security Agent',
      type: 'security',
      status: 'busy',
      platform: 'ec2',
      lastSeen: new Date(),
      currentTask: 'Monitoring policy compliance',
      capabilities: ['security-audit', 'compliance-check', 'threat-detection'],
      metrics: {
        tasksCompleted: 89 + Math.floor(Math.random() * 8),
        successRate: 0.99,
        averageResponseTime: 15 + Math.random() * 8,
        cpuUsage: 55 + Math.random() * 20,
        memoryUsage: 45 + Math.random() * 18
      }
    }
  ];

  res.json({
    agents,
    total: agents.length,
    timestamp: new Date().toISOString()
  });
});

// Live policy statistics
app.get('/api/dashboard/policy/stats', (req, res) => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // Realistic time-based data
  const baseAssessments = 150 + (hour * 5) + Math.floor(minute / 10);
  
  res.json({
    policy: {
      totalAssessments: baseAssessments,
      allowedOperations: Math.floor(baseAssessments * 0.85),
      deniedOperations: Math.floor(baseAssessments * 0.15),
      averageRiskLevel: 2.3 + (Math.sin(now.getTime() / 43200000) * 0.7),
      averageComplianceLevel: 92 + (Math.cos(now.getTime() / 86400000) * 5),
      lastAssessment: new Date(now.getTime() - Math.random() * 300000),
      violations: {
        highRisk: Math.floor(baseAssessments * 0.05),
        mediumRisk: Math.floor(baseAssessments * 0.10),
        lowRisk: Math.floor(baseAssessments * 0.15)
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Live policy audit log
app.get('/api/dashboard/policy/audit', (req, res) => {
  const auditEntries = [];
  const now = new Date();
  
  // Generate 10 recent audit entries
  for (let i = 0; i < 10; i++) {
    const timestamp = new Date(now.getTime() - (i * 600000) - Math.random() * 300000);
    const agents = ['live-architect-1', 'live-developer-1', 'live-security-1'];
    const actions = ['start', 'stop', 'deploy', 'security_scan'];
    const riskLevels = [1, 2, 2, 3, 3, 4, 5];
    
    const agentId = agents[Math.floor(Math.random() * agents.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
    const approved = riskLevel <= 3 || Math.random() > 0.3;
    
    auditEntries.push({
      id: `audit-${timestamp.getTime()}-${i}`,
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
  
  res.json({
    auditLog: auditEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    total: auditEntries.length,
    timestamp: new Date().toISOString()
  });
});

// Agent control with policy enforcement simulation
app.post('/api/dashboard/agents/:agentId/control', (req, res) => {
  const { agentId } = req.params;
  const { action } = req.body;
  
  // Simulate policy assessment
  const riskLevel = Math.floor(Math.random() * 5) + 1;
  const approved = riskLevel <= 3 || Math.random() > 0.2;
  
  if (approved) {
    res.json({
      agentId,
      action,
      result: 'success',
      policyAssessment: {
        riskLevel,
        complianceLevel: 95 - (riskLevel * 5),
        approved: true,
        reason: `Risk level ${riskLevel}/5 - operation approved`
      },
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(403).json({
      error: 'Operation denied by policy engine',
      agentId,
      action,
      policyAssessment: {
        riskLevel,
        complianceLevel: 95 - (riskLevel * 5),
        approved: false,
        reason: `Risk level ${riskLevel}/5 - policy violation, operation blocked`
      },
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Simple test server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Agents API: http://localhost:${PORT}/api/dashboard/agents`);
  console.log(`📋 Policy Stats: http://localhost:${PORT}/api/dashboard/policy/stats`);
  console.log(`📝 Policy Audit: http://localhost:${PORT}/api/dashboard/policy/audit`);
});
