import { test, expect } from '@playwright/test';

test.describe('Working Live Agent System Tests', () => {
  const API_URL = 'http://localhost:7779';
  const DASHBOARD_URL = 'http://localhost:3001';

  test('should verify complete live system functionality', async ({ page, request }) => {
    console.log('🧪 Testing complete live agent system...');

    // 1. Test API Server Health
    console.log('1️⃣ Testing API server health...');
    const healthResponse = await request.get(`${API_URL}/api/health`);
    expect(healthResponse.status()).toBe(200);
    
    const health = await healthResponse.json();
    expect(health.status).toBe('healthy');
    expect(health.services.agents).toBeDefined();
    console.log(`✅ API Server healthy with ${health.services.agents.running + health.services.agents.stopped} agents`);

    // 2. Test Agent Data
    console.log('2️⃣ Testing agent data...');
    const agentsResponse = await request.get(`${API_URL}/api/dashboard/agents`);
    expect(agentsResponse.status()).toBe(200);
    
    const agentsData = await agentsResponse.json();
    expect(agentsData.success).toBe(true);
    expect(agentsData.agents.length).toBeGreaterThan(3);
    console.log(`✅ Found ${agentsData.totalAgents} agents in system`);

    // 3. Test Agent Control - Start Agent
    console.log('3️⃣ Testing agent control...');
    const startResponse = await request.post(`${API_URL}/api/agents/orchestrator-agent/start`);
    expect(startResponse.status()).toBe(200);
    
    const startData = await startResponse.json();
    expect(startData.success).toBe(true);
    expect(startData.agent.status).toBe('running');
    expect(startData.agent.pid).toBeDefined();
    console.log(`✅ Started orchestrator-agent with PID: ${startData.agent.pid}`);

    // 4. Verify Agent Status Changed
    const updatedAgentsResponse = await request.get(`${API_URL}/api/dashboard/agents`);
    const updatedAgentsData = await updatedAgentsResponse.json();
    const orchestratorAgent = updatedAgentsData.agents.find(a => a.id === 'orchestrator-agent');
    expect(orchestratorAgent.status).toBe('active');
    expect(orchestratorAgent.pid).toBeDefined();
    console.log(`✅ Verified orchestrator-agent is running with PID: ${orchestratorAgent.pid}`);

    // 5. Test Agent Control - Stop Agent  
    const stopResponse = await request.post(`${API_URL}/api/agents/orchestrator-agent/stop`);
    expect(stopResponse.status()).toBe(200);
    
    const stopData = await stopResponse.json();
    expect(stopData.success).toBe(true);
    expect(stopData.agent.status).toBe('idle');
    console.log(`✅ Stopped orchestrator-agent successfully`);

    // 6. Test Dashboard UI (Basic Load)
    console.log('4️⃣ Testing dashboard UI...');
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check if page loaded without major errors
    const title = await page.title();
    expect(title).toBeTruthy();
    console.log(`✅ Dashboard loaded with title: "${title}"`);

    // 7. System Metrics
    console.log('5️⃣ Testing system metrics...');
    const metricsResponse = await request.get(`${API_URL}/api/system/metrics`);
    expect(metricsResponse.status()).toBe(200);
    
    const metricsData = await metricsResponse.json();
    expect(metricsData.success).toBe(true);
    expect(metricsData.metrics.cpu).toBeGreaterThan(0);
    expect(metricsData.metrics.memory).toBeGreaterThan(0);
    console.log(`✅ System metrics: CPU ${metricsData.metrics.cpu}%, Memory ${metricsData.metrics.memory}%`);

    console.log('🎉 ALL TESTS PASSED - Live agent system is fully functional!');
  });

  test('should verify real-time WebSocket updates', async ({ page }) => {
    console.log('📡 Testing WebSocket real-time updates...');
    
    let wsMessages = [];
    
    // Listen for WebSocket messages
    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        try {
          const data = JSON.parse(event.payload.toString());
          if (data.agents) {
            wsMessages.push(data);
            console.log(`📨 Received WebSocket update with ${data.agents.length} agents`);
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      });
    });
    
    // Navigate to dashboard (this should establish WebSocket connection)
    await page.goto(DASHBOARD_URL);
    await page.waitForTimeout(5000); // Wait for WebSocket messages
    
    // We should have received at least one WebSocket message
    expect(wsMessages.length).toBeGreaterThan(0);
    console.log(`✅ Received ${wsMessages.length} WebSocket messages`);
    
    // Verify message structure
    const lastMessage = wsMessages[wsMessages.length - 1];
    expect(lastMessage.agents).toBeDefined();
    expect(lastMessage.systemMetrics).toBeDefined();
    expect(lastMessage.timestamp).toBeDefined();
    console.log(`✅ WebSocket messages have correct structure`);
  });

  test('should handle concurrent agent operations', async ({ request }) => {
    console.log('⚡ Testing concurrent agent operations...');
    
    // Start multiple agents concurrently
    const agents = ['qa-agent-real', 'developer-agent-real', 'github-agent'];
    const startPromises = agents.map(agentId => 
      request.post(`${API_URL}/api/agents/${agentId}/start`)
    );
    
    const startResults = await Promise.all(startPromises);
    
    // Verify all starts succeeded
    startResults.forEach((response, index) => {
      expect(response.status()).toBe(200);
      console.log(`✅ Started ${agents[index]} concurrently`);
    });
    
    // Check system still responsive
    const healthResponse = await request.get(`${API_URL}/api/health`);
    expect(healthResponse.status()).toBe(200);
    console.log(`✅ System remains healthy under concurrent load`);
    
    // Stop all agents
    const stopPromises = agents.map(agentId =>
      request.post(`${API_URL}/api/agents/${agentId}/stop`)
    );
    
    const stopResults = await Promise.all(stopPromises);
    stopResults.forEach((response, index) => {
      expect(response.status()).toBe(200);
      console.log(`✅ Stopped ${agents[index]} concurrently`);
    });
  });
});