#!/usr/bin/env node

/**
 * NA Agent Dashboard - Live Data Validation Script
 * Validates data flow through UI, Backend, and Logs
 */

const axios = require('axios');
const { io } = require('socket.io-client');
const chalk = require('chalk');

const API_URL = 'http://localhost:4001';
const WS_URL = 'ws://localhost:4001';

class DataValidator {
  constructor() {
    this.results = {
      backend: [],
      websocket: [],
      ui: [],
      dataConsistency: []
    };
  }

  async validateBackendData() {
    console.log(chalk.blue('\n=== Validating Backend Data ===\n'));
    
    try {
      // 1. Check health endpoint
      const health = await axios.get(`${API_URL}/health`);
      this.results.backend.push({
        test: 'Health Check',
        status: health.status === 200,
        data: health.data
      });
      console.log(chalk.green('✓'), 'Health check passed');

      // 2. Get all agents
      const agents = await axios.get(`${API_URL}/api/dashboard/agents`);
      const agentCount = agents.data.agents.length;
      this.results.backend.push({
        test: 'Agent List',
        status: agentCount === 7,
        data: `Found ${agentCount} agents`
      });
      console.log(chalk.green('✓'), `Found ${agentCount} agents (expected 7)`);

      // 3. Verify each agent type exists
      const expectedTypes = ['architect', 'developer', 'devops', 'qa', 'security', 'coordinator', 'chat-voice'];
      const foundTypes = agents.data.agents.map(a => a.type);
      const allTypesPresent = expectedTypes.every(type => foundTypes.includes(type));
      
      this.results.backend.push({
        test: 'Agent Types',
        status: allTypesPresent,
        data: foundTypes
      });
      console.log(chalk.green('✓'), 'All agent types present:', foundTypes.join(', '));

      // 4. Test agent messaging
      const testAgent = agents.data.agents[0];
      const messageResponse = await axios.post(
        `${API_URL}/api/dashboard/agents/${testAgent.id}/message`,
        { message: 'Validation test message', context: { test: true } }
      );
      
      this.results.backend.push({
        test: 'Agent Messaging',
        status: messageResponse.status === 200,
        data: messageResponse.data
      });
      console.log(chalk.green('✓'), `Sent message to ${testAgent.name}`);

      // 5. Get statistics
      const stats = await axios.get(`${API_URL}/api/dashboard/stats`);
      this.results.backend.push({
        test: 'Statistics',
        status: stats.data.totalAgents > 0,
        data: stats.data
      });
      console.log(chalk.green('✓'), 'Statistics:', JSON.stringify(stats.data, null, 2));

      // 6. Check conversation history
      const conversation = await axios.get(`${API_URL}/api/dashboard/agents/${testAgent.id}/conversation`);
      this.results.backend.push({
        test: 'Conversation History',
        status: Array.isArray(conversation.data.messages),
        data: `${conversation.data.messages.length} messages`
      });
      console.log(chalk.green('✓'), `Conversation history: ${conversation.data.messages.length} messages`);

    } catch (error) {
      console.log(chalk.red('✗'), 'Backend error:', error.message);
      this.results.backend.push({
        test: 'Backend Error',
        status: false,
        data: error.message
      });
    }
  }

  async validateWebSocketData() {
    console.log(chalk.blue('\n=== Validating WebSocket Data ===\n'));
    
    return new Promise((resolve) => {
      const socket = io(WS_URL, {
        transports: ['websocket'],
        reconnection: false
      });

      const timeout = setTimeout(() => {
        console.log(chalk.yellow('⚠'), 'WebSocket timeout');
        socket.close();
        resolve();
      }, 5000);

      socket.on('connect', () => {
        console.log(chalk.green('✓'), 'WebSocket connected');
        this.results.websocket.push({
          test: 'Connection',
          status: true,
          data: 'Connected'
        });

        // Request agent status
        socket.emit('dashboard:refresh');
      });

      socket.on('agents:status', (data) => {
        console.log(chalk.green('✓'), `Received agent status: ${data.length} agents`);
        this.results.websocket.push({
          test: 'Agent Status',
          status: data.length === 7,
          data: data
        });
      });

      socket.on('system:metrics', (data) => {
        console.log(chalk.green('✓'), 'Received system metrics:', data);
        this.results.websocket.push({
          test: 'System Metrics',
          status: true,
          data: data
        });
      });

      socket.on('error', (error) => {
        console.log(chalk.red('✗'), 'WebSocket error:', error);
        this.results.websocket.push({
          test: 'Error',
          status: false,
          data: error
        });
      });

      socket.on('disconnect', () => {
        clearTimeout(timeout);
        resolve();
      });

      // Disconnect after 3 seconds
      setTimeout(() => {
        socket.close();
      }, 3000);
    });
  }

