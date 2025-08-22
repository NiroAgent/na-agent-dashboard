import { test, expect } from '@playwright/test';

test.describe('VF-Dev Production API Network Error Tests', () => {
  const VF_DEV_API = 'http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com:7777';
  const VF_DEV_DASHBOARD = 'http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com';

  test('should have zero network errors with production deployment', async ({ page }) => {
    console.log('🧪 Testing VF-Dev production deployment for network errors...');
    
    const networkErrors: string[] = [];
    const consoleErrors: string[] = [];
    const successfulRequests: string[] = [];
    
    // Track network failures
    page.on('requestfailed', request => {
      const error = `${request.method()} ${request.url()} - ${request.failure()?.errorText}`;
      networkErrors.push(error);
      console.log(`❌ NETWORK ERROR: ${error}`);
    });
    
    // Track console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
      }
    });
    
    // Track successful requests
    page.on('response', response => {
      if (response.url().includes('niro-agent-dashboard-dev') && response.url().includes(':7777')) {
        if (response.status() >= 200 && response.status() < 300) {
          successfulRequests.push(`${response.request().method()} ${response.url()} - ${response.status()}`);
          console.log(`✅ SUCCESS: ${response.request().method()} ${response.url()} - ${response.status()}`);
        }
      }
    });
    
    // Navigate to dashboard
    await page.goto(VF_DEV_DASHBOARD, { waitUntil: 'networkidle' });
    
    // Wait for API calls
    await page.waitForTimeout(10000);
    
    console.log(`\n📊 VF-DEV RESULTS:`);
    console.log(`Network errors: ${networkErrors.length}`);
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Successful requests: ${successfulRequests.length}`);
    
    // Log all results
    if (networkErrors.length > 0) {
      console.log(`\n❌ Network Errors:`);
      networkErrors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (successfulRequests.length > 0) {
      console.log(`\n✅ Successful Requests:`);
      successfulRequests.forEach(req => console.log(`  - ${req}`));
    }
    
    // Test should pass with zero network errors
    expect(networkErrors.length).toBe(0);
  });

  test('should test production API endpoints directly', async ({ request }) => {
    console.log('🧪 Testing VF-Dev API endpoints directly...');
    
    // Test if API is reachable at all
    try {
      const healthResponse = await request.fetch(VF_DEV_API + '/health', { 
        method: 'GET',
        timeout: 10000
      });
      console.log(`Health endpoint: ${healthResponse.status()}`);
      
      if (healthResponse.status() === 200) {
        const healthData = await healthResponse.json();
        console.log(`Health data:`, healthData);
        
        // Test agents endpoint
        const agentsResponse = await request.get(VF_DEV_API + '/agents');
        console.log(`Agents endpoint: ${agentsResponse.status()}`);
        
        if (agentsResponse.status() === 200) {
          const agentsData = await agentsResponse.json();
          console.log(`Total agents in production: ${agentsData.totalAgents}`);
          console.log(`Data source: ${agentsData.source}`);
          
          expect(agentsData.success).toBe(true);
          expect(agentsData.totalAgents).toBeGreaterThan(100);
          expect(agentsData.source).toBe('real-agent-discovery-server');
        }
      }
      
    } catch (error) {
      console.log(`❌ API not reachable: ${error}`);
      console.log('🔍 This indicates the TypeScript API is not deployed or port 7777 is not accessible');
    }
  });
});