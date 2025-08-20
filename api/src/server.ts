/**
 * NA Agent Dashboard API Server
 * Unified service for agent management, monitoring, and deployment
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
import agentRoutes from './routes/agents';
import githubRoutes from './routes/github';
import systemRoutes from './routes/system';

// Load environment variables
dotenv.config();

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
const PORT = process.env.PORT || 4001;

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

// Initialize service
agentService.initialize().catch(error => {
  logger.error('Failed to initialize agent service:', error);
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
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
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