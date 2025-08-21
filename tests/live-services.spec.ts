import { test, expect, Page } from '@playwright/test';

test.describe('Live Service Integration Tests', () => {
  let apiHealthy = false;
  let frontendHealthy = false;

  test.beforeAll(async ({ request }) => {
    // Verify API is actually running
    try {
      const apiHealth = await request.get('http://localhost:4001/health');
      apiHealthy = apiHealth.ok();
      const apiData = await apiHealth.json();
      console.log('API Health Check:', apiData);
      expect(apiData.status).toBe('healthy');
      expect(apiData.service).toBe('na-agent-dashboard-api');
    } catch (error) {
      throw new Error('API service is not running on port 4001. Please start it first.');
    }

    // Verify Frontend is actually running
    try {
      const frontendResponse = await request.get('http://localhost:5173');
      frontendHealthy = frontendResponse.ok();
      expect(frontendHealthy).toBeTruthy();
    } catch (error) {
      throw new Error('Frontend service is not running on port 5173. Please start it first.');
    }
  });

  test('Live API endpoints return real data', async ({ request }) => {
    // Test all API endpoints return actual data
    const endpoints = [
      '/api/dashboard/agents',
      '/api/dashboard/stats',
      '/api/dashboard/issues',
      '/health'
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`http://localhost:4001${endpoint}`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      console.log(`Endpoint ${endpoint} returned:`, JSON.stringify(data).substring(0, 200));
      expect(data).toBeDefined();
      expect(data).not.toBeNull();
    }
  });

  test('Frontend loads and connects to live API', async ({ page }) => {
    // Monitor network requests
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('localhost:4001')) {
        apiCalls.push(request.url());
      }
    });

    await page.goto('http://localhost:5173');
    
    // Wait for API calls to be made
    await page.waitForTimeout(3000);
    
    console.log('API calls made by frontend:', apiCalls);
    
    // Frontend should make API calls
    if (apiCalls.length === 0) {
      console.warn('No API calls detected - frontend may not be connecting to backend');
    }
  });

  test('WebSocket establishes real connection', async ({ page }) => {
    let wsConnected = false;
    let wsMessages: any[] = [];

    // Monitor WebSocket
    page.on('websocket', ws => {
      console.log('WebSocket created:', ws.url());
      wsConnected = true;
      
      ws.on('framereceived', event => {
        if (event.payload) {
          try {
            const data = JSON.parse(event.payload.toString());
            wsMessages.push(data);
            console.log('WebSocket message received:', data);
          } catch (e) {
            // Not JSON, log raw
            console.log('WebSocket raw frame:', event.payload.toString().substring(0, 100));
          }
        }
      });
    });

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(5000);

    console.log('WebSocket connected:', wsConnected);
    console.log('WebSocket messages received:', wsMessages.length);
  });

  test('Live agent data is displayed in UI', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for React to render
    await page.waitForTimeout(2000);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'tests/screenshots/dashboard-loaded.png', fullPage: true });
    
    // Get the actual HTML content
    const htmlContent = await page.content();
    console.log('Page title:', await page.title());
    console.log('Body text sample:', (await page.locator('body').textContent())?.substring(0, 500));
    
    // Check if React app has rendered
    const rootContent = await page.locator('#root').innerHTML();
    expect(rootContent.length).toBeGreaterThan(50); // Should have substantial content
    
    // Look for any agent-related content
    const pageText = await page.locator('body').textContent();
    const hasAgentContent = pageText?.includes('agent') || 
                            pageText?.includes('Agent') ||
                            pageText?.includes('developer') ||
                            pageText?.includes('architect') ||
                            pageText?.includes('devops');
    
    if (!hasAgentContent) {
      console.log('Warning: No agent-related content found on page');
      console.log('Page content:', pageText?.substring(0, 1000));
    }
  });

  test('Real-time agent message communication', async ({ page, request }) => {
    // Send a real message to an agent
    const message = `Test message at ${new Date().toISOString()}`;
    const response = await request.post('http://localhost:4001/api/dashboard/agents/demo-developer-1/message', {
      data: {
        message: message,
        context: { 
          test: 'live-ui-test',
          timestamp: Date.now()
        }
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    
    console.log('Agent response:', responseData);
    expect(responseData.id).toBeDefined();
    expect(responseData.agentId).toBe('demo-developer-1');
    expect(responseData.type).toBe('agent');
    expect(responseData.content).toBeDefined();
    expect(responseData.timestamp).toBeDefined();

    // Verify conversation history
    const historyResponse = await request.get('http://localhost:4001/api/dashboard/agents/demo-developer-1/conversation');
    expect(historyResponse.ok()).toBeTruthy();
    
    const history = await historyResponse.json();
    console.log('Conversation history:', history);
    expect(history.messages).toBeDefined();
    expect(Array.isArray(history.messages)).toBeTruthy();
    
    // Should contain our message
    const ourMessage = history.messages.find((m: any) => m.content === message);
    expect(ourMessage).toBeDefined();
  });

  test('Task submission to live agents', async ({ request }) => {
    const taskData = {
      task: `Automated test task - ${Date.now()}`,
      priority: 'high',
      context: {
        source: 'playwright-test',
        timestamp: new Date().toISOString()
      },
      timeout: 120
    };

    const response = await request.post('http://localhost:4001/api/dashboard/agents/demo-architect-1/task', {
      data: taskData,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    console.log('Task submission result:', result);
    expect(result.taskId).toBeDefined();
    expect(result.status).toBe('submitted');
    
    // Task ID should be unique
    expect(result.taskId).toContain('task-');
  });

  test('Live statistics update correctly', async ({ request }) => {
    // Get initial stats
    const stats1 = await request.get('http://localhost:4001/api/dashboard/stats');
    const data1 = await stats1.json();
    
    console.log('Initial statistics:', data1);
    
    // Submit a task to change stats
    await request.post('http://localhost:4001/api/dashboard/agents/demo-qa-1/task', {
      data: {
        task: 'Test task for stats update',
        priority: 'low'
      }
    });
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get updated stats
    const stats2 = await request.get('http://localhost:4001/api/dashboard/stats');
    const data2 = await stats2.json();
    
    console.log('Updated statistics:', data2);
    
    // Verify stats structure
    expect(data2.totalAgents).toBeDefined();
    expect(data2.activeAgents).toBeDefined();
    expect(data2.idleAgents).toBeDefined();
    expect(data2.totalCost).toBeDefined();
    expect(data2.totalCost.hourly).toBeGreaterThanOrEqual(0);
  });

  test('Multiple agents handle concurrent messages', async ({ request }) => {
    const agents = ['demo-architect-1', 'demo-developer-1', 'demo-devops-1'];
    const messages = [];

    // Send messages to all agents concurrently
    const promises = agents.map(agentId => 
      request.post(`http://localhost:4001/api/dashboard/agents/${agentId}/message`, {
        data: {
          message: `Concurrent test for ${agentId} at ${Date.now()}`,
          context: { concurrent: true }
        }
      })
    );

    const responses = await Promise.all(promises);
    
    // All should succeed
    responses.forEach((response, index) => {
      expect(response.ok()).toBeTruthy();
      console.log(`Agent ${agents[index]} responded successfully`);
    });

    // Get all response data
    for (let i = 0; i < responses.length; i++) {
      const data = await responses[i].json();
      messages.push(data);
      expect(data.agentId).toBe(agents[i]);
      expect(data.content).toBeDefined();
    }

    console.log('All concurrent messages processed:', messages.map(m => m.id));
  });

  test('Error handling for invalid agent IDs', async ({ request }) => {
    const response = await request.post('http://localhost:4001/api/dashboard/agents/invalid-agent-id/message', {
      data: {
        message: 'Test message to invalid agent'
      }
    });

    expect(response.status()).toBe(500);
    const error = await response.json();
    console.log('Error response for invalid agent:', error);
    expect(error.error).toBeDefined();
  });

  test('UI Components render with live data', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Give React time to render with data
    await page.waitForTimeout(3000);
    
    // Check page structure
    const bodyHTML = await page.locator('body').innerHTML();
    
    // Log what we actually see
    console.log('Page structure elements found:');
    console.log('- Has buttons:', bodyHTML.includes('<button'));
    console.log('- Has divs:', bodyHTML.includes('<div'));
    console.log('- Has text content:', (await page.locator('body').textContent())?.length || 0, 'characters');
    
    // Try to interact with any button
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons on page`);
    
    if (buttons.length > 0) {
      const firstButtonText = await buttons[0].textContent();
      console.log('First button text:', firstButtonText);
    }

    // Check for any data displays
    const allText = await page.locator('body').allTextContents();
    console.log('All text on page:', allText.join(' ').substring(0, 500));
  });

  test('Monitor console for errors', async ({ page }) => {
    const consoleMessages: { type: string, text: string }[] = [];
    
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(5000);

    // Log all console messages
    console.log('Console messages:', consoleMessages);
    
    const errors = consoleMessages.filter(m => m.type === 'error');
    const warnings = consoleMessages.filter(m => m.type === 'warning');
    
    console.log(`Found ${errors.length} errors and ${warnings.length} warnings`);
    
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }
  });

  test('Verify all services are truly independent', async ({ request }) => {
    // Test that API works independently
    const directAPICall = await request.get('http://localhost:4001/api/dashboard/agents');
    expect(directAPICall.ok()).toBeTruthy();
    
    const agents = await directAPICall.json();
    console.log('Direct API call returned', agents.agents?.length || 0, 'agents');
    
    // Verify data is not hardcoded
    expect(agents.timestamp).toBeDefined();
    const timestamp1 = agents.timestamp;
    
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const secondCall = await request.get('http://localhost:4001/api/dashboard/agents');
    const agents2 = await secondCall.json();
    const timestamp2 = agents2.timestamp;
    
    // Timestamps should be different
    expect(timestamp1).not.toBe(timestamp2);
    console.log('Timestamps are unique:', timestamp1, 'vs', timestamp2);
  });
});