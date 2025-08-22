import { test, expect } from '@playwright/test';

test.describe('Local Live Data Integration Tests', () => {
  const API_URL = 'http://localhost:7778';
  const DASHBOARD_URL = 'http://localhost:3001';

  test('should verify live agent API is accessible', async ({ request }) => {
    console.log('Testing live agent API accessibility...');
    
    try {
      const response = await request.get(`${API_URL}/health`, {
        timeout: 5000,
      });
      
      console.log(`API Health Status: ${response.status()}`);
      expect(response.status()).toBe(200);
      
      const health = await response.json();
      console.log('Health check response:', health);
      
      expect(health.status).toBe('healthy');
      expect(health.server).toBe('live-agent-api');
      expect(health.port).toBe(7778);
      
    } catch (error) {
      console.error('API health check failed:', error);
      throw error;
    }
  });

  test('should fetch real agents data from live API', async ({ request }) => {
    console.log('Testing agents endpoint...');
    
    const response = await request.get(`${API_URL}/agents`);
    console.log(`Agents API Status: ${response.status()}`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    console.log(`API Response:`, {
      success: data.success,
      total: data.total,
      sampleAgent: data.agents?.[0]?.name
    });
    
    expect(data.success).toBe(true);
    expect(data.total).toBeGreaterThan(40); // We expect 41 agents
    expect(data.agents).toHaveLength(data.total);
    
    // Verify agent structure
    const firstAgent = data.agents[0];
    expect(firstAgent).toHaveProperty('id');
    expect(firstAgent).toHaveProperty('name');
    expect(firstAgent).toHaveProperty('type');
    expect(firstAgent).toHaveProperty('status');
    expect(firstAgent).toHaveProperty('platform');
    expect(firstAgent).toHaveProperty('capabilities');
    expect(firstAgent).toHaveProperty('metrics');
  });

  test('should verify CORS headers for dashboard access', async ({ request }) => {
    console.log('Testing CORS configuration...');
    
    const response = await request.get(`${API_URL}/agents`);
    const headers = await response.headers();
    
    console.log('CORS headers:', {
      origin: headers['access-control-allow-origin'],
      methods: headers['access-control-allow-methods'],
      headers: headers['access-control-allow-headers']
    });
    
    expect(headers['access-control-allow-origin']).toBe('*');
  });

  test('should load dashboard and verify no network errors', async ({ page }) => {
    console.log('Testing dashboard with live data...');
    
    const consoleMessages: string[] = [];
    const networkErrors: string[] = [];
    const networkRequests: string[] = [];
    
    // Track all console messages
    page.on('console', msg => {
      const message = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(message);
      if (msg.type() === 'error') {
        console.log(`Browser error: ${message}`);
      }
    });
    
    // Track failed requests
    page.on('requestfailed', request => {
      const error = `${request.method()} ${request.url()} - ${request.failure()?.errorText}`;
      networkErrors.push(error);
      console.log(`Network failure: ${error}`);
    });
    
    // Track all API requests
    page.on('request', request => {
      if (request.url().includes(':7778')) {
        networkRequests.push(`${request.method()} ${request.url()}`);
        console.log(`API request: ${request.method()} ${request.url()}`);
      }
    });
    
    // Navigate to dashboard
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    
    // Wait for agents to load
    await page.waitForTimeout(3000);
    
    console.log(`Network requests to API: ${networkRequests.length}`);
    console.log(`Network errors: ${networkErrors.length}`);
    console.log(`Console errors: ${consoleMessages.filter(m => m.startsWith('error:')).length}`);
    
    // Log any network errors for debugging
    if (networkErrors.length > 0) {
      console.log('Network errors detected:', networkErrors);
    }
    
    // Verify no API-related network errors
    const apiErrors = networkErrors.filter(error => error.includes(':7778'));
    expect(apiErrors.length).toBe(0);
    
    // Verify API requests were made
    expect(networkRequests.length).toBeGreaterThan(0);
    expect(networkRequests.some(req => req.includes('/agents'))).toBe(true);
  });

  test('should display real agent data in dashboard UI', async ({ page }) => {
    console.log('Testing UI displays real agent data...');
    
    await page.goto(DASHBOARD_URL);
    
    // Wait for agents to load
    await page.waitForSelector('[data-testid="agent-card"], .agent-card, [class*="agent"]', { 
      timeout: 10000,
      state: 'attached'
    });
    
    // Check for loading indicators first
    const loadingElements = await page.locator('[data-testid="loading"], .loading, [class*="loading"]').count();
    console.log(`Loading elements found: ${loadingElements}`);
    
    // Wait a bit more if still loading
    if (loadingElements > 0) {
      await page.waitForTimeout(2000);
    }
    
    // Check page content for agent-related text
    const pageContent = await page.textContent('body');
    const hasAgentContent = pageContent?.includes('Agent') || 
                           pageContent?.includes('agent') ||
                           pageContent?.includes('real-agent-');
    
    console.log(`Page contains agent content: ${hasAgentContent}`);
    console.log('Sample page content:', pageContent?.substring(0, 500));
    
    expect(hasAgentContent).toBe(true);
    
    // Try to find specific agent data
    const agentElements = await page.locator('text=/real-agent-|Agent|agent/').count();
    console.log(`Found ${agentElements} elements with agent text`);
    
    expect(agentElements).toBeGreaterThan(0);
  });

  test('should verify dashboard fetches data from correct API endpoint', async ({ page }) => {
    console.log('Testing dashboard API integration...');
    
    let apiCallMade = false;
    let apiResponse: any = null;
    
    // Intercept API calls
    page.on('response', async (response) => {
      if (response.url().includes('localhost:7778/agents')) {
        apiCallMade = true;
        console.log(`API call intercepted: ${response.status()} ${response.url()}`);
        
        if (response.status() === 200) {
          try {
            apiResponse = await response.json();
            console.log(`API returned ${apiResponse.total} agents`);
          } catch (e) {
            console.log('Could not parse API response as JSON');
          }
        }
      }
    });
    
    await page.goto(DASHBOARD_URL);
    await page.waitForTimeout(5000); // Wait for API calls
    
    console.log(`API call made: ${apiCallMade}`);
    console.log(`API response received: ${apiResponse !== null}`);
    
    expect(apiCallMade).toBe(true);
    
    if (apiResponse) {
      expect(apiResponse.success).toBe(true);
      expect(apiResponse.total).toBeGreaterThan(40);
    }
  });
});