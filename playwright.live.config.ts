import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    // Use the live deployment URLs instead of localhost
    baseURL: 'http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Increase timeouts for live testing
    navigationTimeout: 30000,
    actionTimeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer configuration for live testing
  // The services are already deployed and running
});
