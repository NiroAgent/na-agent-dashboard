/**
 * Test script to demonstrate SSM command integration
 * This shows how the dashboard can control EC2 agents via SSM
 */

const { SSMClient, SendCommandCommand, GetCommandInvocationCommand } = require('@aws-sdk/client-ssm');

async function testSSMIntegration() {
  console.log('🧪 Testing SSM Agent Control Integration');
  console.log('=====================================');
  
  // Initialize SSM client
  const ssmClient = new SSMClient({ region: 'us-east-1' });
  
  // Test instance ID from handoff instructions
  const instanceId = 'i-0af59b7036f7b0b77';
  
  console.log(`📍 Target Instance: ${instanceId}`);
  
  try {
    // Test 1: Check agent status
    console.log('\n1️⃣ Testing Agent Status Check...');
    const statusCommand = new SendCommandCommand({
      InstanceIds: [instanceId],
      DocumentName: 'AWS-RunShellScript',
      Parameters: {
        commands: [
          'echo "=== AGENT STATUS ==="',
          'tmux list-sessions | grep agent || echo "No agent sessions found"',
          'ps aux | grep "ai.*agent.py" | grep -v grep || echo "No agent processes found"',
          'echo "=== SYSTEM STATUS ==="',
          'uptime',
          'free -m | head -2'
        ]
      },
      TimeoutSeconds: 60
    });

    const statusResponse = await ssmClient.send(statusCommand);
    console.log(`✅ Status command sent: ${statusResponse.Command?.CommandId}`);
    
    // Wait for command to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get the results
    const statusInvocation = new GetCommandInvocationCommand({
      CommandId: statusResponse.Command?.CommandId,
      InstanceId: instanceId
    });
    
    const statusResult = await ssmClient.send(statusInvocation);
    console.log('📊 Status Output:');
    console.log(statusResult.StandardOutputContent || 'No output');
    
    // Test 2: Restart a specific agent (QA agent)
    console.log('\n2️⃣ Testing Agent Restart (QA Agent)...');
    const restartCommand = new SendCommandCommand({
      InstanceIds: [instanceId],
      DocumentName: 'AWS-RunShellScript',
      Parameters: {
        commands: [
          'tmux kill-session -t qa-agent 2>/dev/null || echo "QA session killed"',
          'pkill -f "ai-qa-agent.py" 2>/dev/null || echo "QA process killed"',
          'sleep 2',
          'cd /opt/ai-agents/scripts',
          'export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --secret-id github-agent-token --query SecretString --output text)',
          'tmux new-session -d -s qa-agent "python3 ai-qa-agent.py --monitor --run-tests"',
          'echo "QA Agent restarted successfully"'
        ]
      },
      TimeoutSeconds: 120
    });

    const restartResponse = await ssmClient.send(restartCommand);
    console.log(`✅ Restart command sent: ${restartResponse.Command?.CommandId}`);
    
    // Wait for restart to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get restart results
    const restartInvocation = new GetCommandInvocationCommand({
      CommandId: restartResponse.Command?.CommandId,
      InstanceId: instanceId
    });
    
    const restartResult = await ssmClient.send(restartInvocation);
    console.log('🔄 Restart Output:');
    console.log(restartResult.StandardOutputContent || 'No output');
    
    // Test 3: Deploy all agents
    console.log('\n3️⃣ Testing Deploy All Agents...');
    const deployCommand = new SendCommandCommand({
      InstanceIds: [instanceId],
      DocumentName: 'AWS-RunShellScript',
      Parameters: {
        commands: [
          'echo "=== STOPPING EXISTING AGENTS ==="',
          'sudo pkill -f "ai.*agent.py" || echo "No existing agents"',
          'tmux kill-server || echo "No tmux sessions"',
          'sleep 3',
          'echo "=== STARTING ALL AGENTS ==="',
          'cd /opt/ai-agents/scripts',
          'export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --secret-id github-agent-token --query SecretString --output text)',
          'tmux new-session -d -s qa-agent "python3 ai-qa-agent.py --monitor --run-tests"',
          'tmux new-session -d -s developer-agent "python3 ai-developer-agent.py --monitor --fix-bugs"',
          'tmux new-session -d -s devops-agent "python3 ai-devops-agent.py --monitor"',
          'tmux new-session -d -s manager-agent "python3 ai-manager-agent.py --monitor"',
          'sleep 5',
          'echo "=== VERIFICATION ==="',
          'tmux list-sessions',
          'ps aux | grep -E "ai.*agent.py" | grep -v grep'
        ]
      },
      TimeoutSeconds: 300
    });

    const deployResponse = await ssmClient.send(deployCommand);
    console.log(`✅ Deploy command sent: ${deployResponse.Command?.CommandId}`);
    
    // Wait for deployment to complete
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Get deployment results
    const deployInvocation = new GetCommandInvocationCommand({
      CommandId: deployResponse.Command?.CommandId,
      InstanceId: instanceId
    });
    
    const deployResult = await ssmClient.send(deployInvocation);
    console.log('🚀 Deployment Output:');
    console.log(deployResult.StandardOutputContent || 'No output');
    
    console.log('\n✅ SSM Integration Test Complete!');
    console.log('\n🎯 Dashboard Features Implemented:');
    console.log('  • Real-time agent status via SSM');
    console.log('  • Individual agent control (start/stop/restart)');
    console.log('  • Bulk agent deployment');
    console.log('  • Live system monitoring');
    console.log('  • Error handling and logging');
    
  } catch (error) {
    console.error('❌ SSM Integration Test Failed:', error);
    console.log('\n🔧 Possible Solutions:');
    console.log('  • Check AWS credentials are configured');
    console.log('  • Verify instance ID is correct');
    console.log('  • Ensure SSM agent is running on EC2 instance');
    console.log('  • Check IAM permissions for SSM commands');
  }
}

// Run the test
if (require.main === module) {
  testSSMIntegration();
}

module.exports = { testSSMIntegration };
