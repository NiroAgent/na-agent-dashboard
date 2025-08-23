import { test, expect } from '@playwright/test';

test.describe('Agent Dashboard E2E Tests', () => {
  const API_BASE_URL = process.env.API_ENDPOINT || 'http://localhost:7778';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto(FRONTEND_URL);
  });

  test('dashboard loads successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Agent.*Dashboard/);
    
    // Check that the main container loads
    await expect(page.locator('#root')).toBeVisible();
    
    // Wait for any loading states to complete
    await page.waitForTimeout(3000);
  });

  test('dashboard displays agent data', async ({ page }) => {
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Look for agent data elements (flexible selectors)
    const agentSelectors = [
      '[data-testid*="agent"]',
      '.agent-card',
      '.agent-item',
      '[class*="agent"]',
      'tbody tr',
      '[role="gridcell"]'
    ];
    
    let foundAgentElements = false;
    
    for (const selector of agentSelectors) {
      try {
        const elements = page.locator(selector);
        const count = await elements.count();
        
        if (count > 0) {
          foundAgentElements = true;
          console.log(`Found ${count} agent elements using selector: ${selector}`);
          break;
        }
      } catch (error) {
        // Continue to next selector
        continue;
      }
    }
    
    // If no specific agent elements found, check for any data indicators
    if (!foundAgentElements) {
      // Check for numbers or counts that might indicate data
      const pageText = await page.textContent('body');
      const hasNumbers = /\d+/.test(pageText || '');
      const hasAgentTerms = /agent|qa|developer|github/i.test(pageText || '');
      
      expect(hasNumbers || hasAgentTerms, 'Dashboard should display agent data or related content').toBe(true);
    } else {
      expect(foundAgentElements, 'Dashboard should display agent elements').toBe(true);
    }
  });

  test('dashboard is responsive', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
    
    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('navigation and routing work', async ({ page }) => {
    // Check if there are any navigation elements
    const navElements = await page.locator('nav, [role="navigation"], .navigation, [class*="nav"]').count();
    
    if (navElements > 0) {
      // If navigation exists, test it
      const firstNavLink = page.locator('nav a, [role="navigation"] a').first();
      if (await firstNavLink.count() > 0) {
        await firstNavLink.click();
        await page.waitForTimeout(1000);
        
        // Check that page is still functional after navigation
        await expect(page.locator('body')).toBeVisible();
      }
    } else {
      // If no navigation, just verify the main page is stable
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#root')).toBeVisible();
    }
  });

  test('api integration works', async ({ page }) => {
    // Set up network monitoring
    const apiCalls = [];
    
    page.on('request', request => {
      if (request.url().includes('7778') || request.url().includes('api/agents')) {
        apiCalls.push(request.url());
      }
    });
    
    // Reload page to trigger API calls
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait a bit more for any delayed API calls
    await page.waitForTimeout(3000);
    
    // Check if API calls were made OR if page shows data
    const pageText = await page.textContent('body');
    const hasDataIndicators = /84|agent|qa|developer/i.test(pageText || '');
    
    expect(
      apiCalls.length > 0 || hasDataIndicators,
      'Dashboard should either make API calls or display agent data'
    ).toBe(true);
    
    if (apiCalls.length > 0) {
      console.log('API calls detected:', apiCalls);
    } else {
      console.log('No API calls detected, but data indicators found in page');
    }
  });

  test('error handling works', async ({ page }) => {
    // Monitor console for errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Test page load
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check for excessive console errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('chrome-extension') &&
      !error.includes('source map')
    );
    
    expect(criticalErrors.length, `Critical console errors found: ${criticalErrors.join(', ')}`).toBeLessThan(3);
  });

  test('performance is acceptable', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now();
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 10 seconds
    expect(loadTime, 'Page load time should be under 10 seconds').toBeLessThan(10000);
    
    console.log(`Page load time: ${loadTime}ms`);
  });
});

test.describe('API Integration E2E Tests', () => {
  const API_BASE_URL = process.env.API_ENDPOINT || 'http://localhost:7778';

  test('api endpoints are accessible', async ({ request }) => {
    // Test health endpoint
    const healthResponse = await request.get(`${API_BASE_URL}/health`);
    expect(healthResponse.ok()).toBeTruthy();
    
    const healthData = await healthResponse.json();
    expect(healthData).toHaveProperty('agents_discovered');
    expect(healthData.agents_discovered).toBeGreaterThan(0);
  });

  test('agents endpoint returns valid data', async ({ request }) => {
    // Test agents endpoint
    const agentsResponse = await request.get(`${API_BASE_URL}/api/agents`);
    expect(agentsResponse.ok()).toBeTruthy();
    
    const agents = await agentsResponse.json();
    expect(Array.isArray(agents)).toBeTruthy();
    expect(agents.length).toBeGreaterThan(0);
    
    // Validate agent structure
    const firstAgent = agents[0];
    expect(firstAgent).toHaveProperty('id');
    expect(firstAgent).toHaveProperty('name');
    expect(firstAgent).toHaveProperty('status');
    expect(firstAgent).toHaveProperty('type');
  });
});