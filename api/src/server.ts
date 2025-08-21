/**
 * NA Agent Dashboard API Server
 * Unified service for agent management, monitoring, and deployment
 * WITH REAL EXTERNAL DATA SOURCES
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import winston from 'winston';
import { UnifiedAgentService } from './services/UnifiedAgentService';
import { LiveDataIntegration } from './services/LiveDataIntegration';
import { CostEffectiveMonitoring } from './services/CostEffectiveMonitoring';
import agentRoutes from './routes/agents';
import githubRoutes from './routes/github';
import systemRoutes from './routes/system';

// Load environment variables
dotenv.config();

// Initialize live data integration with external services
const liveDataService = new LiveDataIntegration();

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'combined.log' 
    })
  ]
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4002;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Initialize Unified Agent Service
const agentService = new UnifiedAgentService();

// Initialize cost-effective monitoring (saves $600+/month vs CloudWatch polling)
const costEffectiveMonitoring = new CostEffectiveMonitoring(app);

// Initialize service
agentService.initialize().catch(error => {
  logger.error('Failed to initialize agent service:', error);
  // Continue server startup even if agent service fails to initialize
});

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = agentService.getStatistics();
  res.json({
    status: 'healthy',
    service: 'na-agent-dashboard-api',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    statistics: stats
  });
});

// API Routes
app.use('/api/agents', agentRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/system', systemRoutes);

// Cost-effective agent heartbeat endpoints (saves $600+/month vs CloudWatch polling)
interface AgentHeartbeat {
  agentId: string;
  timestamp: Date;
  status: 'running' | 'idle' | 'busy' | 'error';
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIn: number;
    networkOut: number;
    tasksCompleted: number;
    currentTasks: number;
  };
  cost?: {
    hourly: number;
    daily: number;
    monthly: number;
  };
  metadata?: {
    instanceId?: string;
    taskArn?: string;
    version?: string;
    capabilities?: string[];
    agentType?: string;
    port?: number;
  };
}

const heartbeats = new Map<string, AgentHeartbeat>();
const heartbeatTimeout = 60000; // 1 minute timeout

// Agents POST their metrics here (replaces expensive CloudWatch API calls)
app.post('/api/agents/:agentId/heartbeat', (req, res) => {
  try {
    const { agentId } = req.params;
    const heartbeat: AgentHeartbeat = {
      agentId,
      timestamp: new Date(),
      status: req.body.status || 'running',
      metrics: {
        cpuUsage: req.body.metrics?.cpuUsage || 0,
        memoryUsage: req.body.metrics?.memoryUsage || 0,
        diskUsage: req.body.metrics?.diskUsage || 0,
        networkIn: req.body.metrics?.networkIn || 0,
        networkOut: req.body.metrics?.networkOut || 0,
        tasksCompleted: req.body.metrics?.tasksCompleted || 0,
        currentTasks: req.body.metrics?.currentTasks || 0,
      },
      cost: req.body.cost,
      metadata: req.body.metadata
    };

    heartbeats.set(agentId, heartbeat);
    logger.info(`💓 Heartbeat received from ${agentId}`, { 
      status: heartbeat.status,
      cpu: heartbeat.metrics.cpuUsage,
      tasks: heartbeat.metrics.currentTasks,
      port: heartbeat.metadata?.port
    });

    res.json({ 
      success: true, 
      message: 'Heartbeat recorded',
      nextHeartbeat: Date.now() + 30000,
      agentId,
      timestamp: heartbeat.timestamp
    });

  } catch (error) {
    logger.error('Error processing heartbeat:', error);
    res.status(500).json({ error: 'Failed to process heartbeat' });
  }
});

// Get all active agents via heartbeats (replaces expensive AWS discovery)
app.get('/api/agents/heartbeat-active', (req, res) => {
  const activeAgents = Array.from(heartbeats.values())
    .filter(hb => Date.now() - hb.timestamp.getTime() < heartbeatTimeout)
    .map(hb => ({
      id: hb.agentId,
      name: `${hb.metadata?.agentType || 'Agent'} ${hb.agentId}`,
      type: hb.metadata?.agentType || 'unknown',
      status: hb.status,
      platform: 'local', // Since these are local TypeScript agents
      lastSeen: hb.timestamp,
      metrics: {
        cpuUsage: hb.metrics.cpuUsage,
        memoryUsage: hb.metrics.memoryUsage,
        diskUsage: hb.metrics.diskUsage,
        tasksCompleted: hb.metrics.tasksCompleted,
        currentTasks: hb.metrics.currentTasks
      },
      cost: hb.cost,
      metadata: hb.metadata,
      instanceId: hb.metadata?.port ? `local-${hb.metadata.port}` : undefined,
      launchTime: hb.timestamp, // When first seen
      lastStatusChange: hb.timestamp
    }));

  res.json({
    success: true,
    agents: activeAgents,
    totalActive: activeAgents.length,
    lastUpdated: new Date(),
    costSavings: '$600+/month vs CloudWatch polling'
  });
});

// Clean up stale heartbeats every 2 minutes
setInterval(() => {
  const now = Date.now();
  const staleAgents = [];
  
  for (const [agentId, heartbeat] of heartbeats) {
    if (now - heartbeat.timestamp.getTime() > heartbeatTimeout * 2) {
      heartbeats.delete(agentId);
      staleAgents.push(agentId);
    }
  }

  if (staleAgents.length > 0) {
    logger.info(`🧹 Cleaned up ${staleAgents.length} stale agent heartbeats:`, staleAgents);
  }
}, 120000);

// REAL EXTERNAL DATA ENDPOINTS
// Live data from external AWS services, APIs, and monitoring systems
app.get('/api/dashboard/live-data', async (req, res) => {
  try {
    const liveData = liveDataService.getCurrentData();
    res.json({
      success: true,
      data: liveData,
      timestamp: new Date().toISOString(),
      sources: 'AWS EC2, ECS, CloudWatch, External APIs'
    });
  } catch (error) {
    logger.error('Error getting live data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live data from external sources',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Real agents from AWS infrastructure
app.get('/api/dashboard/agents', async (req, res) => {
  try {
    const liveData = liveDataService.getCurrentData();
    res.json({
      success: true,
      agents: liveData.agents,
      lastUpdated: liveData.lastUpdated,
      totalAgents: liveData.agents.length,
      activeAgents: liveData.agents.filter(a => a.status === 'running').length,
      dataSources: liveData.dataSources
    });
  } catch (error) {
    logger.error('Error getting agents from external sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents from AWS and external services'
    });
  }
});

// Real system metrics from CloudWatch and monitoring APIs
app.get('/api/dashboard/metrics', async (req, res) => {
  try {
    const liveData = liveDataService.getCurrentData();
    res.json({
      success: true,
      metrics: liveData.systemMetrics,
      lastUpdated: liveData.lastUpdated,
      source: 'AWS CloudWatch + External Monitoring APIs'
    });
  } catch (error) {
    logger.error('Error getting system metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics from external monitoring services'
    });
  }
});

// Real policy data from external policy engine
app.get('/api/dashboard/policy/stats', async (req, res) => {
  try {
    const liveData = liveDataService.getCurrentData();
    res.json({
      success: true,
      policyStats: liveData.policies,
      lastUpdated: liveData.lastUpdated,
      source: 'External Policy Engine API'
    });
  } catch (error) {
    logger.error('Error getting policy stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch policy data from external policy engine'
    });
  }
});

// Data source health and connectivity status
app.get('/api/dashboard/data-sources', async (req, res) => {
  try {
    const dataSources = liveDataService.getDataSourceStatus();
    res.json({
      success: true,
      dataSources,
      connectedSources: dataSources.filter(ds => ds.status === 'connected').length,
      totalSources: dataSources.length,
      lastCheck: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting data source status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check external data source connectivity'
    });
  }
});

// Force refresh all external data
app.post('/api/dashboard/refresh', async (req, res) => {
  try {
    logger.info('Manual refresh of external data sources requested');
    await liveDataService.updateLiveData();
    const liveData = liveDataService.getCurrentData();
    
    res.json({
      success: true,
      message: 'External data sources refreshed successfully',
      lastUpdated: liveData.lastUpdated,
      agentCount: liveData.agents.length,
      dataSources: liveData.dataSources
    });
  } catch (error) {
    logger.error('Error refreshing external data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh data from external sources'
    });
  }
});

// Agent Service API endpoints
app.get('/api/dashboard/stats', (req, res) => {
  const stats = agentService.getStatistics();
  res.json(stats);
});

app.get('/api/dashboard/agents', (req, res) => {
  const agents = agentService.getAgents();
  res.json({
    agents,
    total: agents.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/dashboard/agents/:agentId', (req, res) => {
  const agent = agentService.getAgent(req.params.agentId);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agent);
});

app.post('/api/dashboard/agents/:agentId/message', async (req, res) => {
  try {
    const { message, context } = req.body;
    const response = await agentService.sendMessage(
      req.params.agentId,
      message,
      context
    );
    res.json(response);
  } catch (error) {
    logger.error('Error sending message to agent:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send message' 
    });
  }
});

app.post('/api/dashboard/agents/:agentId/task', async (req, res) => {
  try {
    const taskId = await agentService.submitTask({
      agentId: req.params.agentId,
      ...req.body
    });
    res.json({ taskId, status: 'submitted' });
  } catch (error) {
    logger.error('Error submitting task:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to submit task' 
    });
  }
});

app.get('/api/dashboard/agents/:agentId/conversation', (req, res) => {
  const conversation = agentService.getConversation(req.params.agentId);
  res.json({
    agentId: req.params.agentId,
    messages: conversation,
    total: conversation.length
  });
});

app.get('/api/dashboard/issues', (req, res) => {
  const issues = agentService.getIssues();
  res.json({
    issues,
    total: issues.length,
    timestamp: new Date().toISOString()
  });
});

// GitHub Webhook endpoint
app.post('/api/webhook/github', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const event = req.headers['x-github-event'] as string;
  
  // Verify webhook signature if secret is configured
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  if (webhookSecret) {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = 'sha256=' + hmac.update(req.body).digest('hex');
    
    if (!crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(digest))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  try {
    const payload = JSON.parse(req.body.toString());
    await agentService.handleGitHubWebhook(event, payload);
    res.json({ status: 'processed' });
  } catch (error) {
    logger.error('Error processing GitHub webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Agent control endpoints with policy enforcement
app.post('/api/dashboard/agents/:agentId/control', async (req, res) => {
  try {
    const { action } = req.body;
    const validActions = ['start', 'stop', 'restart', 'status', 'logs'];
    
    if (!validActions.includes(action)) {
      return res.status(400).json({ 
        error: `Invalid action. Must be one of: ${validActions.join(', ')}` 
      });
    }

    const result = await agentService.controlAgent(req.params.agentId, action);
    res.json({ 
      agentId: req.params.agentId,
      action,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error controlling agent:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to control agent' 
    });
  }
});

app.get('/api/dashboard/agents/:agentId/status', async (req, res) => {
  try {
    const status = await agentService.getAgentRealTimeStatus(req.params.agentId);
    res.json(status);
  } catch (error) {
    logger.error('Error getting agent status:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get agent status' 
    });
  }
});

app.post('/api/dashboard/deploy-all', async (req, res) => {
  try {
    const result = await agentService.deployAllAgents();
    res.json({ 
      action: 'deploy-all',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error deploying all agents:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to deploy agents' 
    });
  }
});

// Policy endpoints
app.get('/api/dashboard/policy/audit', (req, res) => {
  try {
    const auditLog = agentService.getPolicyAuditLog();
    res.json({
      auditLog,
      total: auditLog.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting policy audit log:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get policy audit log' 
    });
  }
});

app.get('/api/dashboard/policy/stats', (req, res) => {
  try {
    const stats = agentService.getStatistics();
    res.json({
      policy: stats.policy,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting policy statistics:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get policy statistics' 
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  logger.info(`WebSocket client connected: ${clientId}`);
  
  agentService.handleWebSocketConnection(ws, clientId);
  
  ws.on('error', (error) => {
    logger.error(`WebSocket error for client ${clientId}:`, error);
  });
  
  ws.on('close', () => {
    logger.info(`WebSocket client disconnected: ${clientId}`);
  });
});

// Initialize Socket.IO server (for backward compatibility)
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
    credentials: true
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Socket.IO client connected: ${socket.id}`);
  
  // Send initial data
  socket.emit('agents', agentService.getAgents());
  socket.emit('stats', agentService.getStatistics());
  
  // Handle client events
  socket.on('get-agents', () => {
    socket.emit('agents', agentService.getAgents());
  });
  
  socket.on('get-stats', () => {
    socket.emit('stats', agentService.getStatistics());
  });
  
  socket.on('send-message', async (data) => {
    try {
      const response = await agentService.sendMessage(
        data.agentId,
        data.message,
        data.context
      );
      socket.emit('message-response', response);
    } catch (error) {
      socket.emit('error', error instanceof Error ? error.message : 'Unknown error');
    }
  });
  
  socket.on('submit-task', async (data) => {
    try {
      const taskId = await agentService.submitTask(data);
      socket.emit('task-submitted', { taskId });
    } catch (error) {
      socket.emit('error', error instanceof Error ? error.message : 'Unknown error');
    }
  });
  
  socket.on('disconnect', () => {
    logger.info(`Socket.IO client disconnected: ${socket.id}`);
  });
});

// Listen for agent service events and broadcast to clients
agentService.on('agents-updated', (agents) => {
  io.emit('agents', agents);
});

agentService.on('task-submitted', (data) => {
  io.emit('task-submitted', data);
});

agentService.on('task-completed', (data) => {
  io.emit('task-completed', data);
});

agentService.on('message', (message) => {
  io.emit('message', message);
});

agentService.on('github-issue', (data) => {
  io.emit('github-issue', data);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close WebSocket connections
    wss.clients.forEach(ws => ws.close());
    
    // Shutdown agent service
    agentService.shutdown();
    
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 NA Agent Dashboard API running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  logger.info(`🔌 Socket.IO: ws://localhost:${PORT}/socket.io`);
  
  if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE) {
    logger.warn('⚠️  No AWS credentials configured - running in demo mode');
  }
  
  if (!process.env.GITHUB_TOKEN) {
    logger.warn('⚠️  No GitHub token configured - GitHub features disabled');
  }
});

export default app;