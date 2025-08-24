import { test, expect } from '@playwright/test';

test.describe('Local TypeScript API Network Error Tests', () => {
  const LOCAL_API = 'http://localhost:7778';
  const LOCAL_DASHBOARD = 'http://localhost:3001';

  test('should have zero network errors with all HTTP methods', async ({ page }) => {
    console.log('🧪 Testing all HTTP methods for network errors...');
    
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
      if (response.url().includes('localhost:7778')) {
        if (response.status() >= 200 && response.status() < 300) {
          successfulRequests.push(`${response.request().method()} ${response.url()} - ${response.status()}`);
          console.log(`✅ SUCCESS: ${response.request().method()} ${response.url()} - ${response.status()}`);
        }
      }
    });
    
    // Navigate to dashboard
    await page.goto(LOCAL_DASHBOARD, { waitUntil: 'networkidle' });
    
    // Wait for API calls
    await page.waitForTimeout(5000);
    
    console.log(`\n📊 RESULTS:`);
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
    expect(successfulRequests.length).toBeGreaterThan(0);
  });

  test('should test all HTTP methods directly', async ({ request }) => {
    console.log('🧪 Testing HTTP methods directly...');
    
    // Test OPTIONS
    console.log('Testing OPTIONS...');
    const optionsResponse = await request.fetch(LOCAL_API + '/agents', { 
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:3001' }
    });
    console.log(`OPTIONS: ${optionsResponse.status()}`);
    expect([200, 204]).toContain(optionsResponse.status());
    
    // Test HEAD
    console.log('Testing HEAD...');
    const headResponse = await request.fetch(LOCAL_API + '/health', { 
      method: 'HEAD' 
    });
    console.log(`HEAD: ${headResponse.status()}`);
    expect(headResponse.status()).toBe(200);
    
    // Test GET
    console.log('Testing GET...');
    const getResponse = await request.get(LOCAL_API + '/agents');
    console.log(`GET: ${getResponse.status()}`);
    expect(getResponse.status()).toBe(200);
    
    const data = await getResponse.json();
    console.log(`Agents returned: ${data.totalAgents}`);
    expect(data.success).toBe(true);
    expect(data.totalAgents).toBeGreaterThan(100);
  });

  test('should verify real agent data (no mocks)', async ({ request }) => {
    console.log('🧪 Verifying real agent data...');
    
    const response = await request.get(LOCAL_API + '/agents');
    const data = await response.json();
    
    console.log(`Total agents: ${data.totalAgents}`);
    console.log(`First agent: ${data.agents[0]?.name}`);
    console.log(`Agent type: ${data.agents[0]?.type}`);
    
    // Verify it's real data, not mocks
    expect(data.success).toBe(true);
    expect(data.totalAgents).toBeGreaterThan(100);
    expect(data.agents[0].name).not.toMatch(/^Agent \d+$/); // Not "Agent 1", "Agent 2" etc
    expect(data.source).toBe('real-agent-discovery-server');
    
    console.log('✅ Confirmed: Real agent data, no mocks');
  });
});