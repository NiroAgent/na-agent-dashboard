import { test, expect } from '@playwright/test';

test.describe('EC2 Production TypeScript API Tests', () => {
  const EC2_API = 'http://localhost:7778';
  const VF_DEV_DASHBOARD = 'http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com';

  test('should verify TypeScript API is running (not Python)', async ({ request }) => {
    console.log('🧪 Testing EC2 production API directly...');
    
    try {
      // Test health endpoint
      const healthResponse = await request.fetch(EC2_API + '/health', { 
        method: 'GET',
        timeout: 10000
      });
      console.log(`Health endpoint: ${healthResponse.status()}`);
      
      // Check server type
      const serverHeader = healthResponse.headers()['server'] || 'No server header';
      console.log(`Server: ${serverHeader}`);
      
      if (serverHeader.includes('Python')) {
        console.log('❌ ERROR: Still running Python server instead of TypeScript!');
        console.log('🔍 This means the GitHub Actions deployment has not completed successfully yet.');
        throw new Error('Python server still running - deployment incomplete');
      }
      
      if (healthResponse.status() === 200) {
        console.log('✅ Health endpoint working');
        
        // Test OPTIONS method (Python returns 501, TypeScript should work)
        console.log('Testing OPTIONS method...');
        const optionsResponse = await request.fetch(EC2_API + '/agents', { 
          method: 'OPTIONS',
          headers: { 'Origin': 'http://localhost:3001' }
        });
        console.log(`OPTIONS: ${optionsResponse.status()}`);
        
        if (optionsResponse.status() === 501) {
          throw new Error('OPTIONS returns 501 - Python server still running');
        }
        
        expect([200, 204]).toContain(optionsResponse.status());
        
        // Test agents endpoint for real data
        console.log('Testing agents endpoint...');
        const agentsResponse = await request.get(EC2_API + '/agents');
        console.log(`Agents endpoint: ${agentsResponse.status()}`);
        
        if (agentsResponse.status() === 200) {
          const agentsData = await agentsResponse.json();
          console.log(`Total agents: ${agentsData.totalAgents || 'unknown'}`);
          console.log(`Data source: ${agentsData.source || 'unknown'}`);
          
          if (agentsData.success && agentsData.source === 'real-agent-discovery-server') {
            console.log('✅ TypeScript API with real agent data confirmed!');
            expect(agentsData.totalAgents).toBeGreaterThan(100);
          } else {
            throw new Error(`Not real agent data. Response: ${JSON.stringify(agentsData).substring(0, 200)}`);
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ API issue: ${error}`);
      throw error;
    }
  });

  test('should have zero network errors with TypeScript API', async ({ page }) => {
    console.log('🧪 Testing dashboard with TypeScript API for network errors...');
    
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
    
    // Track successful requests to our API
    page.on('response', response => {
      if (response.url().includes('98.81.93.132:7777')) {
        if (response.status() >= 200 && response.status() < 300) {
          successfulRequests.push(`${response.request().method()} ${response.url()} - ${response.status()}`);
          console.log(`✅ SUCCESS: ${response.request().method()} ${response.url()} - ${response.status()}`);
        } else {
          console.log(`⚠️  NON-2XX: ${response.request().method()} ${response.url()} - ${response.status()}`);
        }
      }
    });
    
    // Navigate to dashboard
    try {
      await page.goto(VF_DEV_DASHBOARD, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Wait for API calls
      await page.waitForTimeout(10000);
      
      console.log(`\n📊 FINAL RESULTS:`);
      console.log(`Network errors: ${networkErrors.length}`);
      console.log(`Console errors: ${consoleErrors.length}`);
      console.log(`Successful API requests: ${successfulRequests.length}`);
      
      // Log all results
      if (networkErrors.length > 0) {
        console.log(`\n❌ Network Errors:`);
        networkErrors.forEach(error => console.log(`  - ${error}`));
      }
      
      if (successfulRequests.length > 0) {
        console.log(`\n✅ Successful API Requests:`);
        successfulRequests.forEach(req => console.log(`  - ${req}`));
      }
      
      // Test should pass with zero network errors
      expect(networkErrors.length).toBe(0);
      
      if (successfulRequests.length === 0) {
        console.log('⚠️  No API requests detected - may still be using old build');
      }
      
    } catch (error) {
      console.log(`Dashboard loading error: ${error}`);
      throw error;
    }
  });
});