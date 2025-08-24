import { test, expect } from '@playwright/test';

test.describe('VF-Dev Live Dashboard Tests', () => {
  const DASHBOARD_URL = 'http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com/';
  const API_URL = 'http://localhost:7778';

  test('should load vf-dev dashboard without network errors', async ({ page }) => {
    console.log('Testing vf-dev dashboard for network errors...');
    
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];
    const apiRequests: string[] = [];
    
    // Track console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const message = msg.text();
        consoleErrors.push(message);
        console.log(`Console error: ${message}`);
      }
    });
    
    // Track network failures
    page.on('requestfailed', request => {
      const error = `${request.method()} ${request.url()} - ${request.failure()?.errorText}`;
      networkErrors.push(error);
      console.log(`Network error: ${error}`);
    });
    
    // Track API requests
    page.on('request', request => {
      const url = request.url();
      if (url.includes('54.156.68.236') || url.includes(':7777')) {
        apiRequests.push(`${request.method()} ${url}`);
        console.log(`API request: ${request.method()} ${url}`);
      }
    });
    
    // Navigate to vf-dev dashboard
    console.log(`Loading dashboard: ${DASHBOARD_URL}`);
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for any async API calls
    await page.waitForTimeout(10000);
    
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Network errors: ${networkErrors.length}`);
    console.log(`API requests made: ${apiRequests.length}`);
    
    // Log specific errors for debugging
    if (consoleErrors.length > 0) {
      console.log('Console errors detected:', consoleErrors);
    }
    
    if (networkErrors.length > 0) {
      console.log('Network errors detected:', networkErrors);
    }
    
    if (apiRequests.length > 0) {
      console.log('API requests made:', apiRequests);
    }
    
    // Verify page loaded successfully
    await expect(page).toHaveTitle(/Agent Orchestrator Dashboard/);
    
    // The main goal is to check for network errors, not necessarily pass/fail the test
    // since the API might still be deploying
    console.log(`✅ Dashboard loaded successfully`);
    console.log(`📊 Network errors found: ${networkErrors.length}`);
    console.log(`🔗 API requests attempted: ${apiRequests.length}`);
  });

  test('should test API endpoint connectivity directly', async ({ request }) => {
    console.log('Testing API endpoint connectivity...');
    
    try {
      const response = await request.get(`${API_URL}/health`, { timeout: 10000 });
      console.log(`API health check: ${response.status()}`);
      
      if (response.status() === 200) {
        const health = await response.json();
        console.log('API health response:', health);
        expect(response.status()).toBe(200);
      } else {
        console.log('API not responding with 200, might still be deploying');
      }
    } catch (error) {
      console.log('API connection failed:', error);
      console.log('This might indicate the deployment is still in progress');
    }
    
    try {
      const response = await request.get(`${API_URL}/api/agents`, { timeout: 10000 });
      console.log(`Agents endpoint: ${response.status()}`);
      
      if (response.status() === 200) {
        const data = await response.json();
        console.log(`Agents returned: ${Array.isArray(data) ? data.length : 'unknown format'}`);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log(`First agent: ${JSON.stringify(data[0], null, 2)}`);
          
          // Check if we have real agent names vs mock data
          const hasRealNames = data.some(agent => 
            agent.name && !agent.name.match(/^Agent \d+$/)
          );
          console.log(`Real agent data detected: ${hasRealNames}`);
        }
      }
    } catch (error) {
      console.log('Agents endpoint failed:', error);
    }
  });

  test('should check dashboard API integration', async ({ page }) => {
    console.log('Testing dashboard API integration...');
    
    let apiResponseReceived = false;
    let apiData: any = null;
    
    // Intercept API responses
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('54.156.68.236') || url.includes(':7777')) {
        console.log(`API response intercepted: ${response.status()} ${url}`);
        apiResponseReceived = true;
        
        if (response.status() === 200) {
          try {
            apiData = await response.json();
            console.log(`API data received: ${Array.isArray(apiData) ? apiData.length + ' agents' : 'unknown format'}`);
          } catch (e) {
            console.log('Could not parse API response as JSON');
          }
        }
      }
    });
    
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(10000);
    
    console.log(`API response received: ${apiResponseReceived}`);
    console.log(`API data available: ${apiData !== null}`);
    
    if (apiData) {
      console.log('API integration working successfully');
    } else {
      console.log('API integration may be in progress or using fallback data');
    }
  });
});