#!/usr/bin/env node

/**
 * Frontend Automation Test Suite
 * Checks for errors, console warnings, API connectivity, and UI functionality
 * Uses Puppeteer to run browser-based tests
 */

const puppeteer = require('puppeteer');
const axios = require('axios');

const config = {
  frontendUrl: 'http://localhost:3002',
  apiUrls: {
    typescript: 'http://localhost:7779',
    python: 'http://localhost:7778'
  },
  timeout: 10000
};

class FrontendAutomationTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.errors = [];
    this.warnings = [];
    this.testResults = {
      passed: 0,
      failed: 0,
      details: []
    };
  }

  async setup() {
    console.log('🚀 Starting Frontend Automation Tests...\n');
    
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      this.page = await this.browser.newPage();
      
      // Capture console errors and warnings
      this.page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        
        if (type === 'error') {
          this.errors.push({
            type: 'console.error',
            message: text,
            timestamp: new Date().toISOString()
          });
        } else if (type === 'warning' || type === 'warn') {
          this.warnings.push({
            type: 'console.warning',
            message: text,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Capture network failures
      this.page.on('requestfailed', request => {
        this.errors.push({
          type: 'network.failed',
          message: `Failed to load: ${request.url()} - ${request.failure().errorText}`,
          timestamp: new Date().toISOString()
        });
      });

      // Capture unhandled promise rejections
      this.page.on('pageerror', error => {
        this.errors.push({
          type: 'page.error',
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      });

    } catch (error) {
      throw new Error(`Failed to setup browser: ${error.message}`);
    }
  }

  async runTest(testName, testFunction) {
    console.log(`Testing ${testName}...`);
    try {
      await testFunction();
      this.testResults.passed++;
      this.testResults.details.push({ test: testName, status: 'PASS', message: 'Test completed successfully' });
      console.log(`✅ ${testName} - PASSED\n`);
      return true;
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({ test: testName, status: 'FAIL', message: error.message });
      console.log(`❌ ${testName} - FAILED: ${error.message}\n`);
      return false;
    }
  }

  async testApiConnectivity() {
    const results = [];
    
    // Test TypeScript API
    try {
      const tsResponse = await axios.get(`${config.apiUrls.typescript}/health`, { timeout: 5000 });
      if (tsResponse.status === 200) {
        results.push('✅ TypeScript API (7779) - Connected');
      }
    } catch (error) {
      results.push(`❌ TypeScript API (7779) - ${error.message}`);
      throw new Error('TypeScript API connectivity failed');
    }

    // Test Python API  
    try {
      const pyResponse = await axios.get(`${config.apiUrls.python}/health`, { timeout: 5000 });
      if (pyResponse.status === 200) {
        results.push('✅ Python API (7778) - Connected');
      }
    } catch (error) {
      results.push(`❌ Python API (7778) - ${error.message}`);
      throw new Error('Python API connectivity failed');
    }

    console.log(results.join('\n'));
  }

  async testFrontendLoading() {
    await this.page.goto(config.frontendUrl, { 
      waitUntil: 'networkidle2',
      timeout: config.timeout 
    });

    // Wait for React app to initialize
    await this.page.waitForSelector('#root', { timeout: 5000 });
    
    // Check if main dashboard elements are present
    const title = await this.page.$eval('title', el => el.textContent);
    if (!title || !title.includes('Agent')) {
      throw new Error(`Page title not found or incorrect. Got: ${title}`);
    }

    // Check for React error boundaries
    const reactError = await this.page.$('.error-boundary, [data-testid="error-boundary"]');
    if (reactError) {
      const errorText = await reactError.textContent();
      throw new Error(`React error boundary triggered: ${errorText}`);
    }

    console.log('📄 Page loaded successfully');
    console.log(`🔖 Title: ${title}`);
  }

  async testDashboardElements() {
    // Wait for main dashboard components
    await this.page.waitForSelector('[data-testid="dashboard"], .dashboard, main', { timeout: 5000 });

    // Check for agent list or grid
    const agentElements = await this.page.$$('[data-testid*="agent"], .agent-card, .agent-item, .MuiCard-root');
    console.log(`🤖 Found ${agentElements.length} agent UI elements`);

    if (agentElements.length === 0) {
      console.log('⚠️  No agent UI elements found - checking for loading state');
      
      const loadingElements = await this.page.$$('[data-testid="loading"], .loading, .MuiCircularProgress-root');
      if (loadingElements.length === 0) {
        throw new Error('No agent elements found and no loading state visible');
      }
      console.log('🔄 Loading state detected - agents may still be fetching');
    }

    // Check for navigation elements
    const navElements = await this.page.$$('nav, [role="navigation"], .navigation, .MuiAppBar-root');
    console.log(`🧭 Found ${navElements.length} navigation elements`);
  }

  async testDataFetching() {
    console.log('📡 Testing API data fetching...');
    
    // Wait for potential network requests to complete
    await this.page.waitForTimeout(3000);

    // Check network tab for successful API calls
    const responses = [];
    
    this.page.on('response', response => {
      const url = response.url();
      if (url.includes('api/') || url.includes(':777') || url.includes(':778')) {
        responses.push({
          url,
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Trigger data refresh if possible
    try {
      const refreshButton = await this.page.$('[data-testid="refresh"], button[title*="refresh"], .refresh-button');
      if (refreshButton) {
        await refreshButton.click();
        await this.page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('🔄 No refresh button found - skipping manual refresh');
    }

    console.log(`📊 Network responses captured: ${responses.length}`);
    responses.forEach(resp => {
      console.log(`   ${resp.status} ${resp.url.slice(-50)}`);
    });
  }

  async testConsoleErrors() {
    if (this.errors.length > 0) {
      console.log(`🚨 Found ${this.errors.length} console errors:`);
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. [${error.type}] ${error.message}`);
        if (error.stack) {
          console.log(`      Stack: ${error.stack.slice(0, 100)}...`);
        }
      });
      
      // Filter out non-critical errors
      const criticalErrors = this.errors.filter(error => 
        !error.message.includes('favicon') &&
        !error.message.includes('Chrome extension') &&
        !error.message.includes('Manifest') &&
        !error.type.includes('network.failed') || error.message.includes('api/')
      );

      if (criticalErrors.length > 0) {
        throw new Error(`Found ${criticalErrors.length} critical frontend errors`);
      }
    } else {
      console.log('✅ No console errors detected');
    }

    if (this.warnings.length > 0) {
      console.log(`⚠️  Found ${this.warnings.length} console warnings (non-critical)`);
      this.warnings.slice(0, 3).forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning.message.slice(0, 80)}...`);
      });
    }
  }

  async testResponsiveness() {
    console.log('📱 Testing responsive design...');
    
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 1024, height: 768, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];

    for (const viewport of viewports) {
      await this.page.setViewport(viewport);
      await this.page.waitForTimeout(1000);
      
      // Check if content is still visible
      const contentVisible = await this.page.$eval('body', el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      if (!contentVisible) {
        throw new Error(`Content not visible at ${viewport.name} resolution`);
      }
      
      console.log(`   ✅ ${viewport.name} (${viewport.width}x${viewport.height})`);
    }

    // Reset to default viewport
    await this.page.setViewport({ width: 1200, height: 800 });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.setup();

      // Run all tests
      await this.runTest('API Connectivity', () => this.testApiConnectivity());
      await this.runTest('Frontend Loading', () => this.testFrontendLoading());
      await this.runTest('Dashboard Elements', () => this.testDashboardElements());
      await this.runTest('Data Fetching', () => this.testDataFetching());
      await this.runTest('Console Errors', () => this.testConsoleErrors());
      await this.runTest('Responsive Design', () => this.testResponsiveness());

      // Print summary
      console.log('\n' + '='.repeat(60));
      console.log('FRONTEND AUTOMATION TEST SUMMARY');
      console.log('='.repeat(60));
      console.log(`✅ Tests Passed: ${this.testResults.passed}`);
      console.log(`❌ Tests Failed: ${this.testResults.failed}`);
      console.log(`🚨 Console Errors: ${this.errors.length}`);
      console.log(`⚠️  Console Warnings: ${this.warnings.length}`);
      
      if (this.testResults.failed === 0 && this.errors.length === 0) {
        console.log('\n🎉 ALL TESTS PASSED - Frontend is healthy!');
        return true;
      } else {
        console.log('\n⚠️  ISSUES DETECTED - Review failed tests and errors');
        return false;
      }

    } catch (error) {
      console.error('💥 Test runner failed:', error.message);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new FrontendAutomationTester();
  tester.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = FrontendAutomationTester;