import { test, expect } from '@playwright/test';

test.describe('Real Agent Integration Tests', () => {
  let realAgents: any[] = [];

  test.beforeAll(async ({ request }) => {
    // Get real agents from the system
    const response = await request.get('http://localhost:7778/api/dashboard/agents');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    realAgents = data.agents || [];
    
    console.log(`🔍 Found ${realAgents.length} real agents in the system:`);
    realAgents.forEach((agent, index) => {
      console.log(`   ${index + 1}. ${agent.id} (${agent.name}) - ${agent.type} - ${agent.status}`);
      console.log(`      Platform: ${agent.platform}, Instance: ${agent.instanceId}`);
      console.log(`      Cost: $${agent.cost?.hourly || 0}/hr, $${agent.cost?.daily || 0}/day`);
      console.log(`      Metrics: CPU ${(agent.metrics?.cpuUtilization * 100 || 0).toFixed(1)}%, Memory ${(agent.metrics?.memoryUtilization * 100 || 0).toFixed(1)}%`);
    });
  });

  test('should discover and list real agents from external sources', async ({ request }) => {
    expect(realAgents.length).toBeGreaterThan(0);
    
    // Verify agent structure
    realAgents.forEach(agent => {
      expect(agent.id).toBeDefined();
      expect(agent.name).toBeDefined();
      expect(agent.type).toBeDefined();
      expect(agent.status).toBeDefined();
      expect(agent.platform).toBeDefined();
      
      console.log(`✅ Agent ${agent.id}: Structure verified`);
    });
  });

  test('should show real-time metrics for discovered agents', async ({ request }) => {
    for (const agent of realAgents) {
      // Check if agent has real metrics
      if (agent.metrics) {
        console.log(`📊 ${agent.id} Metrics:`);
        console.log(`   CPU: ${(agent.metrics.cpuUtilization * 100).toFixed(2)}%`);
        console.log(`   Memory: ${(agent.metrics.memoryUtilization * 100).toFixed(2)}%`);
        console.log(`   Network In: ${agent.metrics.networkIn} bytes`);
        console.log(`   Network Out: ${agent.metrics.networkOut} bytes`);
        
        // Verify metrics are numbers
        expect(typeof agent.metrics.cpuUtilization).toBe('number');
        expect(typeof agent.metrics.memoryUtilization).toBe('number');
        expect(typeof agent.metrics.networkIn).toBe('number');
        expect(typeof agent.metrics.networkOut).toBe('number');
      }
    }
  });

  test('should display cost information for real agents', async ({ request }) => {
    for (const agent of realAgents) {
      if (agent.cost) {
        console.log(`💰 ${agent.id} Cost Analysis:`);
        console.log(`   Hourly: $${agent.cost.hourly}`);
        console.log(`   Daily: $${agent.cost.daily}`);
        console.log(`   Monthly: $${agent.cost.monthly}`);
        
        // Verify cost is reasonable
        expect(agent.cost.hourly).toBeGreaterThan(0);
        expect(agent.cost.daily).toBeGreaterThan(agent.cost.hourly);
        expect(agent.cost.monthly).toBeGreaterThan(agent.cost.daily);
      }
    }
  });

  test('should track real agent status changes over time', async ({ request }) => {
    const initialStatuses = new Map();
    
    // Record initial statuses
    realAgents.forEach(agent => {
      initialStatuses.set(agent.id, {
        status: agent.status,
        lastStatusChange: agent.lastStatusChange,
        cpuUtilization: agent.metrics?.cpuUtilization || 0
      });
      console.log(`📌 Initial: ${agent.id} - ${agent.status} (CPU: ${(agent.metrics?.cpuUtilization * 100 || 0).toFixed(1)}%)`);
    });

    // Wait and check for changes
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get updated agent data
    const response = await request.get('http://localhost:7778/api/dashboard/agents');
    const updatedData = await response.json();
    const updatedAgents = updatedData.agents || [];

    // Compare statuses
    updatedAgents.forEach(agent => {
      const initial = initialStatuses.get(agent.id);
      if (initial) {
        const statusChanged = initial.status !== agent.status;
        const cpuChanged = Math.abs(initial.cpuUtilization - (agent.metrics?.cpuUtilization || 0)) > 0.01;
        
        console.log(`🔄 ${agent.id}:`);
        console.log(`   Status: ${initial.status} → ${agent.status} ${statusChanged ? '(CHANGED)' : ''}`);
        console.log(`   CPU: ${(initial.cpuUtilization * 100).toFixed(1)}% → ${((agent.metrics?.cpuUtilization || 0) * 100).toFixed(1)}% ${cpuChanged ? '(CHANGED)' : ''}`);
        
        if (statusChanged || cpuChanged) {
          console.log(`✨ Agent ${agent.id} has live data changes!`);
        }
      }
    });
  });

  test('should verify data source connectivity', async ({ request }) => {
    const response = await request.get('http://localhost:7778/api/dashboard/data-sources');
    expect(response.ok()).toBeTruthy();
    
    const dataSources = await response.json();
    console.log('📡 Data Source Status:');
    
    dataSources.sources?.forEach((source: any) => {
      console.log(`   ${source.name}: ${source.status} (${source.responseTime}ms)`);
      expect(source.status).toBe('connected');
      expect(source.responseTime).toBeGreaterThan(0);
    });
  });

  test('should test agent control operations where available', async ({ request }) => {
    for (const agent of realAgents.slice(0, 1)) { // Test only first agent
      console.log(`🎮 Testing control operations for ${agent.id}...`);

      // Try to get agent details
      const detailResponse = await request.get(`http://localhost:7778/api/dashboard/agents/${agent.id}`);
      console.log(`   Agent details: ${detailResponse.status()}`);

      // Try control operations (these might not be implemented)
      const controlOps = ['status', 'restart', 'stop'];
      
      for (const operation of controlOps) {
        try {
          const controlResponse = await request.post(`http://localhost:7778/api/dashboard/agents/${agent.id}/control`, {
            data: { action: operation }
          });
          
          console.log(`   Control ${operation}: ${controlResponse.status()}`);
          
          if (controlResponse.ok()) {
            const result = await controlResponse.json();
            console.log(`   ✅ ${operation} successful:`, result);
          } else if (controlResponse.status() === 404) {
            console.log(`   ℹ️  ${operation} endpoint not implemented`);
          }
        } catch (error) {
          console.log(`   ❌ ${operation} error:`, error);
        }
      }
    }
  });

  test('should monitor multiple agents simultaneously in UI', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Wait for agents to load
    await page.waitForTimeout(3000);
    
    console.log('🖥️  Monitoring agents in dashboard UI...');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/real-agents-dashboard.png',
      fullPage: true 
    });

    // Check page content
    const pageText = await page.locator('body').textContent();
    
    // Look for agent information
    let visibleAgents = 0;
    realAgents.forEach(agent => {
      const agentVisible = pageText?.includes(agent.id) || 
                          pageText?.includes(agent.name) ||
                          pageText?.includes(agent.instanceId);
      
      if (agentVisible) {
        visibleAgents++;
        console.log(`👁️  Agent ${agent.id} visible in UI`);
      }
    });

    console.log(`📊 UI shows ${visibleAgents} out of ${realAgents.length} real agents`);
    
    // Check for metrics displays
    const hasMetrics = pageText?.includes('CPU') || 
                      pageText?.includes('Memory') ||
                      pageText?.includes('%');
    
    if (hasMetrics) {
      console.log('📈 UI displays performance metrics');
    }

    // Check for cost information
    const hasCosts = pageText?.includes('$') || 
                    pageText?.includes('cost') ||
                    pageText?.includes('hourly');
    
    if (hasCosts) {
      console.log('💰 UI displays cost information');
    }
  });

  test('should handle load testing with real agent discovery', async ({ request }) => {
    console.log('🔥 Load testing agent discovery...');
    
    const requestCount = 10;
    const startTime = Date.now();
    
    // Make multiple concurrent requests to agent endpoint
    const promises = Array(requestCount).fill(0).map(async (_, index) => {
      const reqStart = Date.now();
      
      try {
        const response = await request.get('http://localhost:7778/api/dashboard/agents');
        const reqTime = Date.now() - reqStart;
        
        if (response.ok()) {
          const data = await response.json();
          return {
            index: index + 1,
            success: true,
            responseTime: reqTime,
            agentCount: data.agents?.length || 0
          };
        } else {
          return {
            index: index + 1,
            success: false,
            responseTime: reqTime,
            status: response.status()
          };
        }
      } catch (error) {
        return {
          index: index + 1,
          success: false,
          error: error
        };
      }
    });

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log('⚡ Load Test Results:');
    console.log(`   Total requests: ${results.length}`);
    console.log(`   Successful: ${successful.length}`);
    console.log(`   Failed: ${failed.length}`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Average response time: ${successful.reduce((sum, r) => sum + (r.responseTime || 0), 0) / successful.length || 0}ms`);
    console.log(`   Throughput: ${(results.length / totalTime * 1000).toFixed(2)} requests/second`);

    // All should succeed
    expect(successful.length).toBe(requestCount);
    expect(failed.length).toBe(0);
  });

  test('should verify external data integration is working', async ({ request }) => {
    console.log('🌐 Testing external data integration...');

    // Check live data endpoint
    const liveDataResponse = await request.get('http://localhost:7778/api/dashboard/live-data');
    expect(liveDataResponse.ok()).toBeTruthy();
    
    const liveData = await liveDataResponse.json();
    console.log('📊 Live data response:', JSON.stringify(liveData).substring(0, 200));

    // Verify data structure
    expect(liveData.agents).toBeDefined();
    expect(liveData.dataSources).toBeDefined();
    expect(liveData.timestamp).toBeDefined();

    console.log(`   Agents from external sources: ${liveData.agents?.length || 0}`);
    console.log(`   Data sources: ${liveData.dataSources?.length || 0}`);
    console.log(`   Last updated: ${liveData.timestamp}`);

    // Check if external data is being updated
    const timestamp1 = liveData.timestamp;
    
    // Wait and check again
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const liveDataResponse2 = await request.get('http://localhost:7778/api/dashboard/live-data');
    const liveData2 = await liveDataResponse2.json();
    const timestamp2 = liveData2.timestamp;

    if (timestamp1 !== timestamp2) {
      console.log('✅ External data is being updated in real-time');
    } else {
      console.log('ℹ️  External data timestamps are the same (may be cached)');
    }
  });
});
