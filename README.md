# Agent Orchestrator Dashboard

A real-time monitoring and control dashboard for AI agents running locally. Built with React, Node.js, TypeScript, and Socket.IO.

## Features

- **Real-time Agent Monitoring**: View status, CPU, and memory usage of all agents
- **Terminal Multiplexing**: View live terminal output from each agent
- **System Resource Monitoring**: Track CPU, memory, disk usage with historical charts
- **GitHub Issues Integration**: View and manage agent-task issues
- **Agent Control**: Start, stop, and restart agents from the dashboard
- **WebSocket Communication**: Real-time updates using Socket.IO

## Architecture

```
agent-dashboard/
├── frontend/          # React + TypeScript + Material-UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── AgentGrid.tsx      # Agent cards with controls
│   │   │   ├── SystemMetrics.tsx  # System resource charts
│   │   │   ├── TerminalView.tsx   # xterm.js terminal
│   │   │   └── IssuePanel.tsx     # GitHub issues viewer
│   │   ├── hooks/
│   │   │   └── useSocket.ts       # Socket.IO hook
│   │   └── App.tsx                # Main application
│   └── package.json
│
├── backend/           # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── services/
│   │   │   ├── AgentManager.ts    # Agent process management
│   │   │   ├── SystemMonitor.ts   # System metrics collection
│   │   │   ├── TerminalManager.ts # Terminal output streaming
│   │   │   └── GitHubService.ts   # GitHub API integration
│   │   ├── routes/
│   │   │   ├── agents.ts          # Agent API endpoints
│   │   │   ├── system.ts          # System metrics endpoints
│   │   │   └── github.ts          # GitHub API endpoints
│   │   └── index.ts               # Main server + Socket.IO
│   └── package.json
│
└── README.md
```

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+ (for agent scripts)
- GitHub CLI (`gh`) configured with authentication
- Windows or Unix-based OS

## Installation

### Backend Setup

```bash
cd agent-dashboard/backend
npm install
```

### Frontend Setup

```bash
cd agent-dashboard/frontend
npm install
```

## Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PROJECTS_DIR=E:/Projects
```

## Running the Dashboard

### Start Backend Server

```bash
cd backend
npm run dev
```

The backend will start on http://localhost:3001

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will start on http://localhost:5173

## Available Agents

The dashboard can monitor and control these agent types:

1. **SDLC Iterator**: Iterates through develop→test→deploy→document cycle
2. **Issue Monitor**: Monitors GitHub issues with agent-task labels
3. **Service Agents**: Individual agents for each microservice
   - NiroSubs agents (ns-auth, ns-dashboard, ns-payments)
   - VisualForge agents (vf-audio, vf-video, vf-image)
4. **Health Monitor**: Overall system health monitoring

## API Endpoints

### Agent Management
- `GET /api/agents` - List all agents
- `GET /api/agents/:id` - Get agent details
- `POST /api/agents/:id/start` - Start an agent
- `POST /api/agents/:id/stop` - Stop an agent
- `POST /api/agents/:id/restart` - Restart an agent

### System Metrics
- `GET /api/system/metrics` - Get system metrics
- `GET /api/system/status` - Get system health status
- `GET /api/system/detailed` - Get detailed system info

### GitHub Integration
- `GET /api/github/issues` - List issues
- `POST /api/github/issues` - Create new issue
- `POST /api/github/issues/:repo/:number/close` - Close issue
- `POST /api/github/issues/:repo/:number/comment` - Add comment

## WebSocket Events

### Client → Server
- `terminal:subscribe` - Subscribe to agent terminal
- `terminal:unsubscribe` - Unsubscribe from terminal
- `terminal:input` - Send input to agent
- `agent:start` - Start an agent
- `agent:stop` - Stop an agent
- `agent:restart` - Restart an agent

### Server → Client
- `agents:status` - Agent status updates
- `system:metrics` - System metrics updates
- `terminal:data` - Terminal output data
- `terminal:history` - Terminal history on connect
- `agent:started` - Agent started notification
- `agent:stopped` - Agent stopped notification
- `agent:error` - Agent error notification

## Building for Production

### Build Frontend

```bash
cd frontend
npm run build
```

### Build Backend

```bash
cd backend
npm run build
```

## Deployment

The dashboard can be deployed to:

1. **Local Machine**: Run directly on Windows/Mac/Linux
2. **EC2 Instance**: Deploy to AWS EC2 for cloud access
3. **Docker**: Containerize and deploy anywhere

## Security Considerations

- All repositories should be private
- Use environment variables for sensitive data
- Implement authentication before exposing to internet
- Use HTTPS in production
- Restrict CORS origins

## Troubleshooting

### Agent won't start
- Check Python is installed and in PATH
- Verify agent script exists in E:/Projects
- Check error messages in terminal output

### Terminal not showing output
- Ensure WebSocket connection is established
- Check agent is running (status should be "running")
- Verify process has stdout/stderr streams

### GitHub issues not loading
- Ensure `gh` CLI is installed and authenticated
- Check repository names are correct
- Verify you have access to the repositories

## Future Enhancements

- [ ] Authentication and user management
- [ ] Agent scheduling and automation
- [ ] Metrics persistence and historical analysis
- [ ] Alert and notification system
- [ ] Multi-machine agent orchestration
- [ ] Docker containerization
- [ ] Kubernetes deployment support