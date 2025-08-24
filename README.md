# NA Agent Dashboard

## 🤖 Real Agent Discovery & Management Platform

A comprehensive dashboard for discovering, monitoring, and managing AI agents from the filesystem with real-time process detection and live metrics.

> **✅ REAL DATA SYSTEM** - This dashboard uses the **Real Agent Discovery Server** (`real-agent-server.py`) that scans the filesystem for actual agent files and detects running processes. No mocked or simulated data.

## Features ✅

- **Real Agent Discovery**: Automatically discovers 237+ agent files from filesystem
- **Live Process Detection**: Uses `psutil` to detect running daemon agents as "active" 
- **Real-time Metrics**: Displays actual CPU, memory usage, and task counts from running processes
- **Status Classification**: Shows agents as active/idle/dormant based on real activity
- **Multi-directory Scanning**: Scans business service, autonomous system, and dashboard directories
- **No Mocked Data**: All metrics and status information comes from real system state
- **Live Daemon Agents**: Includes running QA, Business, and Developer daemon processes

## Architecture ✅

### Current Real Agent System
```
na-agent-dashboard/
├── real-agent-server.py           # 🎯 MAIN SERVER - Real agent discovery (Port 7778)
├── simple-*-daemon.py             # 🔴 RUNNING - Live daemon agents (QA, Business, Dev)
├── mfe/                          # React frontend (Port 3001)
│   ├── src/
│   │   ├── hooks/useLiveAgents.ts # Connected to real API (Port 7778)
│   │   ├── components/            # Dashboard components
│   │   └── App.tsx                # Main application
├── servers/
│   └── api_server.py             # Legacy Python server (keep for reference)
└── deprecated/                    # 🚨 MOVED - All mocked services
    ├── servers/                   # Former mocked JS servers
    ├── infrastructure/            # Former mocked CloudFormation
    └── README.md                  # Migration guide
```

## Quick Start 🚀

### Prerequisites
- Python 3.8+ with `psutil` package
- Node.js 18+ and npm (for frontend)
- Windows or Unix-based OS

### Start Real Agent System

1. **Start Real Agent Discovery Server:**
```bash
cd na-agent-dashboard
python real-agent-server.py
# Server runs on http://localhost:7778
```

2. **Start Live Daemon Agents:**
```bash
# Terminal 1: QA Agent (runs every 30s)
python simple-qa-daemon.py

# Terminal 2: Business Agent (runs every 60s)  
python simple-business-daemon.py

# Terminal 3: Developer Agent (runs every 45s)
python simple-dev-daemon.py
```

3. **Start Frontend Dashboard:**
```bash
cd mfe
npm install
npm run dev
# Frontend runs on http://localhost:3001
```

### Verify System Status

```bash
# 1. Check Real Agent Discovery Server
curl http://localhost:7778/health
# Expected: {"status": "running", "agents_discovered": 237+}

# 2. Check Active Daemon Agents
curl http://localhost:7778/api/agents | grep -i daemon
# Expected: Shows 3 daemon agents with "active" status

# 3. Check Dashboard API
curl http://localhost:7778/api/dashboard/agents
# Expected: {"success": true, "totalAgents": 237+, "activeAgents": 5+}
```

## API Endpoints

### Real Agent Discovery Server (Port 7778) ✅

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/health` | GET | Server health check |
| `/api/agents` | GET | All discovered agents (237+) |
| `/api/dashboard/agents` | GET | Dashboard-formatted agent data |
| `/api/dashboard/live-data` | GET | Live metrics and system data |
| `/api/dashboard/data-sources` | GET | Data source status |

## Current System Status ✅

- **✅ Real Agent Discovery**: 237+ agents discovered from filesystem
- **✅ Live Daemon Agents**: 3 active daemon processes running tasks
- **✅ Process Detection**: Enhanced status detection using `psutil`
- **✅ Frontend Integration**: React dashboard connected to real API
- **🚨 Mocked Services**: All deprecated and moved to `/deprecated/` folder

## Migration from Mocked Services

**⚠️ If you were using the old mocked services (Port 7777), please migrate:**

1. **Stop using Port 7777** - this served fake data
2. **Use Port 7778** - this serves real agent discovery
3. **Update your configuration** to point to the real agent server
4. **See `/deprecated/README.md`** for detailed migration guide

## Troubleshooting

### Common Issues

**Q: Dashboard shows no agents**
```bash
# Check if real-agent-server is running
curl http://localhost:7778/health
# If not working, restart with: python real-agent-server.py
```

**Q: Daemon agents show as "dormant" instead of "active"**
```bash
# Ensure daemon agents are running
ps aux | grep "daemon.py"
# If none found, restart daemon agents
```

**Q: Frontend can't connect to API**
```bash
# Check frontend configuration
cat mfe/.env.development
# Should show: VITE_API_BASE_URL=http://localhost:7778
```

## Development

### Adding New Agent Types
1. Create your agent `.py` file in one of the scanned directories
2. Include 'agent' or 'daemon' in the filename  
3. The discovery server will automatically detect it
4. For daemon agents, implement a main loop for continuous operation

### Discovery Paths
The server scans these directories:
- `E:\Projects\NiroAgent\na-business-service`
- `E:\Projects\NiroAgent\na-autonomous-system`  
- `E:\Projects\NiroAgent\na-agent-dashboard`

## Contributing

Before making changes:
1. Test with the real agent system (Port 7778)
2. Ensure your changes work with live daemon agents
3. Update documentation if you add new features
4. Do not use or reference deprecated mocked services

---

**🎉 Real Agent Discovery System is now active!**  
*All mocked services have been deprecated and moved to `/deprecated/` folder.*
