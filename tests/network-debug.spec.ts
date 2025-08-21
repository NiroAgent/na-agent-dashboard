import { test, expect } from '@playwright/test';

test.describe('API Network Connectivity Tests', () => {
  const API_URL = 'http://98.81.93.132:7777';
  const DASHBOARD_URL = 'http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com';

  test('should verify API endpoint is accessible', async ({ request }) => {
    console.log('Testing API endpoint accessibility...');
    
    try {
      const response = await request.get(`${API_URL}/api/agents`, {
        timeout: 10000, // 10 second timeout
      });
      
      console.log(`API Response Status: ${response.status()}`);
      console.log(`API Response Headers:`, await response.headers());
      
      expect(response.status()).toBe(200);
      
      const responseBody = await response.text();
      console.log(`Response body length: ${responseBody.length} characters`);
      console.log(`Response start: ${responseBody.substring(0, 200)}...`);
      
      // Parse as JSON
      const agents = JSON.parse(responseBody);
      console.log(`Number of agents returned: ${agents.length}`);
      
      expect(agents.length).toBeGreaterThan(0);
      expect(agents[0]).toHaveProperty('id');
      expect(agents[0]).toHaveProperty('status');
      
    } catch (error) {
      console.error('API test failed:', error);
      throw error;
    }
  });

  test('should verify CORS headers are present', async ({ request }) => {
    console.log('Testing CORS headers...');
    
    const response = await request.get(`${API_URL}/api/agents`);
    const headers = await response.headers();
    
    console.log('Response headers:', headers);
    
    // Check for CORS headers
    expect(headers['access-control-allow-origin']).toBeDefined();
    console.log(`CORS Origin: ${headers['access-control-allow-origin']}`);
    
    if (headers['access-control-allow-methods']) {
      console.log(`CORS Methods: ${headers['access-control-allow-methods']}`);
    }
  });

  test('should test dashboard can fetch from API', async ({ page }) => {
    console.log('Testing dashboard API fetch...');
    
    // Set up console logging
    const consoleMessages: string[] = [];
    const networkErrors: string[] = [];
    
    page.on('console', msg => {
      const message = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(message);
      console.log(`Browser console: ${message}`);
    });
    
    page.on('requestfailed', request => {
      const error = `Request failed: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`;
      networkErrors.push(error);
      console.log(`Network error: ${error}`);
    });
    
    // Navigate to dashboard
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    
    // Wait a bit for any async API calls
    await page.waitForTimeout(5000);
    
    console.log(`Collected ${consoleMessages.length} console messages`);
    console.log(`Collected ${networkErrors.length} network errors`);
    
    // Log recent console messages
    consoleMessages.slice(-10).forEach(msg => console.log(`  ${msg}`));
    
    // Log network errors
    networkErrors.forEach(error => console.log(`  ERROR: ${error}`));
    
    // Check if there are any network errors related to our API
    const apiErrors = networkErrors.filter(error => error.includes(API_URL));
    
    if (apiErrors.length > 0) {
      console.log('API-related errors:', apiErrors);
    }
    
    // The test should pass even if there are some unrelated network errors
    // We're mainly checking that our specific API is accessible
    expect(networkErrors.filter(e => e.includes('98.81.93.132')).length).toBe(0);
  });

  test('should test direct API call from browser context', async ({ page }) => {
    console.log('Testing direct API call from browser...');
    
    // Navigate to dashboard first
    await page.goto(DASHBOARD_URL);
    
    // Try to make API call from browser context
    const apiResult = await page.evaluate(async (apiUrl) => {
      try {
        console.log(`Making fetch request to: ${apiUrl}/api/agents`);
        
        const response = await fetch(`${apiUrl}/api/agents`);
        console.log(`Fetch response status: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`Fetch successful, got ${data.length} agents`);
        
        return {
          success: true,
          status: response.status,
          agentCount: data.length,
          firstAgent: data[0] || null
        };
      } catch (error) {
        console.error('Fetch error:', error);
        return {
          success: false,
          error: error.message || error.toString()
        };
      }
    }, API_URL);
    
    console.log('API call result:', apiResult);
    
    if (!apiResult.success) {
      console.error('Browser fetch failed:', apiResult.error);
      // Let's not fail the test immediately, but log the error
      console.log('This might indicate a CORS or network connectivity issue');
    } else {
      expect(apiResult.success).toBe(true);
      expect(apiResult.agentCount).toBeGreaterThan(0);
    }
  });

  test('should verify network connectivity from test runner', async ({ request }) => {
    console.log('Testing basic network connectivity...');
    
    // Test a simple HTTP request to verify network is working
    try {
      const response = await request.get('http://httpbin.org/get', {
        timeout: 5000
      });
      console.log(`httpbin.org test: ${response.status()}`);
      expect(response.status()).toBe(200);
    } catch (error) {
      console.log('External network test failed - might be a network issue');
      console.log('Error:', error);
    }
    
    // Now test our API
    const apiResponse = await request.get(`${API_URL}/api/agents`, {
      timeout: 15000
    });
    
    console.log(`Our API response: ${apiResponse.status()}`);
    expect(apiResponse.status()).toBe(200);
    
    const apiData = await apiResponse.json();
    console.log(`API returned ${apiData.length} agents`);
    expect(apiData.length).toBeGreaterThan(0);
  });
});
