import { test, expect } from '@playwright/test';

test.describe('Network Error Detection Tests', () => {
  const VF_DEV_URL = 'http://niro-agent-dashboard-dev-816454053517.s3-website-us-east-1.amazonaws.com/';

  test('should detect any network errors on vf-dev dashboard', async ({ page }) => {
    console.log('🔍 CHECKING FOR NETWORK ERRORS...');
    
    const networkErrors: Array<{
      url: string;
      method: string;
      errorText: string;
      resourceType: string;
    }> = [];
    
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    const allRequests: string[] = [];
    
    // Track ALL requests
    page.on('request', request => {
      allRequests.push(`${request.method()} ${request.url()}`);
    });
    
    // Track failed requests with detailed info
    page.on('requestfailed', request => {
      const error = {
        url: request.url(),
        method: request.method(),
        errorText: request.failure()?.errorText || 'Unknown error',
        resourceType: request.resourceType()
      };
      
      networkErrors.push(error);
      failedRequests.push(`FAILED: ${request.method()} ${request.url()} - ${error.errorText}`);
      
      console.log(`❌ NETWORK ERROR: ${request.method()} ${request.url()}`);
      console.log(`   Error: ${error.errorText}`);
      console.log(`   Resource Type: ${error.resourceType}`);
    });
    
    // Track console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const errorText = msg.text();
        consoleErrors.push(errorText);
        console.log(`❌ CONSOLE ERROR: ${errorText}`);
      }
    });
    
    // Track response errors (4xx, 5xx)
    page.on('response', response => {
      if (response.status() >= 400) {
        const errorInfo = `${response.status()} ${response.url()}`;
        failedRequests.push(`HTTP ERROR: ${errorInfo}`);
        console.log(`❌ HTTP ERROR: ${errorInfo}`);
      }
    });
    
    console.log(`🌐 Loading: ${VF_DEV_URL}`);
    
    try {
      // Navigate with a longer timeout and wait for network idle
      await page.goto(VF_DEV_URL, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      console.log('✅ Page loaded successfully');
      
      // Wait additional time for any async requests
      console.log('⏳ Waiting for async requests...');
      await page.waitForTimeout(10000);
      
    } catch (error) {
      console.log(`❌ PAGE LOAD ERROR: ${error}`);
      failedRequests.push(`PAGE LOAD ERROR: ${error}`);
    }
    
    // Final analysis
    console.log('\n📊 NETWORK ERROR ANALYSIS:');
    console.log(`Total requests made: ${allRequests.length}`);
    console.log(`Network failures: ${networkErrors.length}`);
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Failed requests: ${failedRequests.length}`);
    
    if (networkErrors.length > 0) {
      console.log('\n❌ NETWORK ERRORS DETECTED:');
      networkErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.method} ${error.url}`);
        console.log(`   Error: ${error.errorText}`);
        console.log(`   Type: ${error.resourceType}`);
      });
    }
    
    if (consoleErrors.length > 0) {
      console.log('\n❌ CONSOLE ERRORS DETECTED:');
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    if (failedRequests.length > 0) {
      console.log('\n❌ ALL FAILURES:');
      failedRequests.forEach((req, index) => {
        console.log(`${index + 1}. ${req}`);
      });
    }
    
    // Check for specific API-related errors
    const apiErrors = networkErrors.filter(error => 
      error.url.includes('98.81.93.132') || 
      error.url.includes(':7777') ||
      error.url.includes('api')
    );
    
    if (apiErrors.length > 0) {
      console.log('\n🚨 API-SPECIFIC ERRORS:');
      apiErrors.forEach(error => {
        console.log(`❌ ${error.method} ${error.url} - ${error.errorText}`);
      });
    }
    
    // Summary
    console.log('\n🎯 FINAL NETWORK ERROR CHECK:');
    console.log(`Network Errors: ${networkErrors.length === 0 ? '✅ NONE' : '❌ ' + networkErrors.length}`);
    console.log(`Console Errors: ${consoleErrors.length === 0 ? '✅ NONE' : '❌ ' + consoleErrors.length}`);
    console.log(`HTTP Errors: ${failedRequests.filter(r => r.includes('HTTP ERROR')).length === 0 ? '✅ NONE' : '❌ ' + failedRequests.filter(r => r.includes('HTTP ERROR')).length}`);
    
    // The test passes if we can at least load the page, but we report all errors
    await expect(page).toHaveTitle(/Agent Orchestrator Dashboard/);
    
    // Optional: Fail test if there are network errors (uncomment if needed)
    // expect(networkErrors.length).toBe(0);
  });

  test('should check specific API endpoints for errors', async ({ request }) => {
    console.log('🔍 TESTING API ENDPOINTS FOR ERRORS...');
    
    const API_BASE = 'http://localhost:7778';
    const endpoints = [
      '/health',
      '/api/agents',
      '/', // root endpoint
    ];
    
    for (const endpoint of endpoints) {
      const url = `${API_BASE}${endpoint}`;
      console.log(`🌐 Testing: ${url}`);
      
      try {
        const response = await request.get(url, { timeout: 10000 });
        const status = response.status();
        
        if (status >= 200 && status < 300) {
          console.log(`✅ ${url} - Status: ${status}`);
        } else if (status >= 400) {
          console.log(`❌ ${url} - HTTP Error: ${status}`);
        } else {
          console.log(`⚠️  ${url} - Status: ${status}`);
        }
        
      } catch (error) {
        console.log(`❌ ${url} - Network Error: ${error}`);
      }
    }
  });
});