#!/usr/bin/env python3
"""
Agent Simulator for Local Testing
Simulates multiple AI agents without AWS infrastructure
"""

import os
import json
import asyncio
import aiohttp
import logging
from datetime import datetime
from typing import Dict, List, Any
import random
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('agent-simulator')

class AgentSimulator:
    """Simulates AI agents for local testing"""
    
    def __init__(self):
        self.api_url = os.environ.get('API_URL', 'http://localhost:4001')
        self.github_token = os.environ.get('GITHUB_TOKEN', '')
        self.anthropic_key = os.environ.get('ANTHROPIC_API_KEY', '')
        self.agents = self.create_simulated_agents()
        self.running = True
        
    def create_simulated_agents(self) -> List[Dict[str, Any]]:
        """Create simulated agent profiles"""
        return [
            {
                'id': 'sim-developer-1',
                'name': 'Simulated Developer Agent',
                'type': 'developer',
                'capabilities': ['code-generation', 'bug-fixing', 'refactoring'],
                'status': 'idle',
                'platform': 'simulator'
            },
            {
                'id': 'sim-qa-1',
                'name': 'Simulated QA Agent',
                'type': 'qa',
                'capabilities': ['testing', 'validation', 'regression'],
                'status': 'idle',
                'platform': 'simulator'
            },
            {
                'id': 'sim-devops-1',
                'name': 'Simulated DevOps Agent',
                'type': 'devops',
                'capabilities': ['deployment', 'infrastructure', 'monitoring'],
                'status': 'idle',
                'platform': 'simulator'
            },
            {
                'id': 'sim-architect-1',
                'name': 'Simulated Architect Agent',
                'type': 'architect',
                'capabilities': ['design', 'patterns', 'documentation'],
                'status': 'idle',
                'platform': 'simulator'
            },
            {
                'id': 'sim-security-1',
                'name': 'Simulated Security Agent',
                'type': 'security',
                'capabilities': ['scanning', 'compliance', 'encryption'],
                'status': 'idle',
                'platform': 'simulator'
            }
        ]
    
    async def register_agents(self):
        """Register simulated agents with the dashboard API"""
        async with aiohttp.ClientSession() as session:
            for agent in self.agents:
                try:
                    async with session.post(
                        f'{self.api_url}/api/simulator/register-agent',
                        json=agent,
                        headers={'Content-Type': 'application/json'}
                    ) as response:
                        if response.status == 200:
                            logger.info(f"Registered agent: {agent['id']}")
                        else:
                            logger.warning(f"Failed to register {agent['id']}: {response.status}")
                except Exception as e:
                    logger.error(f"Error registering {agent['id']}: {e}")
    
    async def simulate_agent_activity(self):
        """Simulate agent activities"""
        activities = [
            'Processing GitHub issue',
            'Running tests',
            'Generating code',
            'Reviewing PR',
            'Analyzing architecture',
            'Scanning for vulnerabilities',
            'Deploying to staging',
            'Monitoring metrics'
        ]
        
        async with aiohttp.ClientSession() as session:
            while self.running:
                # Randomly select an agent to perform an activity
                agent = random.choice(self.agents)
                activity = random.choice(activities)
                
                # Update agent status
                agent['status'] = 'processing'
                agent['currentTask'] = activity
                
                try:
                    # Send status update to dashboard
                    async with session.post(
                        f'{self.api_url}/api/simulator/agent-status',
                        json={
                            'agentId': agent['id'],
                            'status': agent['status'],
                            'task': activity,
                            'timestamp': datetime.now().isoformat()
                        },
                        headers={'Content-Type': 'application/json'}
                    ) as response:
                        if response.status == 200:
                            logger.info(f"{agent['id']} is {activity}")
                        
                    # Simulate processing time
                    await asyncio.sleep(random.randint(5, 30))
                    
                    # Complete the task
                    agent['status'] = 'idle'
                    agent['currentTask'] = None
                    
                    # Send completion update
                    async with session.post(
                        f'{self.api_url}/api/simulator/agent-status',
                        json={
                            'agentId': agent['id'],
                            'status': 'idle',
                            'task': None,
                            'completed': activity,
                            'timestamp': datetime.now().isoformat()
                        },
                        headers={'Content-Type': 'application/json'}
                    ) as response:
                        if response.status == 200:
                            logger.info(f"{agent['id']} completed {activity}")
                            
                except Exception as e:
                    logger.error(f"Error updating {agent['id']}: {e}")
                
                # Random delay between activities
                await asyncio.sleep(random.randint(2, 10))
    
    async def simulate_github_integration(self):
        """Simulate GitHub issue processing"""
        if not self.github_token:
            logger.warning("No GitHub token, skipping GitHub simulation")
            return
            
        async with aiohttp.ClientSession() as session:
            while self.running:
                try:
                    # Simulate receiving a GitHub webhook
                    issue_data = {
                        'number': random.randint(100, 999),
                        'title': f'Test Issue {random.randint(1, 100)}',
                        'body': 'This is a simulated issue for testing',
                        'labels': random.choice([['bug'], ['feature'], ['test']]),
                        'repository': 'test-repo',
                        'created_at': datetime.now().isoformat()
                    }
                    
                    async with session.post(
                        f'{self.api_url}/api/simulator/github-webhook',
                        json=issue_data,
                        headers={'Content-Type': 'application/json'}
                    ) as response:
                        if response.status == 200:
                            logger.info(f"Simulated GitHub issue #{issue_data['number']}")
                            
                except Exception as e:
                    logger.error(f"Error simulating GitHub: {e}")
                
                # Wait before next simulation
                await asyncio.sleep(60)
    
    async def handle_agent_messages(self):
        """Handle incoming messages for agents"""
        async with aiohttp.ClientSession() as session:
            while self.running:
                try:
                    # Check for messages to agents
                    for agent in self.agents:
                        async with session.get(
                            f'{self.api_url}/api/simulator/agent-messages/{agent["id"]}',
                            headers={'Content-Type': 'application/json'}
                        ) as response:
                            if response.status == 200:
                                messages = await response.json()
                                for message in messages.get('messages', []):
                                    logger.info(f"Agent {agent['id']} received: {message['content']}")
                                    
                                    # Simulate response
                                    reply = f"Acknowledged: {message['content'][:50]}..."
                                    await session.post(
                                        f'{self.api_url}/api/simulator/agent-reply',
                                        json={
                                            'agentId': agent['id'],
                                            'messageId': message['id'],
                                            'reply': reply,
                                            'timestamp': datetime.now().isoformat()
                                        },
                                        headers={'Content-Type': 'application/json'}
                                    )
                                    
                except Exception as e:
                    logger.error(f"Error handling messages: {e}")
                
                await asyncio.sleep(5)
    
    async def run(self):
        """Run the agent simulator"""
        logger.info("Starting Agent Simulator...")
        
        # Register agents
        await self.register_agents()
        
        # Start simulation tasks
        tasks = [
            asyncio.create_task(self.simulate_agent_activity()),
            asyncio.create_task(self.simulate_github_integration()),
            asyncio.create_task(self.handle_agent_messages())
        ]
        
        try:
            await asyncio.gather(*tasks)
        except KeyboardInterrupt:
            logger.info("Shutting down simulator...")
            self.running = False
            for task in tasks:
                task.cancel()

if __name__ == '__main__':
    simulator = AgentSimulator()
    asyncio.run(simulator.run())