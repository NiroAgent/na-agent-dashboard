const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4003;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        server: 'debug-server'
    });
});

// Generate live agent data
function generateLiveAgents() {
    const now = new Date();
    const timeOfDay = now.getHours() + now.getMinutes() / 60;
    const isBusinessHours = timeOfDay >= 9 && timeOfDay <= 17;
    
    const agents = [
        {
            id: 'ai-architect-001',
            name: 'AI Architect Agent',
            status: Math.random() > 0.1 ? 'active' : 'idle',
            lastSeen: new Date(Date.now() - Math.random() * 300000).toISOString(),
            cpu: Math.round(20 + Math.random() * 60),
            memory: Math.round(30 + Math.random() * 40),
            tasks: {
                completed: Math.floor(15 + Math.random() * 20),
                active: Math.floor(Math.random() * 5),
                failed: Math.floor(Math.random() * 3)
            },
            riskLevel: Math.random() > 0.8 ? 'high' : Math.random() > 0.6 ? 'medium' : 'low'
        },
        {
            id: 'ai-developer-002',
            name: 'AI Developer Agent',
            status: Math.random() > 0.15 ? 'active' : 'idle',
            lastSeen: new Date(Date.now() - Math.random() * 600000).toISOString(),
            cpu: Math.round(35 + Math.random() * 45),
            memory: Math.round(25 + Math.random() * 50),
            tasks: {
                completed: Math.floor(25 + Math.random() * 30),
                active: Math.floor(Math.random() * 8),
                failed: Math.floor(Math.random() * 2)
            },
            riskLevel: Math.random() > 0.7 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low'
        },
        {
            id: 'ai-qa-003',
            name: 'AI QA Agent',
            status: Math.random() > 0.2 ? 'active' : 'maintenance',
            lastSeen: new Date(Date.now() - Math.random() * 180000).toISOString(),
            cpu: Math.round(15 + Math.random() * 55),
            memory: Math.round(20 + Math.random() * 45),
            tasks: {
                completed: Math.floor(10 + Math.random() * 25),
                active: Math.floor(Math.random() * 6),
                failed: Math.floor(Math.random() * 4)
            },
            riskLevel: Math.random() > 0.75 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
        }
    ];

    return agents;
}

// Live policy statistics
function generatePolicyStats() {
    const totalPolicies = 47;
    const activeCompliance = Math.floor(85 + Math.random() * 10);
    const riskAssessments = Math.floor(120 + Math.random() * 50);
    const violations = Math.floor(Math.random() * 8);

    return {
        totalPolicies,
        activeCompliance,
        riskAssessments,
        violations,
        lastUpdated: new Date().toISOString(),
        complianceScore: Math.round(activeCompliance / totalPolicies * 100)
    };
}

// Agents endpoint
app.get('/api/dashboard/agents', (req, res) => {
    console.log('Agents data requested');
    const agents = generateLiveAgents();
    res.json(agents);
});

// Policy stats endpoint
app.get('/api/dashboard/policy/stats', (req, res) => {
    console.log('Policy stats requested');
    const stats = generatePolicyStats();
    res.json(stats);
});

// Policy audit endpoint
app.get('/api/dashboard/policy/audit', (req, res) => {
    console.log('Policy audit requested');
    const auditLogs = [
        {
            id: `audit-${Date.now()}-1`,
            timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            agentId: 'ai-architect-001',
            action: 'policy_check',
            result: Math.random() > 0.3 ? 'compliant' : 'violation',
            details: 'Resource usage policy validation'
        },
        {
            id: `audit-${Date.now()}-2`,
            timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString(),
            agentId: 'ai-developer-002',
            action: 'security_scan',
            result: Math.random() > 0.2 ? 'compliant' : 'warning',
            details: 'Code security compliance check'
        }
    ];
    res.json(auditLogs);
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server with explicit error handling
const server = app.listen(PORT, '127.0.0.1', (err) => {
    if (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
    console.log(`🚀 Debug server running on http://127.0.0.1:${PORT}`);
    console.log(`📊 Health check: http://127.0.0.1:${PORT}/health`);
    console.log(`🤖 Agents API: http://127.0.0.1:${PORT}/api/dashboard/agents`);
    console.log(`📋 Policy Stats: http://127.0.0.1:${PORT}/api/dashboard/policy/stats`);
    console.log(`📝 Policy Audit: http://127.0.0.1:${PORT}/api/dashboard/policy/audit`);
});

server.on('error', (err) => {
    console.error('❌ Server error:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
    }
    process.exit(1);
});

server.on('listening', () => {
    console.log(`✅ Server successfully bound to port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
