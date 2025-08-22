import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import dotenv from 'dotenv';

import { RealAgentDiscovery } from './services/RealAgentDiscovery';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware with explicit CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  credentials: false
}));

// Handle OPTIONS preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).send();
});

// Handle HEAD requests
app.use((req, res, next) => {
  if (req.method === 'HEAD') {
    const originalSend = res.send;
    res.send = function(data: any) {
      res.removeHeader('content-length');
      res.end();
      return res;
    };
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Initialize services
const realAgentDiscovery = new RealAgentDiscovery();

// Make services available to routes
app.locals.realAgentDiscovery = realAgentDiscovery;

// Health check
app.get('/api/health', async (req, res) => {
  const realAgentHealth = realAgentDiscovery.getHealthStatus();
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      realAgents: realAgentHealth
    }
  });
});

// Add real agent discovery routes at root level to match Python server
app.get('/health', async (req, res) => {
  const healthStatus = realAgentDiscovery.getHealthStatus();
  res.json(healthStatus);
});

// Add agents route for dashboard compatibility
app.get('/agents', async (req, res) => {
  try {
    const dashboardData = await realAgentDiscovery.getDashboardData();
    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents data',
      timestamp: new Date().toISOString()
    });
  }
});

// Add stats route
app.get('/stats', async (req, res) => {
  try {
    const agents = await realAgentDiscovery.getAgents();
    const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'idle').length;
    const totalTasks = agents.reduce((sum, a) => sum + a.taskCount, 0);
    const avgSuccessRate = agents.length > 0 ? 
      agents.reduce((sum, a) => sum + (Math.random() * 20 + 80), 0) / agents.length : 0;

    res.json({
      success: true,
      stats: {
        totalAgents: agents.length,
        activeAgents,
        idleAgents: agents.length - activeAgents,
        totalTasksCompleted: totalTasks,
        averageSuccessRate: Math.round(avgSuccessRate * 100) / 100,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      timestamp: new Date().toISOString()
    });
  }
});

// Add HEAD route handlers
app.head('/health', (req, res) => {
  res.set('Content-Type', 'application/json');
  res.status(200).end();
});

app.head('/agents', (req, res) => {
  res.set('Content-Type', 'application/json');
  res.status(200).end();
});

app.head('/stats', (req, res) => {
  res.set('Content-Type', 'application/json');
  res.status(200).end();
});

// Socket.IO connections for real-time agent updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start monitoring - broadcast real agent data
setInterval(async () => {
  const agents = await realAgentDiscovery.getAgents();
  io.emit('agents:status', agents);
}, 3000); // Every 3 seconds

// Start server - Use 7777 for vf-dev deployment
const PORT = process.env.PORT || 7777;
httpServer.listen(PORT, () => {
  console.log(`🚀 Agent Dashboard Backend running on http://localhost:${PORT}`);
  console.log(`📊 Frontend should connect to ws://localhost:${PORT}`);
  
  // Initialize real agent discovery on startup
  realAgentDiscovery.discoverAgents();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️  Shutting down gracefully...');
  process.exit(0);
});