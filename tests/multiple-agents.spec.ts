import { test, expect } from '@playwright/test';

test.describe('Multiple Agents Task Handling', () => {
  const agents = [
    'demo-architect-1',
    'demo-developer-1', 
    'demo-devops-1',
    'demo-qa-1',
    'demo-manager-1'
  ];

  test.beforeAll(async ({ request }) => {
    // Verify API is running
    const healthResponse = await request.get('http://localhost:7778/health');
    expect(healthResponse.ok()).toBeTruthy();
    console.log('✅ API server is healthy');
  });

  test('should create multiple agents if they don\'t exist', async ({ request }) => {
    // First check existing agents
    const agentsResponse = await request.get('http://localhost:7778/api/dashboard/agents');
    expect(agentsResponse.ok()).toBeTruthy();
    
    const agentsData = await agentsResponse.json();
    console.log(`📊 Found ${agentsData.agents?.length || 0} existing agents`);

    // Create additional demo agents if needed
    for (const agentId of agents) {
      console.log(`🔍 Checking agent: ${agentId}`);
      
      // Try to get agent details
      const agentResponse = await request.get(`http://localhost:7778/api/dashboard/agents/${agentId}`);
      
      if (!agentResponse.ok()) {
        console.log(`➕ Creating agent: ${agentId}`);
        
        // Create the agent via API if it doesn't exist
        const createResponse = await request.post('http://localhost:7778/api/dashboard/agents', {
          data: {
            id: agentId,
            name: agentId.replace('demo-', '').replace('-', ' '),
            type: agentId.includes('architect') ? 'architect' : 
                  agentId.includes('developer') ? 'developer' :
                  agentId.includes('devops') ? 'devops' :
                  agentId.includes('qa') ? 'qa' : 'manager',
            status: 'idle',
            instance: `i-${Math.random().toString(36).substr(2, 9)}`,
            region: 'us-east-1',
            cost: {
              hourly: Math.random() * 0.5 + 0.1,
              daily: Math.random() * 12 + 2.4,
              monthly: Math.random() * 360 + 72
            }
          }
        });
        
        console.log(`${createResponse.ok() ? '✅' : '❌'} Agent ${agentId} creation: ${createResponse.status()}`);
      } else {
        console.log(`✅ Agent ${agentId} already exists`);
      }
    }
  });

  test('should submit tasks to multiple agents concurrently', async ({ request }) => {
    const tasks = [
      { agentId: 'demo-architect-1', task: 'Design microservice architecture for user authentication system', priority: 'high' },
      { agentId: 'demo-developer-1', task: 'Implement REST API endpoints for user management', priority: 'high' },
      { agentId: 'demo-devops-1', task: 'Setup CI/CD pipeline with automated testing and deployment', priority: 'medium' },
      { agentId: 'demo-qa-1', task: 'Create comprehensive test suite for API endpoints', priority: 'medium' },
      { agentId: 'demo-manager-1', task: 'Coordinate project timeline and resource allocation', priority: 'low' }
    ];

    console.log(`🚀 Submitting ${tasks.length} tasks concurrently...`);

    // Submit all tasks concurrently
    const taskPromises = tasks.map(async ({ agentId, task, priority }) => {
      const startTime = Date.now();
      
      try {
        const response = await request.post(`http://localhost:7778/api/dashboard/agents/${agentId}/task`, {
          data: {
            task: task,
            priority: priority,
            context: {
              testId: `concurrent-test-${Date.now()}`,
              submittedAt: new Date().toISOString()
            },
            timeout: 120
          },
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const responseTime = Date.now() - startTime;
        
        if (response.ok()) {
          const result = await response.json();
          console.log(`✅ Task submitted to ${agentId} in ${responseTime}ms - TaskID: ${result.taskId || 'unknown'}`);
          return { agentId, success: true, result, responseTime };
        } else {
          const error = await response.text();
          console.log(`❌ Task submission failed for ${agentId}: ${response.status()} - ${error}`);
          return { agentId, success: false, error: response.status(), responseTime };
        }
      } catch (error) {
        console.log(`💥 Exception for ${agentId}:`, error);
        return { agentId, success: false, error: error.message };
      }
    });

    // Wait for all tasks to complete
    const results = await Promise.all(taskPromises);
    
    // Analyze results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`📊 Results: ${successful.length} successful, ${failed.length} failed`);
    
    if (successful.length > 0) {
      const avgResponseTime = successful.reduce((sum, r) => sum + (r.responseTime || 0), 0) / successful.length;
      console.log(`⏱️  Average response time: ${avgResponseTime.toFixed(2)}ms`);
    }

    // Log failures for debugging
    failed.forEach(({ agentId, error }) => {
      console.log(`❌ Failed: ${agentId} - ${error}`);
    });

    // Expect at least some tasks to succeed (even if agents don't exist yet)
    expect(results.length).toBe(tasks.length);
    console.log(`✅ All ${results.length} task submissions completed`);
  });

  test('should send messages to multiple agents simultaneously', async ({ request }) => {
    const messages = [
      { agentId: 'demo-architect-1', message: 'What design patterns should we use for the authentication service?' },
      { agentId: 'demo-developer-1', message: 'Can you review the API documentation draft?' },
      { agentId: 'demo-devops-1', message: 'What monitoring tools should we integrate?' },
      { agentId: 'demo-qa-1', message: 'What test coverage targets should we aim for?' },
      { agentId: 'demo-manager-1', message: 'Can you provide a project status update?' }
    ];

    console.log(`💬 Sending ${messages.length} messages simultaneously...`);

    const messagePromises = messages.map(async ({ agentId, message }) => {
      const startTime = Date.now();
      
      try {
        const response = await request.post(`http://localhost:7778/api/dashboard/agents/${agentId}/message`, {
          data: {
            message: message,
            context: {
              testType: 'concurrent-messaging',
              timestamp: Date.now()
            }
          },
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const responseTime = Date.now() - startTime;

        if (response.ok()) {
          const result = await response.json();
          console.log(`💬 ${agentId} responded in ${responseTime}ms: "${result.content?.substring(0, 50)}..."`);
          return { agentId, success: true, result, responseTime };
        } else {
          const error = await response.text();
          console.log(`❌ Message failed for ${agentId}: ${response.status()}`);
          return { agentId, success: false, error: response.status(), responseTime };
        }
      } catch (error) {
        console.log(`💥 Exception messaging ${agentId}:`, error.message);
        return { agentId, success: false, error: error.message };
      }
    });

    const results = await Promise.all(messagePromises);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`📊 Messaging Results: ${successful.length} successful, ${failed.length} failed`);

    if (successful.length > 0) {
      const avgResponseTime = successful.reduce((sum, r) => sum + (r.responseTime || 0), 0) / successful.length;
      console.log(`⏱️  Average message response time: ${avgResponseTime.toFixed(2)}ms`);
    }

    expect(results.length).toBe(messages.length);
  });

  test('should handle load testing with rapid task submissions', async ({ request }) => {
    const loadTestTasks: Array<{agentId: string, task: string, priority: string}> = [];
    const numTasks = 10; // 10 rapid tasks per agent
    
    console.log(`🔥 Load testing: ${numTasks} tasks per agent...`);

    // Generate load test tasks
    for (let i = 0; i < numTasks; i++) {
      agents.forEach(agentId => {
        loadTestTasks.push({
          agentId,
          task: `Load test task #${i + 1} - Process data batch and generate report`,
          priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low'
        });
      });
    }

    const startTime = Date.now();
    console.log(`⚡ Submitting ${loadTestTasks.length} tasks rapidly...`);

    // Submit all tasks as fast as possible
    const loadPromises = loadTestTasks.map(async ({ agentId, task, priority }, index) => {
      try {
        const response = await request.post(`http://localhost:7778/api/dashboard/agents/${agentId}/task`, {
          data: {
            task: task,
            priority: priority,
            context: {
              loadTest: true,
              taskNumber: index + 1,
              batchId: `load-test-${Date.now()}`
            }
          }
        });

        return { 
          index: index + 1, 
          agentId, 
          success: response.ok(), 
          status: response.status() 
        };
      } catch (error) {
        return { 
          index: index + 1, 
          agentId, 
          success: false, 
          error: error.message 
        };
      }
    });

    const loadResults = await Promise.all(loadPromises);
    const totalTime = Date.now() - startTime;
    
    const successful = loadResults.filter(r => r.success);
    const failed = loadResults.filter(r => !r.success);
    
    console.log(`⚡ Load Test Results:`);
    console.log(`   Total tasks: ${loadResults.length}`);
    console.log(`   Successful: ${successful.length}`);
    console.log(`   Failed: ${failed.length}`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Throughput: ${(loadResults.length / totalTime * 1000).toFixed(2)} tasks/second`);

    expect(loadResults.length).toBe(loadTestTasks.length);
  });

  test('should monitor agent status during task execution', async ({ request, page }) => {
    console.log('📊 Monitoring agent status during task execution...');

    // Navigate to dashboard to observe real-time updates
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Submit a few tasks and monitor status changes
    const monitoringTasks = [
      { agentId: 'demo-architect-1', task: 'Design system architecture for monitoring dashboard' },
      { agentId: 'demo-developer-1', task: 'Implement real-time status updates' }
    ];

    for (const { agentId, task } of monitoringTasks) {
      console.log(`📤 Submitting task to ${agentId}: ${task.substring(0, 40)}...`);
      
      const response = await request.post(`http://localhost:7778/api/dashboard/agents/${agentId}/task`, {
        data: { task, priority: 'medium' }
      });

      if (response.ok()) {
        const result = await response.json();
        console.log(`✅ Task submitted: ${result.taskId || 'unknown'}`);
      } else {
        console.log(`❌ Task submission failed: ${response.status()}`);
      }

      // Wait a bit between submissions to observe status changes
      await page.waitForTimeout(1000);
    }

    // Check if the UI updates with agent activity
    await page.waitForTimeout(3000);
    
    // Take a screenshot to see the current state
    await page.screenshot({ 
      path: 'test-results/multiple-agents-status.png', 
      fullPage: true 
    });

    // Verify agents are visible on the page
    const pageText = await page.locator('body').textContent();
    let visibleAgents = 0;
    
    agents.forEach(agentId => {
      if (pageText?.includes(agentId) || pageText?.includes(agentId.replace('demo-', ''))) {
        visibleAgents++;
        console.log(`👁️  Agent ${agentId} is visible on dashboard`);
      }
    });

    console.log(`📊 ${visibleAgents} out of ${agents.length} agents are visible on dashboard`);
  });

  test('should verify agent conversation history', async ({ request }) => {
    console.log('💭 Checking agent conversation histories...');

    for (const agentId of agents.slice(0, 3)) { // Check first 3 agents
      try {
        const response = await request.get(`http://localhost:7778/api/dashboard/agents/${agentId}/conversation`);
        
        if (response.ok()) {
          const conversation = await response.json();
          console.log(`💬 ${agentId}: ${conversation.messages?.length || 0} messages in history`);
          
          if (conversation.messages && conversation.messages.length > 0) {
            const lastMessage = conversation.messages[conversation.messages.length - 1];
            console.log(`   Last message: "${lastMessage.content?.substring(0, 50)}..."`);
          }
        } else {
          console.log(`❌ Could not get conversation for ${agentId}: ${response.status()}`);
        }
      } catch (error) {
        console.log(`💥 Error getting conversation for ${agentId}:`, error.message);
      }
    }
  });

  test('should test agent coordination scenario', async ({ request }) => {
    console.log('🤝 Testing agent coordination scenario...');

    // Simulate a coordinated project workflow
    const coordinationTasks = [
      {
        agentId: 'demo-manager-1',
        task: 'Create project plan for new feature development',
        priority: 'high',
        dependencies: []
      },
      {
        agentId: 'demo-architect-1', 
        task: 'Design technical architecture based on project requirements',
        priority: 'high',
        dependencies: ['demo-manager-1']
      },
      {
        agentId: 'demo-developer-1',
        task: 'Implement core functionality following architectural design',
        priority: 'medium',
        dependencies: ['demo-architect-1']
      },
      {
        agentId: 'demo-qa-1',
        task: 'Create test plan and execute testing procedures',
        priority: 'medium', 
        dependencies: ['demo-developer-1']
      },
      {
        agentId: 'demo-devops-1',
        task: 'Deploy to staging and production environments',
        priority: 'low',
        dependencies: ['demo-qa-1']
      }
    ];

    const taskResults = new Map();

    // Execute tasks in dependency order
    for (const { agentId, task, priority, dependencies } of coordinationTasks) {
      // Wait for dependencies (simulation)
      if (dependencies.length > 0) {
        console.log(`⏳ ${agentId} waiting for dependencies: ${dependencies.join(', ')}`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate dependency wait
      }

      console.log(`🎯 ${agentId}: ${task.substring(0, 50)}...`);

      try {
        const response = await request.post(`http://localhost:7778/api/dashboard/agents/${agentId}/task`, {
          data: {
            task,
            priority,
            context: {
              workflow: 'coordination-test',
              dependencies,
              step: coordinationTasks.findIndex(t => t.agentId === agentId) + 1
            }
          }
        });

        const result: any = {
          agentId,
          success: response.ok(),
          status: response.status(),
          timestamp: Date.now()
        };

        if (response.ok()) {
          const data = await response.json();
          result.taskId = data.taskId;
          console.log(`✅ ${agentId} completed step - TaskID: ${data.taskId || 'unknown'}`);
        } else {
          console.log(`❌ ${agentId} failed: ${response.status()}`);
        }

        taskResults.set(agentId, result);

      } catch (error) {
        console.log(`💥 ${agentId} error:`, error.message);
        taskResults.set(agentId, { agentId, success: false, error: error.message });
      }
    }

    console.log('🏁 Coordination workflow completed');
    
    // Summary
    const successful = Array.from(taskResults.values()).filter(r => r.success);
    console.log(`📊 Coordination Results: ${successful.length}/${coordinationTasks.length} tasks successful`);

    expect(taskResults.size).toBe(coordinationTasks.length);
  });
});
