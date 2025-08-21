import { test, expect } from '@playwright/test';

test.describe('NA Agent Dashboard - Live Deployment', () => {
  const DASHBOARD_URL = 'http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com';
  const API_URL = 'http://98.81.93.132:7777';

  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
  });

  test('should load the deployed dashboard', async ({ page }) => {
    // Check if the page loads
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/dashboard-load.png', fullPage: true });
    
    // Basic page load verification
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Verify URL
    expect(page.url()).toBe(DASHBOARD_URL);
  });

  test('should verify API is accessible', async ({ page }) => {
    // Test API endpoint directly
    const response = await page.request.get(`${API_URL}/api/agents`);
    expect(response.status()).toBe(200);
    
    const agents = await response.json();
    console.log(`API returned ${agents.length} agents`);
    expect(agents.length).toBeGreaterThan(0);
    
    // Verify agent data structure
    if (agents.length > 0) {
      const firstAgent = agents[0];
      expect(firstAgent).toHaveProperty('id');
      expect(firstAgent).toHaveProperty('name');
      expect(firstAgent).toHaveProperty('status');
      expect(firstAgent).toHaveProperty('cpuUsage');
      
      console.log('Sample agent data:', {
        id: firstAgent.id,
        name: firstAgent.name,
        status: firstAgent.status,
        cpuUsage: firstAgent.cpuUsage
      });
    }
  });

  test('should display agent data in dashboard', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Wait for dashboard to potentially load data
    await page.waitForTimeout(5000);
    
    // Take screenshot of loaded dashboard
    await page.screenshot({ path: 'test-results/dashboard-with-data.png', fullPage: true });
    
    // Get page content
    const bodyText = await page.textContent('body');
    console.log(`Dashboard content length: ${bodyText?.length} characters`);
    
    // Look for agent-related content
    const hasAgentContent = bodyText?.toLowerCase().includes('agent');
    console.log(`Contains 'agent' text: ${hasAgentContent}`);
    
    // Basic verification
    expect(bodyText?.length).toBeGreaterThan(100);
  });

  test('should handle dashboard interactions', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Look for interactive elements
    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    const inputs = await page.locator('input').count();
    
    console.log(`Found elements - Buttons: ${buttons}, Links: ${links}, Inputs: ${inputs}`);
    
    // Take screenshot of interactive elements
    await page.screenshot({ path: 'test-results/dashboard-interactions.png', fullPage: true });
    
    // Test basic interactions if elements exist
    if (buttons > 0) {
      const firstButton = page.locator('button').first();
      const isEnabled = await firstButton.isEnabled();
      console.log(`First button enabled: ${isEnabled}`);
    }
  });

  test('should verify agent status updates', async ({ page }) => {
    // First API call
    const response1 = await page.request.get(`${API_URL}/api/agents`);
    const agents1 = await response1.json();
    
    console.log('First API call - agents with status:');
    agents1.slice(0, 3).forEach((agent: any) => {
      console.log(`${agent.id}: ${agent.status} (CPU: ${agent.cpuUsage}%)`);
    });
    
    // Wait for agent updates (our mock agents update every 15s)
    await page.waitForTimeout(5000);
    
    // Second API call
    const response2 = await page.request.get(`${API_URL}/api/agents`);
    const agents2 = await response2.json();
    
    console.log('Second API call - agents with status:');
    agents2.slice(0, 3).forEach((agent: any) => {
      console.log(`${agent.id}: ${agent.status} (CPU: ${agent.cpuUsage}%)`);
    });
    
    // Verify API is still working
    expect(agents2.length).toBe(agents1.length);
    expect(agents2.length).toBeGreaterThan(0);
  });

  test('should test CORS and cross-origin requests', async ({ page }) => {
    // Navigate to dashboard
    await page.goto(DASHBOARD_URL);
    
    // Check browser console for CORS errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Wait for page to potentially make API calls
    await page.waitForTimeout(3000);
    
    // Look for CORS-related errors
    const corsErrors = consoleMessages.filter(msg => 
      msg.toLowerCase().includes('cors') || 
      msg.toLowerCase().includes('origin') ||
      msg.toLowerCase().includes('blocked')
    );
    
    console.log('Console messages:', consoleMessages.slice(-5)); // Last 5 messages
    
    if (corsErrors.length > 0) {
      console.log('CORS errors detected:', corsErrors);
    }
    
    // CORS should not block our requests since we enabled it in the API
    expect(corsErrors.length).toBe(0);
  });

  test('should verify dashboard performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`Dashboard load time: ${loadTime}ms`);
    
    // Dashboard should load within reasonable time
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
    
    // Test API response time
    const apiStartTime = Date.now();
    const response = await page.request.get(`${API_URL}/api/agents`);
    const apiResponseTime = Date.now() - apiStartTime;
    
    console.log(`API response time: ${apiResponseTime}ms`);
    expect(response.status()).toBe(200);
    expect(apiResponseTime).toBeLessThan(5000); // 5 seconds max
  });

  test('should verify mobile responsiveness', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    
    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Take tablet screenshot
    await page.screenshot({ path: 'test-results/dashboard-tablet.png', fullPage: true });
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Basic verification that page loads in all viewports
    const bodyText = await page.textContent('body');
    expect(bodyText?.length).toBeGreaterThan(50);
  });
});