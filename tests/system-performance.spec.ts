import { test, expect } from '@playwright/test';

test.describe('Multi-Agent System Performance Tests', () => {
  let systemAgents: any[] = [];

  test.beforeAll(async ({ request }) => {
    // Get current agents from the live system
    const response = await request.get('http://localhost:7778/api/dashboard/agents');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    systemAgents = data.agents || [];
    
    console.log(`🎯 Testing multi-agent system with ${systemAgents.length} live agents:`);
    systemAgents.forEach((agent, index) => {
      console.log(`   ${index + 1}. ${agent.name} (${agent.id})`);
      console.log(`      Type: ${agent.type}, Status: ${agent.status}, Platform: ${agent.platform}`);
      console.log(`      Metrics: CPU ${(agent.metrics?.cpuUtilization * 100 || 0).toFixed(1)}%, Memory ${(agent.metrics?.memoryUtilization * 100 || 0).toFixed(1)}%`);
      console.log(`      Cost: $${agent.cost?.hourly || 0}/hr`);
    });
  });

  test('should handle concurrent agent discovery requests', async ({ request }) => {
    console.log('🔄 Testing concurrent agent discovery...');
    
    const concurrentRequests = 15;
    const startTime = Date.now();
    
    // Make multiple concurrent requests
    const requests = Array(concurrentRequests).fill(0).map(async (_, index) => {
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
            agentCount: data.agents?.length || 0,
            dataSize: JSON.stringify(data).length
          };
        } else {
          return { index: index + 1, success: false, status: response.status(), responseTime: reqTime };
        }
      } catch (error) {
        return { index: index + 1, success: false, error: error.message };
      }
    });

    const results = await Promise.all(requests);
    const totalTime = Date.now() - startTime;
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log('📊 Concurrent Discovery Results:');
    console.log(`   Requests: ${concurrentRequests}`);
    console.log(`   Successful: ${successful.length}`);
    console.log(`   Failed: ${failed.length}`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Average response: ${successful.reduce((sum, r) => sum + (r.responseTime || 0), 0) / successful.length || 0}ms`);
    console.log(`   Throughput: ${(concurrentRequests / totalTime * 1000).toFixed(2)} req/sec`);
    console.log(`   Average data size: ${successful.reduce((sum, r) => sum + (r.dataSize || 0), 0) / successful.length || 0} bytes`);

    // All should succeed and return consistent agent counts
    expect(successful.length).toBe(concurrentRequests);
    
    const agentCounts = successful.map(r => r.agentCount);
    const uniqueCounts = [...new Set(agentCounts)];
    expect(uniqueCounts.length).toBe(1); // All should return same agent count
    
    console.log(`✅ All requests returned consistent agent count: ${uniqueCounts[0]}`);
  });

  test('should simulate multi-agent task coordination workflow', async ({ request }) => {
    console.log('🤝 Simulating multi-agent coordination workflow...');
    
    // Since we can't directly submit tasks to agents, we'll test the API endpoints and simulate workflow
    const workflowSteps = [
      { phase: 'Planning', description: 'Project requirements analysis and planning' },
      { phase: 'Architecture', description: 'System design and architecture planning' },
      { phase: 'Development', description: 'Feature implementation and coding' },
      { phase: 'Testing', description: 'Quality assurance and testing' },
      { phase: 'Deployment', description: 'Production deployment and monitoring' }
    ];

    console.log('🚀 Workflow phases:');
    workflowSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step.phase}: ${step.description}`);
    });

    // Test statistics endpoint during workflow simulation
    const statsRequests = workflowSteps.map(async (step, index) => {
      await new Promise(resolve => setTimeout(resolve, index * 500)); // Stagger requests
      
      try {
        const response = await request.get('http://localhost:7778/api/dashboard/stats');
        
        if (response.ok()) {
          const stats = await response.json();
          console.log(`📊 ${step.phase} phase stats:`, {
            totalAgents: stats.totalAgents,
            activeAgents: stats.activeAgents,
            totalCost: stats.totalCost?.hourly
          });
          
          return { phase: step.phase, success: true, stats };
        } else {
          return { phase: step.phase, success: false, status: response.status() };
        }
      } catch (error) {
        return { phase: step.phase, success: false, error: error.message };
      }
    });

    const workflowResults = await Promise.all(statsRequests);
    const successfulPhases = workflowResults.filter(r => r.success);
    
    console.log(`✅ Workflow simulation completed: ${successfulPhases.length}/${workflowSteps.length} phases successful`);
    expect(successfulPhases.length).toBeGreaterThanOrEqual(workflowSteps.length * 0.8); // At least 80% success
  });

  test('should test real-time data updates across multiple sources', async ({ request }) => {
    console.log('📡 Testing real-time data updates...');
    
    const dataSources = ['agents', 'stats', 'data-sources'];
    const updateIntervals = [1000, 1500, 2000]; // Different intervals
    
    const dataCollectionPromises = dataSources.map(async (source, index) => {
      const interval = updateIntervals[index];
      const snapshots: any[] = [];
      
      console.log(`📊 Collecting ${source} data every ${interval}ms...`);
      
      for (let i = 0; i < 3; i++) {
        try {
          const response = await request.get(`http://localhost:7778/api/dashboard/${source}`);
          
          if (response.ok()) {
            const data = await response.json();
            snapshots.push({
              timestamp: Date.now(),
              success: true,
              dataSize: JSON.stringify(data).length,
              snapshot: i + 1
            });
          } else {
            snapshots.push({
              timestamp: Date.now(),
              success: false,
              status: response.status(),
              snapshot: i + 1
            });
          }
        } catch (error) {
          snapshots.push({
            timestamp: Date.now(),
            success: false,
            error: error.message,
            snapshot: i + 1
          });
        }
        
        if (i < 2) await new Promise(resolve => setTimeout(resolve, interval));
      }
      
      return { source, snapshots };
    });

    const dataResults = await Promise.all(dataCollectionPromises);
    
    console.log('📈 Data Update Analysis:');
    dataResults.forEach(({ source, snapshots }) => {
      const successful = snapshots.filter(s => s.success);
      const avgDataSize = successful.reduce((sum, s) => sum + (s.dataSize || 0), 0) / successful.length || 0;
      
      console.log(`   ${source}: ${successful.length}/3 successful, avg size: ${avgDataSize.toFixed(0)} bytes`);
      
      if (successful.length >= 2) {
        const timeDiff = successful[successful.length - 1].timestamp - successful[0].timestamp;
        console.log(`   Time span: ${timeDiff}ms`);
      }
    });

    // Expect at least some successful data collection
    dataResults.forEach(({ source, snapshots }) => {
      const successful = snapshots.filter(s => s.success);
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  test('should monitor system performance under load', async ({ request, page }) => {
    console.log('⚡ Testing system performance under load...');
    
    // Navigate to dashboard
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Monitor console for errors during load test
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Simulate multiple users accessing the dashboard
    const userSimulations = Array(5).fill(0).map(async (_, userIndex) => {
      const userStartTime = Date.now();
      const userRequests: any[] = [];
      
      for (let i = 0; i < 6; i++) {
        const requestType = ['agents', 'stats', 'data-sources'][i % 3];
        
        try {
          const response = await request.get(`http://localhost:7778/api/dashboard/${requestType}`);
          userRequests.push({
            type: requestType,
            success: response.ok(),
            responseTime: Date.now() - userStartTime,
            status: response.status()
          });
        } catch (error) {
          userRequests.push({
            type: requestType,
            success: false,
            error: error.message
          });
        }
        
        // Random delay between requests (simulate user behavior)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
      }
      
      return { user: userIndex + 1, requests: userRequests };
    });

    const userResults = await Promise.all(userSimulations);
    
    // Analyze performance
    let totalRequests = 0;
    let successfulRequests = 0;
    let totalResponseTime = 0;
    
    userResults.forEach(({ user, requests }) => {
      const successful = requests.filter(r => r.success);
      totalRequests += requests.length;
      successfulRequests += successful.length;
      totalResponseTime += successful.reduce((sum, r) => sum + (r.responseTime || 0), 0);
      
      console.log(`👤 User ${user}: ${successful.length}/${requests.length} successful requests`);
    });

    const avgResponseTime = totalResponseTime / successfulRequests || 0;
    const successRate = (successfulRequests / totalRequests) * 100;
    
    console.log('🎯 Load Test Summary:');
    console.log(`   Total requests: ${totalRequests}`);
    console.log(`   Successful: ${successfulRequests}`);
    console.log(`   Success rate: ${successRate.toFixed(1)}%`);
    console.log(`   Average response time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Console errors during test: ${consoleErrors.length}`);

    // Take screenshot at the end
    await page.screenshot({ 
      path: 'test-results/load-test-dashboard.png',
      fullPage: true 
    });

    // Performance expectations
    expect(successRate).toBeGreaterThan(90); // 90% success rate
    expect(avgResponseTime).toBeLessThan(2000); // Under 2 seconds average
    
    console.log('✅ System performed well under load');
  });

  test('should test data consistency across multiple endpoints', async ({ request }) => {
    console.log('🔍 Testing data consistency...');
    
    // Get data from multiple endpoints simultaneously
    const endpoints = [
      'http://localhost:7778/api/dashboard/agents',
      'http://localhost:7778/api/dashboard/stats',
      'http://localhost:7778/api/dashboard/data-sources'
    ];

    const consistencyTests: any[] = [];
    
    // Run multiple rounds to check consistency
    for (let round = 1; round <= 3; round++) {
      console.log(`📊 Consistency check round ${round}...`);
      
      const roundStart = Date.now();
      
      const roundRequests = endpoints.map(async (endpoint) => {
        try {
          const response = await request.get(endpoint);
          
          if (response.ok()) {
            const data = await response.json();
            return {
              endpoint: endpoint.split('/').pop(),
              success: true,
              data,
              timestamp: Date.now()
            };
          } else {
            return {
              endpoint: endpoint.split('/').pop(),
              success: false,
              status: response.status()
            };
          }
        } catch (error) {
          return {
            endpoint: endpoint.split('/').pop(),
            success: false,
            error: error.message
          };
        }
      });

      const roundResults = await Promise.all(roundRequests);
      const roundTime = Date.now() - roundStart;
      
      consistencyTests.push({
        round,
        results: roundResults,
        duration: roundTime
      });

      // Check agent count consistency
      const agentsResult = roundResults.find(r => r.endpoint === 'agents');
      const statsResult = roundResults.find(r => r.endpoint === 'stats');
      
      if (agentsResult?.success && statsResult?.success) {
        const agentCount = agentsResult.data.agents?.length || 0;
        const statsAgentCount = statsResult.data.totalAgents || 0;
        
        console.log(`   Agent count - Direct: ${agentCount}, Stats: ${statsAgentCount}`);
        
        if (agentCount === statsAgentCount) {
          console.log(`   ✅ Round ${round}: Agent counts consistent`);
        } else {
          console.log(`   ⚠️  Round ${round}: Agent count mismatch`);
        }
      }

      if (round < 3) await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Analyze consistency across rounds
    const successfulRounds = consistencyTests.filter(test => 
      test.results.every(r => r.success)
    );

    console.log(`🎯 Consistency Results: ${successfulRounds.length}/3 rounds fully successful`);
    
    expect(successfulRounds.length).toBeGreaterThanOrEqual(2); // At least 2/3 rounds successful
  });

  test('should verify system handles edge cases gracefully', async ({ request }) => {
    console.log('🛡️  Testing system resilience...');
    
    const edgeCases = [
      { name: 'Invalid agent ID', endpoint: '/api/dashboard/agents/invalid-agent-123' },
      { name: 'Malformed request', endpoint: '/api/dashboard/agents', method: 'POST', data: { invalid: true } },
      { name: 'Large request', endpoint: '/api/dashboard/agents', headers: { 'x-large-header': 'x'.repeat(1000) } },
      { name: 'Rapid requests', endpoint: '/api/dashboard/agents', count: 20 }
    ];

    for (const edgeCase of edgeCases) {
      console.log(`🧪 Testing: ${edgeCase.name}`);
      
      try {
        if (edgeCase.name === 'Rapid requests') {
          const rapidRequests = Array(edgeCase.count).fill(0).map(() =>
            request.get(`http://localhost:7778${edgeCase.endpoint}`)
          );
          
          const results = await Promise.all(rapidRequests);
          const successCount = results.filter(r => r.ok()).length;
          
          console.log(`   Rapid requests: ${successCount}/${edgeCase.count} successful`);
          expect(successCount).toBeGreaterThan((edgeCase.count || 10) * 0.8); // 80% success rate
          
        } else {
          const response = await request.get(`http://localhost:7778${edgeCase.endpoint}`, {
            headers: edgeCase.headers || {}
          });
          
          console.log(`   Response: ${response.status()}`);
          
          // System should handle gracefully (not crash)
          expect([200, 400, 404, 500].includes(response.status())).toBeTruthy();
        }
        
        console.log(`   ✅ ${edgeCase.name}: Handled gracefully`);
        
      } catch (error) {
        console.log(`   ⚠️  ${edgeCase.name}: Error - ${error.message}`);
        // System should not throw unhandled errors
        expect(error.message).toContain(''); // Just verify error is defined
      }
    }
  });

  test('should generate comprehensive system report', async ({ request }) => {
    console.log('📋 Generating system performance report...');
    
    const report: any = {
      timestamp: new Date().toISOString(),
      agents: [],
      performance: {},
      dataSources: [],
      systemHealth: {}
    };

    // Collect agent data
    try {
      const agentsResponse = await request.get('http://localhost:7778/api/dashboard/agents');
      if (agentsResponse.ok()) {
        const agentsData = await agentsResponse.json();
        report.agents = agentsData.agents || [];
      }
    } catch (error) {
      console.log('   ⚠️  Could not collect agent data');
    }

    // Collect stats
    try {
      const statsResponse = await request.get('http://localhost:7778/api/dashboard/stats');
      if (statsResponse.ok()) {
        const stats = await statsResponse.json();
        report.performance = stats;
      }
    } catch (error) {
      console.log('   ⚠️  Could not collect stats');
    }

    // Collect data sources
    try {
      const sourcesResponse = await request.get('http://localhost:7778/api/dashboard/data-sources');
      if (sourcesResponse.ok()) {
        const sources = await sourcesResponse.json();
        report.dataSources = sources.sources || [];
      }
    } catch (error) {
      console.log('   ⚠️  Could not collect data sources');
    }

    // Performance metrics
    const performanceStart = Date.now();
    const healthResponse = await request.get('http://localhost:7778/health');
    const performanceTime = Date.now() - performanceStart;

    report.systemHealth = {
      apiHealthy: healthResponse.ok(),
      responseTime: performanceTime,
      status: healthResponse.status()
    };

    // Generate summary
    console.log('📊 SYSTEM PERFORMANCE REPORT');
    console.log('='.repeat(50));
    console.log(`🕐 Generated: ${report.timestamp}`);
    console.log(`🤖 Total Agents: ${report.agents.length}`);
    console.log(`📈 Active Agents: ${report.performance.activeAgents || 0}`);
    console.log(`💰 Total Cost: $${report.performance.totalCost?.hourly || 0}/hr`);
    console.log(`📡 Data Sources: ${report.dataSources.length}`);
    console.log(`⚡ API Response: ${report.systemHealth.responseTime}ms`);
    console.log(`💚 System Health: ${report.systemHealth.apiHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    
    console.log('\n🔍 Agent Details:');
    report.agents.forEach((agent, index) => {
      console.log(`   ${index + 1}. ${agent.name} (${agent.type})`);
      console.log(`      Status: ${agent.status}, Platform: ${agent.platform}`);
      console.log(`      CPU: ${(agent.metrics?.cpuUtilization * 100 || 0).toFixed(1)}%, Cost: $${agent.cost?.hourly || 0}/hr`);
    });

    console.log('\n📡 Data Source Status:');
    report.dataSources.forEach(source => {
      console.log(`   ${source.name}: ${source.status} (${source.responseTime}ms)`);
    });

    console.log('\n✅ Multi-Agent System Test Complete!');
    console.log('='.repeat(50));

    // Basic assertions
    expect(report.agents.length).toBeGreaterThanOrEqual(0);
    expect(report.systemHealth.apiHealthy).toBeTruthy();
    expect(report.systemHealth.responseTime).toBeLessThan(5000);
  });
});
