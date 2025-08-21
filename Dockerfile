# Multi-stage Docker build for NA Agent Dashboard
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY api/package*.json ./api/
COPY mfe/package*.json ./mfe/

# Install dependencies
RUN npm ci --only=production --silent

# Copy source code
COPY api/ ./api/
COPY mfe/ ./mfe/

# Build API
WORKDIR /app/api
RUN npm run build

# Build Frontend
WORKDIR /app/mfe
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install PM2 for process management
RUN npm install -g pm2

# Create app directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/api/package*.json ./api/
COPY --from=builder /app/api/node_modules ./api/node_modules
COPY --from=builder /app/mfe/dist ./mfe/dist

# Create environment file
RUN echo "NODE_ENV=production" > /app/api/.env && \
    echo "PORT=7777" >> /app/api/.env && \
    echo "LOG_LEVEL=info" >> /app/api/.env

# Create PM2 ecosystem file
RUN echo 'module.exports = {' > /app/ecosystem.config.js && \
    echo '  apps: [{' >> /app/ecosystem.config.js && \
    echo '    name: "niro-dashboard-api",' >> /app/ecosystem.config.js && \
    echo '    script: "./api/dist/server.js",' >> /app/ecosystem.config.js && \
    echo '    instances: 1,' >> /app/ecosystem.config.js && \
    echo '    autorestart: true,' >> /app/ecosystem.config.js && \
    echo '    watch: false,' >> /app/ecosystem.config.js && \
    echo '    max_memory_restart: "500M",' >> /app/ecosystem.config.js && \
    echo '    env: {' >> /app/ecosystem.config.js && \
    echo '      NODE_ENV: "production",' >> /app/ecosystem.config.js && \
    echo '      PORT: 7777' >> /app/ecosystem.config.js && \
    echo '    }' >> /app/ecosystem.config.js && \
    echo '  }]' >> /app/ecosystem.config.js && \
    echo '};' >> /app/ecosystem.config.js

# Expose port
EXPOSE 7777

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:7777/health || exit 1

# Start with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
