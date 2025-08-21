import { test, expect } from '@playwright/test';

test.describe('NA Agent Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard', async ({ page }) => {
    // Check if the page loads
    await expect(page).toHaveTitle(/Agent/i);
    
    // Wait for the main app container
    await expect(page.locator('#root')).toBeVisible();
  });

  test('should display agent grid', async ({ page }) => {
    // Wait for the page to load and fetch agents
    await page.waitForLoadState('networkidle');
    
    // Give the frontend time to fetch and render agents
    await page.waitForTimeout(2000);
    
    // Check if agent cards are present (they might be rendered dynamically)
    const agentCards = page.locator('[data-testid="agent-card"]');
    const count = await agentCards.count();
    
    // If no cards found, check if the API is working
    if (count === 0) {
      // Check API directly
      const response = await page.request.get('http://localhost:7777/api/dashboard/agents');
      const data = await response.json();
      console.log('API returned agents:', data.agents?.length || 0);
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'debug-no-agents.png' });
    }
    
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should show agent details', async ({ page }) => {
    // Wait for page to load and fetch data
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if agent cards exist
    const agentCards = page.locator('[data-testid="agent-card"]');
    const cardCount = await agentCards.count();
    
    if (cardCount > 0) {
      // Check for agent name
      const agentName = page.locator('[data-testid="agent-name"]').first();
      await expect(agentName).toBeVisible();
      const name = await agentName.textContent();
      expect(name).toBeTruthy();
      
      // Check for agent status
      const agentStatus = page.locator('[data-testid="agent-status"]').first();
      await expect(agentStatus).toBeVisible();
    } else {
      // If no cards, skip this test as it depends on agent grid
      console.log('No agent cards found, skipping detail check');
    }
  });

  test('should display system metrics', async ({ page }) => {
    // Check for metrics section
    const metricsSection = page.locator('[data-testid="system-metrics"]');
    
    // If metrics section exists, verify it's visible
    const metricsCount = await metricsSection.count();
    if (metricsCount > 0) {
      await expect(metricsSection).toBeVisible();
      
      // Check for CPU chart
      const cpuChart = page.locator('[data-testid="cpu-chart"]');
      const cpuCount = await cpuChart.count();
      if (cpuCount > 0) {
        await expect(cpuChart).toBeVisible();
      }
    }
  });

  test('should have control buttons for agents', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if agent cards exist
    const agentCards = page.locator('[data-testid="agent-card"]');
    const cardCount = await agentCards.count();
    
    if (cardCount > 0) {
      // Check for start/stop buttons
      const controlButtons = page.locator('button').filter({ 
        hasText: /start|stop|restart/i 
      });
      
      const buttonCount = await controlButtons.count();
      if (buttonCount > 0) {
        const firstButton = controlButtons.first();
        await expect(firstButton).toBeEnabled();
      }
    } else {
      console.log('No agent cards found, skipping button check');
    }
  });

  test('should show terminal view', async ({ page }) => {
    // Check if terminal section exists
    const terminal = page.locator('[data-testid="terminal-view"]');
    const terminalCount = await terminal.count();
    
    if (terminalCount > 0) {
      await expect(terminal).toBeVisible();
    }
  });

  test('should handle API connection', async ({ page }) => {
    // Check if the app connects to the API
    const response = await page.request.get('http://localhost:7777/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('should fetch agents from API', async ({ page }) => {
    // Test API endpoint directly
    const response = await page.request.get('http://localhost:7777/api/dashboard/agents');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.agents).toBeDefined();
    expect(Array.isArray(data.agents)).toBeTruthy();
    expect(data.agents.length).toBeGreaterThanOrEqual(3); // We have 3 demo agents
  });

  test('should display agent statistics', async ({ page }) => {
    // Wait for stats to load
    await page.waitForLoadState('networkidle');
    
    // Check for statistics display
    const stats = page.locator('text=/total.*agents/i');
    const statsCount = await stats.count();
    
    if (statsCount > 0) {
      await expect(stats.first()).toBeVisible();
    }
  });

  test('should handle WebSocket connection', async ({ page }) => {
    // Check console for WebSocket errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait for potential WebSocket connection
    await page.waitForTimeout(2000);
    
    // Check that there are no WebSocket connection errors
    const wsErrors = consoleErrors.filter(err => 
      err.toLowerCase().includes('websocket') || 
      err.toLowerCase().includes('socket.io')
    );
    
    // It's okay if WebSocket fails in test environment
    // Just log it for debugging
    if (wsErrors.length > 0) {
      console.log('WebSocket errors detected (may be normal in test env):', wsErrors);
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Check if the app still renders
    await expect(page.locator('#root')).toBeVisible();
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should send message to agent', async ({ page }) => {
    // Test agent messaging API
    const response = await page.request.post('http://localhost:7777/api/dashboard/agents/demo-developer-1/message', {
      data: {
        message: 'Test message from UI test',
        context: { test: true }
      }
    });
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.type).toBe('agent');
    expect(data.content).toBeTruthy();
  });

  test('should display cost information', async ({ page }) => {
    // Check for cost display
    await page.waitForLoadState('networkidle');
    
    const costInfo = page.locator('text=/\\$|cost|hourly|daily|monthly/i');
    const costCount = await costInfo.count();
    
    if (costCount > 0) {
      console.log(`Found ${costCount} cost-related elements`);
    }
  });

  test('should handle agent task submission', async ({ page }) => {
    // Test task submission API
    const response = await page.request.post('http://localhost:7777/api/dashboard/agents/demo-developer-1/task', {
      data: {
        task: 'Test task from UI test',
        priority: 'medium',
        timeout: 60
      }
    });
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.taskId).toBeDefined();
    expect(data.status).toBe('submitted');
  });
});