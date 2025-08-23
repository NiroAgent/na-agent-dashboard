import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 20 },    // Stay at 20 users
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.05'],   // Error rate must be below 5%
    errors: ['rate<0.1'],             // Custom error rate below 10%
  },
};

// Base URL from environment or default
const BASE_URL = __ENV.API_ENDPOINT || 'http://localhost:7778';

export default function () {
  // Test health endpoint
  let healthResponse = http.get(`${BASE_URL}/health`);
  
  let healthCheck = check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
    'health has agent count': (r) => JSON.parse(r.body).agents_discovered > 0,
    'health response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!healthCheck);
  
  sleep(1);
  
  // Test agents endpoint
  let agentsResponse = http.get(`${BASE_URL}/api/agents`);
  
  let agentsCheck = check(agentsResponse, {
    'agents status is 200': (r) => r.status === 200,
    'agents response is array': (r) => Array.isArray(JSON.parse(r.body)),
    'agents response time < 1s': (r) => r.timings.duration < 1000,
    'agents count > 0': (r) => JSON.parse(r.body).length > 0,
  });
  
  errorRate.add(!agentsCheck);
  
  // Validate agent data structure
  if (agentsResponse.status === 200) {
    let agents = JSON.parse(agentsResponse.body);
    if (agents.length > 0) {
      let agent = agents[0];
      let agentStructureCheck = check(agent, {
        'agent has id': (a) => a.id !== undefined,
        'agent has name': (a) => a.name !== undefined,
        'agent has status': (a) => a.status !== undefined,
        'agent has type': (a) => a.type !== undefined,
      });
      
      errorRate.add(!agentStructureCheck);
    }
  }
  
  sleep(2);
  
  // Test concurrent requests
  let batch = http.batch([
    ['GET', `${BASE_URL}/health`],
    ['GET', `${BASE_URL}/api/agents`],
    ['GET', `${BASE_URL}/health`],
  ]);
  
  let batchCheck = check(batch, {
    'all batch requests successful': (responses) => 
      responses.every(r => r.status === 200),
  });
  
  errorRate.add(!batchCheck);
  
  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-test-results/k6-summary.json': JSON.stringify(data, null, 2),
    'load-test-results/k6-summary.html': htmlReport(data),
  };
}

function htmlReport(data) {
  const passed = data.metrics.checks.values.passes;
  const failed = data.metrics.checks.values.fails;
  const total = passed + failed;
  const passRate = ((passed / total) * 100).toFixed(2);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>K6 Load Test Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
            .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
            .metric { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .metric h3 { margin-top: 0; color: #333; }
            .pass { color: #28a745; }
            .fail { color: #dc3545; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🚀 Agent API Load Test Report</h1>
            <p>Test Duration: ${data.state.testRunDurationMs}ms</p>
            <p>Virtual Users: ${data.options.stages?.map(s => s.target).join(' → ') || 'N/A'}</p>
        </div>
        
        <div class="metrics">
            <div class="metric">
                <h3>✅ Test Results</h3>
                <p><span class="pass">Passed: ${passed}</span></p>
                <p><span class="fail">Failed: ${failed}</span></p>
                <p>Pass Rate: ${passRate}%</p>
            </div>
            
            <div class="metric">
                <h3>⏱️ Response Times</h3>
                <p>Average: ${data.metrics.http_req_duration?.values?.avg?.toFixed(2)}ms</p>
                <p>95th Percentile: ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2)}ms</p>
                <p>Max: ${data.metrics.http_req_duration?.values?.max?.toFixed(2)}ms</p>
            </div>
            
            <div class="metric">
                <h3>📊 Request Stats</h3>
                <p>Total Requests: ${data.metrics.http_reqs?.values?.count || 0}</p>
                <p>Request Rate: ${data.metrics.http_reqs?.values?.rate?.toFixed(2)}/s</p>
                <p>Failed Requests: ${data.metrics.http_req_failed?.values?.rate ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0}%</p>
            </div>
            
            <div class="metric">
                <h3>🎯 Thresholds</h3>
                ${Object.entries(data.thresholds || {}).map(([key, value]) => 
                  `<p>${key}: <span class="${value.ok ? 'pass' : 'fail'}">${value.ok ? 'PASS' : 'FAIL'}</span></p>`
                ).join('')}
            </div>
        </div>
        
        <h2>📈 Detailed Metrics</h2>
        <pre>${JSON.stringify(data.metrics, null, 2)}</pre>
    </body>
    </html>
  `;
}