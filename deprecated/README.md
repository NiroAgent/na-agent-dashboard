# Deprecated Mocked Services 🚨

**⚠️ DEPRECATED - DO NOT USE ⚠️**

This folder contains deprecated mocked service implementations that have been **replaced by the real agent discovery system**.

## Migration Status ✅

**Date Deprecated:** August 23, 2025  
**Replacement:** `real-agent-server.py` (Port 7778)  
**Reason:** Replaced mocked data with real agent discovery from filesystem  

### What Was Deprecated

#### Mocked Server Files (moved from `/servers/`)
- `simple-server.js` - Simple Express server with hardcoded agent data
- `debug-server.js` - Debug server for testing  
- `minimal-test.js` - Minimal test server
- `simple-test.js` - Simple test implementation
- `working-server.js` - Working mock server
- `live-server.js` - Live data simulation server
- `real-agent-server.js` - JavaScript version (replaced by Python)

#### Mocked Infrastructure (moved from `/infrastructure/`)
- `fix-vf-dev-api.yaml` - CloudFormation for mocked API server
- `simple-infrastructure.yaml` - Simple mock infrastructure
- `minimal-al2023-test.yaml` - Minimal test infrastructure
- `simple-al2023-infrastructure.yaml` - Simple AL2023 infrastructure

#### Other Deprecated Files
- `minimal-server.js` - Minimal Express server with mocked agents
- `proxy-server.js` - Proxy server for development
- `live-agent-api.js` - Live agent API simulation
- `live-agent-api-fixed.js` - Fixed version of agent API

## Current Implementation ✅

**Use this instead:**
- **Real Agent Server**: `real-agent-server.py` (Port 7778)
- **Agent Discovery**: Scans filesystem for actual `.py` agent files
- **Process Detection**: Uses `psutil` to detect running daemon agents
- **Live Status**: Shows actual agent activity (active/idle/dormant)
- **Real Metrics**: CPU, memory, and task counts from running processes

### Key Differences

| Aspect | Deprecated (Mocked) | Current (Real) |
|--------|-------------------|----------------|
| **Data Source** | Hardcoded arrays | Filesystem discovery |
| **Agent Count** | 50 fake agents | 237+ real agents |
| **Status Detection** | Random/simulated | Process-based detection |
| **Metrics** | Random numbers | Live process metrics |
| **Port** | 7777 (mocked) | 7778 (real) |
| **Language** | JavaScript/Node.js | Python 3 |

## Migration Guide

### For Developers
1. **Stop using port 7777** - this serves mocked data
2. **Use port 7778** - this serves real agent discovery
3. **Update frontend config** - point to `http://localhost:7778`
4. **Test with daemon agents** - use `simple-*-daemon.py` files

### For Frontend Integration
```javascript
// OLD (Deprecated)
const API_URL = 'http://localhost:7777'; // ❌ Mocked data

// NEW (Current)
const API_URL = 'http://localhost:7778'; // ✅ Real agent data
```

### For Infrastructure
```bash
# Start real agent server
cd /path/to/na-agent-dashboard
python real-agent-server.py

# Test real agent discovery
curl http://localhost:7778/api/agents | head -20
```

## Why This Was Deprecated

1. **No Real Data**: Mocked services provided fake agent information
2. **Development Confusion**: Developers couldn't distinguish real from fake data
3. **Testing Issues**: Tests passed with mocked data but failed with real systems
4. **Resource Waste**: Multiple servers serving different data versions
5. **Maintenance Overhead**: Keeping both systems in sync was error-prone

## Safe Removal Timeline

- **Phase 1** (✅ Complete): Move to deprecated folder
- **Phase 2** (Next 30 days): Update all references and documentation  
- **Phase 3** (After testing): Complete removal from repository
- **Phase 4** (Production verified): Delete deprecated folder

## Need Help?

If you're still using any of these deprecated services:

1. **Read the migration guide above**
2. **Check the current implementation** in `real-agent-server.py`
3. **Test with daemon agents** to see live functionality
4. **Update your configuration** to use port 7778

---

**⚠️ These files will be permanently deleted after 30 days of testing with the real agent system.**