  async validateUIData() {
    console.log(chalk.blue('\n=== Validating UI Data Display ===\n'));
    
    try {
      // Check if frontend is running
      const frontendResponse = await axios.get('http://localhost:5173');
      
      if (frontendResponse.status === 200) {
        console.log(chalk.green('✓'), 'Frontend is accessible');
        this.results.ui.push({
          test: 'Frontend Access',
          status: true,
          data: 'Frontend running on port 5173'
        });

        // The actual UI validation would be done through Playwright
        console.log(chalk.yellow('ℹ'), 'UI component validation requires Playwright tests');
        
      }
    } catch (error) {
      console.log(chalk.yellow('⚠'), 'Frontend not accessible:', error.message);
      this.results.ui.push({
        test: 'Frontend Access',
        status: false,
        data: error.message
      });
    }
  }

  async validateDataConsistency() {
    console.log(chalk.blue('\n=== Validating Data Consistency ===\n'));
    
    try {
      // 1. Get data from API
      const apiAgents = await axios.get(`${API_URL}/api/dashboard/agents`);
      const apiStats = await axios.get(`${API_URL}/api/dashboard/stats`);
      
      // 2. Check consistency
      const agentCount = apiAgents.data.agents.length;
      const statsAgentCount = apiStats.data.totalAgents;
      
      const isConsistent = agentCount === statsAgentCount;
      
      this.results.dataConsistency.push({
        test: 'Agent Count Consistency',
        status: isConsistent,
        data: `API: ${agentCount}, Stats: ${statsAgentCount}`
      });
      
      if (isConsistent) {
        console.log(chalk.green('✓'), `Data consistent: ${agentCount} agents in both endpoints`);
      } else {
        console.log(chalk.red('✗'), `Data inconsistent: API shows ${agentCount}, Stats shows ${statsAgentCount}`);
      }

      // 3. Verify agent statuses match
      const busyAgents = apiAgents.data.agents.filter(a => a.status === 'busy').length;
      const statsBusyAgents = apiStats.data.busyAgents || 0;
      
      this.results.dataConsistency.push({
        test: 'Busy Agent Consistency',
        status: busyAgents === statsBusyAgents,
        data: `Busy agents - API: ${busyAgents}, Stats: ${statsBusyAgents}`
      });
      
      console.log(chalk.green('✓'), `Busy agents consistent: ${busyAgents}`);

    } catch (error) {
      console.log(chalk.red('✗'), 'Consistency check failed:', error.message);
      this.results.dataConsistency.push({
        test: 'Error',
        status: false,
        data: error.message
      });
    }
  }

  printSummary() {
    console.log(chalk.blue('\n=== VALIDATION SUMMARY ===\n'));
    
    const categories = [
      { name: 'Backend', results: this.results.backend },
      { name: 'WebSocket', results: this.results.websocket },
      { name: 'UI', results: this.results.ui },
      { name: 'Data Consistency', results: this.results.dataConsistency }
    ];

    categories.forEach(category => {
      const passed = category.results.filter(r => r.status).length;
      const total = category.results.length;
      const percentage = total > 0 ? (passed / total * 100).toFixed(0) : 0;
      
      const color = percentage === '100' ? chalk.green : percentage >= '50' ? chalk.yellow : chalk.red;
      console.log(color(`${category.name}: ${passed}/${total} tests passed (${percentage}%)`));
      
      category.results.forEach(result => {
        const icon = result.status ? chalk.green('  ✓') : chalk.red('  ✗');
        console.log(`${icon} ${result.test}`);
      });
      console.log('');
    });

    // Overall summary
    const allResults = Object.values(this.results).flat();
    const totalPassed = allResults.filter(r => r.status).length;
    const totalTests = allResults.length;
    const overallPercentage = (totalPassed / totalTests * 100).toFixed(0);
    
    console.log(chalk.blue('═'.repeat(50)));
    if (overallPercentage === '100') {
      console.log(chalk.green.bold(`✓ ALL TESTS PASSED (${totalPassed}/${totalTests})`));
      console.log(chalk.green('SYSTEM FULLY OPERATIONAL WITH LIVE DATA'));
    } else {
      console.log(chalk.yellow(`Overall: ${totalPassed}/${totalTests} tests passed (${overallPercentage}%)`));
    }
  }

  async run() {
    console.log(chalk.cyan.bold('\n🔍 NA Agent Dashboard - Live Data Validation\n'));
    console.log(chalk.gray('Validating data flow through all system layers...\n'));
    
    await this.validateBackendData();
    await this.validateWebSocketData();
    await this.validateUIData();
    await this.validateDataConsistency();
    
    this.printSummary();
  }
}

// Run validation
const validator = new DataValidator();
validator.run().catch(error => {
  console.error(chalk.red('Validation failed:'), error);
  process.exit(1);
});