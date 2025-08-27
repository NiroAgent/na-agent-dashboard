import { test, expect } from '@playwright/test';

test.describe('Frontend UI Error Detection Tests', () => {
  const FRONTEND_URL = 'http://localhost:3002';
  const PYTHON_API = 'http://localhost:7778';
  const TYPESCRIPT_API = 'http://localhost:7779';

  test.beforeEach(async ({ page }) => {
    // Clear any existing storage
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('should detect console errors and network failures', async ({ page }) => {
    console.log('🔍 TESTING FRONTEND FOR ERRORS...');
    
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    const networkErrors: Array<{
      url: string;
      method: string;
      errorText: string;
      resourceType: string;
    }> = [];
    const failedRequests: string[] = [];
    const successfulRequests: string[] = [];

    // Track console messages
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        consoleErrors.push(text);
        console.log(`❌ CONSOLE ERROR: ${text}`);
      } else if (type === 'warning' || type === 'warn') {
        consoleWarnings.push(text);
        console.log(`⚠️  CONSOLE WARNING: ${text}`);
      }
    });

    // Track page errors (uncaught exceptions)
    page.on('pageerror', error => {
      consoleErrors.push(`Uncaught Exception: ${error.message}`);
      console.log(`❌ PAGE ERROR: ${error.message}`);
      console.log(`Stack: ${error.stack}`);
    });

    // Track network failures
    page.on('requestfailed', request => {
      const error = {
        url: request.url(),
        method: request.method(),
        errorText: request.failure()?.errorText || 'Unknown error',
        resourceType: request.resourceType()
      };
      
      networkErrors.push(error);
      failedRequests.push(`${request.method()} ${request.url()}`);
      console.log(`❌ NETWORK FAILURE: ${request.method()} ${request.url()} - ${error.errorText}`);
    });

    // Track successful requests
    page.on('response', response => {
      const status = response.status();
      const url = response.url();
      
      if (status >= 200 && status < 300) {
        successfulRequests.push(`${response.request().method()} ${url}`);
      } else if (status >= 400) {
        failedRequests.push(`HTTP ${status}: ${response.request().method()} ${url}`);
        console.log(`❌ HTTP ERROR: ${status} ${url}`);
      }
    });

    console.log(`🌐 Loading: ${FRONTEND_URL}`);

    // Navigate to the frontend
    try {
      await page.goto(FRONTEND_URL, { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
      console.log('✅ Page loaded successfully');
    } catch (error) {
      console.log(`❌ PAGE LOAD ERROR: ${error}`);
      throw error;
    }

    // Wait for React app to initialize
    await page.waitForSelector('#root', { timeout: 10000 });
    console.log('✅ React root container found');

    // Wait for potential async operations
    await page.waitForTimeout(3000);

    // Check for React error boundaries
    const errorBoundary = await page.$('.error-boundary, [data-testid="error-boundary"]');
    if (errorBoundary) {
      const errorText = await errorBoundary.textContent();
      consoleErrors.push(`React Error Boundary: ${errorText}`);
      console.log(`❌ REACT ERROR BOUNDARY: ${errorText}`);
    }

    // Verify basic page structure
    await expect(page).toHaveTitle(/Agent/);
    
    // Check for main dashboard elements
    const dashboardElements = await page.$$('[data-testid*="dashboard"], .dashboard, main, .MuiContainer-root');
    console.log(`📋 Found ${dashboardElements.length} dashboard elements`);
    
    // Check for agent-related elements
    const agentElements = await page.$$('[data-testid*="agent"], .agent-card, .agent-item, .MuiCard-root');
    console.log(`🤖 Found ${agentElements.length} agent UI elements`);

    // Try to interact with the interface
    try {
      // Look for refresh or reload buttons
      const refreshButton = await page.$('button[title*="refresh"], [data-testid="refresh"], .refresh-button');
      if (refreshButton) {
        console.log('🔄 Testing refresh button...');
        await refreshButton.click();
        await page.waitForTimeout(2000);
      }

      // Look for navigation elements
      const navElements = await page.$$('nav, [role="navigation"], .MuiAppBar-root');
      if (navElements.length > 0) {
        console.log(`🧭 Found ${navElements.length} navigation elements`);
      }
    } catch (interactionError) {
      console.log(`⚠️  Interaction error (non-critical): ${interactionError}`);
    }

    // Final error analysis
    console.log('\n📊 ERROR ANALYSIS RESULTS:');
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Console Warnings: ${consoleWarnings.length}`);
    console.log(`Network Errors: ${networkErrors.length}`);
    console.log(`Failed Requests: ${failedRequests.length}`);
    console.log(`Successful Requests: ${successfulRequests.length}`);

    // Log specific errors
    if (consoleErrors.length > 0) {
      console.log('\n❌ CONSOLE ERRORS:');
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    if (networkErrors.length > 0) {
      console.log('\n❌ NETWORK ERRORS:');
      networkErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.method} ${error.url} - ${error.errorText}`);
      });
    }

    // Filter critical vs non-critical errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') &&
      !error.includes('Chrome extension') &&
      !error.includes('Manifest') &&
      !error.toLowerCase().includes('non-critical')
    );

    const criticalNetworkErrors = networkErrors.filter(error =>
      error.url.includes('api/') || 
      error.url.includes(':777') ||
      error.resourceType === 'xhr' ||
      error.resourceType === 'fetch'
    );

    console.log(`\n🎯 CRITICAL ERROR COUNT:`);
    console.log(`Critical Console Errors: ${criticalErrors.length}`);
    console.log(`Critical Network Errors: ${criticalNetworkErrors.length}`);

    // Test assertions - fail if critical errors exist
    if (criticalErrors.length > 0) {
      console.log('\n🚨 CRITICAL CONSOLE ERRORS DETECTED - FAILING TEST');
      expect(criticalErrors.length).toBe(0);
    }

    if (criticalNetworkErrors.length > 0) {
      console.log('\n🚨 CRITICAL NETWORK ERRORS DETECTED - FAILING TEST');
      expect(criticalNetworkErrors.length).toBe(0);
    }

    console.log('\n✅ UI ERROR DETECTION TEST PASSED');
  });

  test('should verify API connectivity and data loading', async ({ page }) => {
    console.log('🔍 TESTING API CONNECTIVITY...');

    const apiRequests: Array<{
      url: string;
      status: number;
      success: boolean;
    }> = [];

    // Track API requests
    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      
      if (url.includes('api/') || url.includes(':777') || url.includes(':778')) {
        apiRequests.push({
          url,
          status,
          success: status >= 200 && status < 300
        });
        
        console.log(`📡 API REQUEST: ${status} ${url}`);
      }
    });

    await page.goto(FRONTEND_URL, { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });

    // Wait for potential API calls
    await page.waitForTimeout(5000);

    // Analyze API requests
    const successfulApiRequests = apiRequests.filter(req => req.success);
    const failedApiRequests = apiRequests.filter(req => !req.success);

    console.log(`\n📊 API REQUEST ANALYSIS:`);
    console.log(`Total API requests: ${apiRequests.length}`);
    console.log(`Successful: ${successfulApiRequests.length}`);
    console.log(`Failed: ${failedApiRequests.length}`);

    if (failedApiRequests.length > 0) {
      console.log('\n❌ FAILED API REQUESTS:');
      failedApiRequests.forEach((req, index) => {
        console.log(`${index + 1}. ${req.status} ${req.url}`);
      });
    }

    // Check for agent data in UI
    const agentDataElements = await page.$$('.agent-card, [data-testid*="agent"], .MuiCard-root');
    console.log(`🤖 Agent data elements found: ${agentDataElements.length}`);

    if (agentDataElements.length === 0) {
      // Look for loading indicators
      const loadingElements = await page.$$('[data-testid="loading"], .loading, .MuiCircularProgress-root');
      if (loadingElements.length > 0) {
        console.log('🔄 Loading state detected - data may still be fetching');
      } else {
        console.log('⚠️  No agent data or loading state found');
      }
    }

    // Expect at least the page to load properly
    await expect(page.locator('#root')).toBeVisible();
  });

  test('should test responsive design and UI elements', async ({ page }) => {
    console.log('🔍 TESTING RESPONSIVE DESIGN...');

    await page.goto(FRONTEND_URL, { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });

    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop Large' },
      { width: 1024, height: 768, name: 'Desktop Small' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];

    for (const viewport of viewports) {
      console.log(`📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);

      // Check if main content is visible
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      // Check if content overflows or is cut off
      const rootBox = await rootElement.boundingBox();
      if (rootBox) {
        console.log(`   Content dimensions: ${rootBox.width}x${rootBox.height}`);
        expect(rootBox.width).toBeGreaterThan(0);
        expect(rootBox.height).toBeGreaterThan(0);
      }
    }

    console.log('✅ Responsive design test completed');
  });

  test('should check for accessibility issues', async ({ page }) => {
    console.log('🔍 TESTING ACCESSIBILITY...');

    await page.goto(FRONTEND_URL, { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });

    // Check for basic accessibility elements
    const headingElements = await page.$$('h1, h2, h3, h4, h5, h6');
    console.log(`📝 Found ${headingElements.length} heading elements`);

    const buttonElements = await page.$$('button');
    console.log(`🔘 Found ${buttonElements.length} button elements`);

    const linkElements = await page.$$('a');
    console.log(`🔗 Found ${linkElements.length} link elements`);

    // Check for ARIA labels and roles
    const elementsWithAriaLabel = await page.$$('[aria-label]');
    console.log(`🏷️  Found ${elementsWithAriaLabel.length} elements with ARIA labels`);

    const elementsWithRole = await page.$$('[role]');
    console.log(`🎭 Found ${elementsWithRole.length} elements with roles`);

    // Basic accessibility check - at least some interactive elements should exist
    expect(headingElements.length + buttonElements.length).toBeGreaterThan(0);

    console.log('✅ Basic accessibility check completed');
  });
});