import { test, expect } from '@playwright/test';

test.describe('Deployed Dashboard Reality Check', () => {
  const DEPLOYED_URL = 'http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com/';
  const PRODUCTION_API_7777 = 'http://localhost:7778';
  const PRODUCTION_API_7778 = 'http://98.81.93.132:7778';

  test('verify deployed dashboard loads', async ({ page }) => {
    console.log('🌐 Testing deployed dashboard at:', DEPLOYED_URL);
    
    await page.goto(DEPLOYED_URL);
    await expect(page).toHaveTitle(/Agent Orchestrator Dashboard/);
    
    // Check if the page loads without errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Dashboard loaded successfully');
    if (errors.length > 0) {
      console.log('⚠️ Console errors found:', errors);
    }
  });

  test('check API endpoints accessibility', async ({ page }) => {
    console.log('🔍 Checking API endpoints...');
    
    // Test API 7777 (supposed to be mocked)
    try {
      const response7777 = await page.request.get(`${PRODUCTION_API_7777}/health`);
      console.log('📡 API 7777 status:', response7777.status());
      if (response7777.ok()) {
        const data = await response7777.json();
        console.log('📊 API 7777 health data:', data);
      }
    } catch (error) {
      console.log('❌ API 7777 not accessible:', error.message);
    }

    // Test API 7778 (supposed to be real agents)
    try {
      const response7778 = await page.request.get(`${PRODUCTION_API_7778}/health`);
      console.log('📡 API 7778 status:', response7778.status());
      if (response7778.ok()) {
        const data = await response7778.json();
        console.log('📊 API 7778 health data:', data);
      }
    } catch (error) {
      console.log('❌ API 7778 not accessible:', error.message);
    }
  });

  test('verify dashboard actually shows agent data', async ({ page }) => {
    console.log('🔍 Testing if dashboard shows real agent data...');
    
    await page.goto(DEPLOYED_URL);
    
    // Wait for the dashboard to load
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Check for loading states
    const loadingElements = page.locator('text=Loading');
    if (await loadingElements.count() > 0) {
      console.log('⏳ Found loading indicators, waiting for data...');
      await page.waitForTimeout(5000);
    }

    // Look for agent data indicators
    const agentCards = page.locator('[data-testid="agent-card"], .agent-card, .MuiCard-root');
    const agentCount = await agentCards.count();
    
    console.log(`📊 Found ${agentCount} agent cards`);

    if (agentCount > 0) {
      // Get the first agent's details
      const firstAgent = agentCards.first();
      const agentText = await firstAgent.textContent();
      console.log('🤖 First agent data:', agentText?.substring(0, 200));
      
      // Check if it shows real metrics or generic/error data
      if (agentText?.includes('Loading') || agentText?.includes('Error') || agentText?.includes('Failed to fetch')) {
        console.log('⚠️ Dashboard shows error/loading states');
      }
    }

    // Check for error messages
    const errorElements = page.locator('text=Error, text=Failed, text=Unable to connect');
    const errorCount = await errorElements.count();
    
    if (errorCount > 0) {
      console.log('❌ Found error messages on dashboard');
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorElements.nth(i).textContent();
        console.log(`   Error ${i + 1}: ${errorText}`);
      }
    }

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'deployed-dashboard-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved as deployed-dashboard-screenshot.png');
  });

  test('check network requests to verify API calls', async ({ page }) => {
    console.log('🔍 Monitoring network requests...');
    
    const apiCalls = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes(':777')) {
        apiCalls.push({
          url: request.url(),
          method: request.method()
        });
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/') || response.url().includes(':777')) {
        console.log(`📡 API Response: ${response.status()} - ${response.url()}`);
      }
    });

    await page.goto(DEPLOYED_URL);
    await page.waitForTimeout(10000); // Wait for all API calls to complete

    console.log('📊 API calls made by dashboard:');
    apiCalls.forEach((call, index) => {
      console.log(`  ${index + 1}. ${call.method} ${call.url}`);
    });

    if (apiCalls.length === 0) {
      console.log('⚠️ No API calls detected - dashboard may not be configured correctly');
    }
  });

  test('final reality check - what is actually working', async ({ page }) => {
    console.log('🎯 FINAL REALITY CHECK - What is actually deployed and working?');
    
    // 1. Dashboard accessibility
    try {
      await page.goto(DEPLOYED_URL);
      console.log('✅ Dashboard is accessible');
    } catch (error) {
      console.log('❌ Dashboard not accessible:', error.message);
      return;
    }

    // 2. API endpoints
    const endpoints = [
      { name: 'API 7777 Health', url: `${PRODUCTION_API_7777}/health` },
      { name: 'API 7777 Agents', url: `${PRODUCTION_API_7777}/agents` },
      { name: 'API 7778 Health', url: `${PRODUCTION_API_7778}/health` },
      { name: 'API 7778 Agents', url: `${PRODUCTION_API_7778}/api/agents` },
      { name: 'API 7778 Dashboard', url: `${PRODUCTION_API_7778}/api/dashboard/agents` }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await page.request.get(endpoint.url);
        if (response.ok()) {
          console.log(`✅ ${endpoint.name}: Working (${response.status()})`);
          if (endpoint.url.includes('/agents')) {
            const data = await response.json();
            if (Array.isArray(data)) {
              console.log(`   📊 Returns ${data.length} agents`);
            } else if (data.agents) {
              console.log(`   📊 Returns ${data.agents.length} agents`);
            }
          }
        } else {
          console.log(`⚠️ ${endpoint.name}: HTTP ${response.status()}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint.name}: Not accessible`);
      }
    }

    // 3. Dashboard functionality
    await page.waitForTimeout(5000);
    const pageContent = await page.textContent('body');
    
    if (pageContent.includes('Loading')) {
      console.log('⚠️ Dashboard stuck in loading state');
    }
    
    if (pageContent.includes('Error') || pageContent.includes('Failed')) {
      console.log('❌ Dashboard showing error messages');
    }

    const agentElements = page.locator('.agent-card, [data-testid="agent"], .MuiCard-root').first();
    const hasAgentData = await agentElements.count() > 0;
    
    console.log(`📊 Dashboard showing agent data: ${hasAgentData ? 'YES' : 'NO'}`);

    // 4. Final verdict
    console.log('\n🎯 FINAL VERDICT:');
    console.log('=================');
    console.log('Dashboard URL: ' + DEPLOYED_URL);
    console.log('Status: Accessible but needs verification of live data sources');
    console.log('Next steps: Need to verify if backend servers are actually running');
  });
});