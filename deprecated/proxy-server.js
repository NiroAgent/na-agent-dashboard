const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 8080;

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: false
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'proxy-server',
    target: 'http://localhost:7777'
  });
});

// Proxy all API requests to local server
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:7777',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(500).json({
      error: 'Proxy connection failed',
      message: err.message,
      target: 'http://localhost:7777'
    });
  }
}));

// Proxy root health endpoint
app.use('/health', createProxyMiddleware({
  target: 'http://localhost:7777',
  changeOrigin: true
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔗 Proxy server running on port ${PORT}`);
  console.log(`🎯 Forwarding to: http://localhost:7777`);
  console.log(`🌐 External access: http://[YOUR-IP]:${PORT}`);
});