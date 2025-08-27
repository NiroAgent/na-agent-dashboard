# Frontend Testing & Error Detection Guide

## 🔍 Automated Testing System

This project includes comprehensive automation tests to detect frontend errors and ensure system health. The testing system works without additional dependencies and provides detailed error reporting.

## 📋 Available Tests

### 1. Frontend Error Detection
**Command**: `npm run test:frontend`  
**Script**: `scripts/test-frontend-errors.sh`

**What it checks:**
- ✅ Service connectivity (Python API, TypeScript API, React frontend)
- ✅ Frontend accessibility and HTML structure
- ✅ API data flow and response format
- ✅ React app container and page title
- ✅ Network port availability
- ✅ Process health monitoring

### 2. API Integration Testing
**Command**: `npm run test:api`  
**Script**: `scripts/test-api-integration.sh`

**What it checks:**
- ✅ Real agent server health (port 7778)
- ✅ TypeScript API endpoints (port 7779)
- ✅ React frontend server (port 3000/3001/3002)
- ✅ Data integration between services
- ✅ Configuration validation

### 3. Complete Health Check
**Command**: `npm run health` or `npm run test:all`  
Runs both API and frontend tests for comprehensive validation.

## 🔄 Continuous Monitoring

### Health Monitor
**Command**: `bash scripts/monitor-frontend-health.sh`

**Features:**
- 🔄 Continuous monitoring every 30 seconds
- 📊 Success rate tracking
- 📝 Automatic logging to `logs/frontend-health.log`
- 🚨 Alert system for consecutive failures
- 📈 System resource monitoring

**Example Output:**
```
[14:30:15] Health Check #1
----------------------------------------
✓ Python API (7778)
✓ TypeScript API (7779) 
✓ Frontend (3002)
✓ Python API data
✓ TypeScript API data
✓ Frontend HTML structure
✓ All required ports active
✅ All systems healthy
Status: 100% healthy (0/1 failed)
```

## 🚨 Error Detection Capabilities

The automated tests can detect:

### Frontend Errors
- ❌ React app container missing
- ❌ Invalid HTML structure
- ❌ JavaScript bundle loading failures
- ❌ Network request failures
- ❌ Console errors and warnings
- ❌ API connectivity issues

### API Errors
- ❌ Service unreachable (timeout/connection refused)
- ❌ Invalid response format
- ❌ Missing expected data fields
- ❌ Port conflicts

### System Errors
- ❌ Process crashes
- ❌ Resource exhaustion
- ❌ Configuration issues

## 📊 Test Results Interpretation

### ✅ All Tests Passed
```
🎉 ALL CHECKS PASSED - Frontend appears healthy!

✅ Services are running correctly
✅ Frontend is accessible
✅ API data flow is working  
✅ No critical errors detected

🌐 Access your dashboard at: http://localhost:3002
```

### ❌ Issues Detected
```
⚠️ ISSUES DETECTED

❌ 2 errors found
❌ 1 services have issues

🔧 Recommended actions:
  1. Check if all services are running
  2. Verify port configurations
  3. Check browser console for JavaScript errors
  4. Review service logs for detailed error messages
```

## 🛠️ Troubleshooting Common Issues

### Frontend Not Accessible
1. **Check if services are running:**
   ```bash
   npm run test:frontend
   ```

2. **Verify ports are available:**
   ```bash
   netstat -an | findstr "3002 7778 7779"
   ```

3. **Restart services:**
   ```bash
   # Kill existing processes
   taskkill /F /IM node.exe
   
   # Restart services
   python real-agent-server.py &
   cd api && npm start &
   cd mfe && npm run dev &
   ```

### API Connection Errors
1. **Check API health directly:**
   ```bash
   curl http://localhost:7778/health
   curl http://localhost:7779/health
   ```

2. **Review API logs for errors**
3. **Check Windows firewall settings**

### Console Errors in Browser
1. **Open browser DevTools (F12)**
2. **Check Console tab for JavaScript errors**
3. **Check Network tab for failed requests**
4. **Review Elements tab for missing components**

## 📁 Log Files

### Health Monitor Logs
- **Location**: `logs/frontend-health.log`
- **Content**: Timestamped health check results and errors
- **Rotation**: Manual cleanup required

### Test Output
- **Console output**: Real-time test results with color coding
- **Exit codes**: 0 for success, 1 for failures detected

## 🔧 Advanced Testing

### Browser-Based Testing (Optional)
For more comprehensive testing including JavaScript execution:

1. **Install Puppeteer:**
   ```bash
   bash scripts/install-test-dependencies.sh
   ```

2. **Run advanced tests:**
   ```bash
   node scripts/test-frontend-automation.js
   ```

**Advanced features:**
- 🖥️ Headless browser testing
- 🎯 DOM element validation
- 📱 Responsive design testing
- ⚡ Performance monitoring
- 🔍 JavaScript error capture

### Custom Test Configuration
Edit test scripts to modify:
- Check intervals
- Timeout values
- Expected response content
- Port numbers
- Log file locations

## 📞 Support

If tests continue to fail after troubleshooting:

1. **Review the complete service status:**
   ```bash
   npm run health
   ```

2. **Check background processes:**
   ```bash
   bash scripts/monitor-frontend-health.sh
   ```

3. **Manual verification:**
   - Open http://localhost:3002 in browser
   - Check browser console for errors
   - Verify API endpoints directly

4. **Restart all services and rerun tests**

---

## 🎯 Quick Start

```bash
# Run all tests
npm run health

# Monitor continuously  
bash scripts/monitor-frontend-health.sh

# Test just frontend
npm run test:frontend

# Test just APIs
npm run test:api
```

The testing system ensures your Real Agent Discovery and Monitoring System operates reliably with 237 discovered agents and enterprise-grade monitoring capabilities.