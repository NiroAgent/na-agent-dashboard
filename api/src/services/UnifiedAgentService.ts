/**
 * Unified Agent Service
 * Consolidates all agent-related functionality into a single service
 */

import { 
  EC2Client, 
  DescribeInstancesCommand,
  Instance 
} from '@aws-sdk/client-ec2';
import { 
  ECSClient, 
  ListTasksCommand,
  DescribeTasksCommand,
  RunTaskCommand 
} from '@aws-sdk/client-ecs';
import { 
  BatchClient, 
  ListJobsCommand,
  DescribeJobsCommand,
  SubmitJobCommand 
} from '@aws-sdk/client-batch';
import { 
  SSMClient, 
  SendCommandCommand,
  GetCommandInvocationCommand 
} from '@aws-sdk/client-ssm';
import { 
  CloudWatchClient, 
  GetMetricStatisticsCommand 
} from '@aws-sdk/client-cloudwatch';
import { 
  CostExplorerClient, 
  GetCostAndUsageCommand 
} from '@aws-sdk/client-cost-explorer';
import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { Octokit } from '@octokit/rest';
import crypto from 'crypto';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

export interface Agent {
  id: string;
  name: string;
  type: 'architect' | 'developer' | 'devops' | 'qa' | 'manager';
  status: 'idle' | 'busy' | 'offline';
  platform: 'ec2' | 'ecs' | 'batch' | 'local';
  instanceId?: string;
  taskArn?: string;
  jobId?: string;
  lastSeen: Date;
  currentTask?: string;
  capabilities: string[];
  metrics: {
    tasksCompleted: number;
    successRate: number;
    averageResponseTime: number;
    cpuUsage?: number;
    memoryUsage?: number;
  };
  cost?: {
    hourly: number;
    daily: number;
    monthly: number;
  };
}

export interface AgentMessage {
  id: string;
  agentId: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface TaskRequest {
  agentId: string;
  task: string;
  context?: any;
  priority?: 'high' | 'medium' | 'low';
  timeout?: number;
  issueNumber?: number;
  repository?: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  assignee?: string;
  state: 'open' | 'closed';
  repository: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UnifiedAgentService extends EventEmitter {
  private ec2Client: EC2Client | null = null;
  private ecsClient: ECSClient | null = null;
  private batchClient: BatchClient | null = null;
  private ssmClient: SSMClient | null = null;
  private cloudWatchClient: CloudWatchClient | null = null;
  private costExplorerClient: CostExplorerClient | null = null;
  private octokit: Octokit | null = null;
  
  private agents: Map<string, Agent> = new Map();
  private conversations: Map<string, AgentMessage[]> = new Map();
  private websockets: Map<string, WebSocket> = new Map();
  private issues: Map<number, GitHubIssue> = new Map();
  
  private monitoringInterval: NodeJS.Timeout | null = null;
  private costUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    const awsRegion = process.env.AWS_DEFAULT_REGION || 'us-east-1';
    const hasAWSCreds = process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE;
    
    if (hasAWSCreds) {
      this.ec2Client = new EC2Client({ region: awsRegion });
      this.ecsClient = new ECSClient({ region: awsRegion });
      this.batchClient = new BatchClient({ region: awsRegion });
      this.ssmClient = new SSMClient({ region: awsRegion });
      this.cloudWatchClient = new CloudWatchClient({ region: awsRegion });
      this.costExplorerClient = new CostExplorerClient({ region: 'us-east-1' });
      
      logger.info('AWS clients initialized');
    } else {
      logger.warn('No AWS credentials found, running in demo mode');
    }

    // Initialize GitHub client
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      this.octokit = new Octokit({ auth: githubToken });
      logger.info('GitHub client initialized');
    }

    // Start monitoring
    this.startMonitoring();
    this.startCostTracking();
  }

  /**
   * Start monitoring agents
   */
  private startMonitoring(): void {
    // Initial discovery
    this.discoverAgents();
    
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.discoverAgents();
      this.updateAgentMetrics();
    }, 30000);
  }

  /**
   * Start tracking costs
   */
  private startCostTracking(): void {
    // Update costs every 5 minutes
    this.costUpdateInterval = setInterval(() => {
      this.updateAgentCosts();
    }, 300000);
    
    // Initial cost update
    this.updateAgentCosts();
  }

  /**
   * Discover all agents across platforms
   */
  async discoverAgents(): Promise<void> {
    const agents: Agent[] = [];

    // Discover EC2 agents
    if (this.ec2Client) {
      const ec2Agents = await this.discoverEC2Agents();
      agents.push(...ec2Agents);
    }

    // Discover ECS agents
    if (this.ecsClient) {
      const ecsAgents = await this.discoverECSAgents();
      agents.push(...ecsAgents);
    }

    // Discover Batch agents
    if (this.batchClient) {
      const batchAgents = await this.discoverBatchAgents();
      agents.push(...batchAgents);
    }

    // If no AWS agents, add demo agents
    if (agents.length === 0) {
      agents.push(...this.getDemoAgents());
    }

    // Update agent map
    for (const agent of agents) {
      const existing = this.agents.get(agent.id);
      if (existing) {
        // Preserve conversation history and current task
        agent.currentTask = existing.currentTask;
      }
      this.agents.set(agent.id, agent);
    }

    // Emit update event
    this.emit('agents-updated', Array.from(this.agents.values()));
    this.broadcastToWebSockets('agents-updated', Array.from(this.agents.values()));
  }

  /**
   * Discover EC2 agents
   */
  private async discoverEC2Agents(): Promise<Agent[]> {
    if (!this.ec2Client) return [];

    try {
      const command = new DescribeInstancesCommand({
        Filters: [
          { Name: 'tag:Type', Values: ['na-agent'] },
          { Name: 'instance-state-name', Values: ['running'] }
        ]
      });

      const response = await this.ec2Client.send(command);
      const agents: Agent[] = [];

      for (const reservation of response.Reservations || []) {
        for (const instance of reservation.Instances || []) {
          const agentType = instance.Tags?.find(t => t.Key === 'AgentType')?.Value;
          const agentId = instance.Tags?.find(t => t.Key === 'AgentId')?.Value || instance.InstanceId;
          const agentName = instance.Tags?.find(t => t.Key === 'Name')?.Value;

          if (agentType && agentId) {
            agents.push({
              id: agentId,
              name: agentName || `${agentType}-agent`,
              type: agentType as any,
              status: 'idle',
              platform: 'ec2',
              instanceId: instance.InstanceId,
              lastSeen: new Date(),
              capabilities: this.getAgentCapabilities(agentType),
              metrics: {
                tasksCompleted: 0,
                successRate: 0,
                averageResponseTime: 0
              }
            });
          }
        }
      }

      return agents;
    } catch (error) {
      logger.error('Error discovering EC2 agents:', error);
      return [];
    }
  }

  /**
   * Discover ECS agents
   */
  private async discoverECSAgents(): Promise<Agent[]> {
    if (!this.ecsClient) return [];

    try {
      const listCommand = new ListTasksCommand({
        cluster: 'na-agents-cluster',
        desiredStatus: 'RUNNING'
      });

      const listResponse = await this.ecsClient.send(listCommand);
      
      if (!listResponse.taskArns || listResponse.taskArns.length === 0) {
        return [];
      }

      const describeCommand = new DescribeTasksCommand({
        cluster: 'na-agents-cluster',
        tasks: listResponse.taskArns
      });

      const describeResponse = await this.ecsClient.send(describeCommand);
      const agents: Agent[] = [];

      for (const task of describeResponse.tasks || []) {
        const agentType = task.overrides?.containerOverrides?.[0]?.environment?.find(
          e => e.name === 'AGENT_TYPE'
        )?.value;

        if (agentType && task.taskArn) {
          const agentId = `ecs-${task.taskArn.split('/').pop()}`;
          agents.push({
            id: agentId,
            name: `${agentType}-agent`,
            type: agentType as any,
            status: task.lastStatus === 'RUNNING' ? 'idle' : 'offline',
            platform: 'ecs',
            taskArn: task.taskArn,
            lastSeen: new Date(),
            capabilities: this.getAgentCapabilities(agentType),
            metrics: {
              tasksCompleted: 0,
              successRate: 0,
              averageResponseTime: 0
            }
          });
        }
      }

      return agents;
    } catch (error) {
      logger.error('Error discovering ECS agents:', error);
      return [];
    }
  }

  /**
   * Discover Batch agents
   */
  private async discoverBatchAgents(): Promise<Agent[]> {
    if (!this.batchClient) return [];

    try {
      const command = new ListJobsCommand({
        jobQueue: 'na-agents-queue',
        jobStatus: 'RUNNING'
      });

      const response = await this.batchClient.send(command);
      const agents: Agent[] = [];

      for (const job of response.jobSummaryList || []) {
        const agentId = `batch-${job.jobId}`;
        const agentType = job.jobName?.match(/na-agent-(\w+)/)?.[1];

        if (agentType) {
          agents.push({
            id: agentId,
            name: `${agentType}-agent`,
            type: agentType as any,
            status: 'busy',
            platform: 'batch',
            jobId: job.jobId,
            lastSeen: new Date(),
            currentTask: job.jobName,
            capabilities: this.getAgentCapabilities(agentType),
            metrics: {
              tasksCompleted: 0,
              successRate: 0,
              averageResponseTime: 0
            }
          });
        }
      }

      return agents;
    } catch (error) {
      logger.error('Error discovering Batch agents:', error);
      return [];
    }
  }

  /**
   * Get demo agents for testing
   */
  private getDemoAgents(): Agent[] {
    return [
      {
        id: 'demo-architect-1',
        name: 'Architecture Agent',
        type: 'architect',
        status: 'idle',
        platform: 'local',
        lastSeen: new Date(),
        capabilities: ['system-design', 'api-design', 'database-design'],
        metrics: {
          tasksCompleted: 42,
          successRate: 0.92,
          averageResponseTime: 25,
          cpuUsage: 15,
          memoryUsage: 30
        },
        cost: {
          hourly: 0.05,
          daily: 1.20,
          monthly: 36.00
        }
      },
      {
        id: 'demo-developer-1',
        name: 'Developer Agent',
        type: 'developer',
        status: 'busy',
        platform: 'local',
        lastSeen: new Date(),
        currentTask: 'Implementing user authentication',
        capabilities: ['coding', 'debugging', 'refactoring', 'testing'],
        metrics: {
          tasksCompleted: 156,
          successRate: 0.88,
          averageResponseTime: 35,
          cpuUsage: 45,
          memoryUsage: 60
        },
        cost: {
          hourly: 0.08,
          daily: 1.92,
          monthly: 57.60
        }
      },
      {
        id: 'demo-devops-1',
        name: 'DevOps Agent',
        type: 'devops',
        status: 'idle',
        platform: 'local',
        lastSeen: new Date(),
        capabilities: ['deployment', 'infrastructure', 'monitoring', 'ci-cd'],
        metrics: {
          tasksCompleted: 78,
          successRate: 0.95,
          averageResponseTime: 40,
          cpuUsage: 20,
          memoryUsage: 35
        },
        cost: {
          hourly: 0.10,
          daily: 2.40,
          monthly: 72.00
        }
      }
    ];
  }

  /**
   * Update agent metrics from CloudWatch
   */
  async updateAgentMetrics(): Promise<void> {
    if (!this.cloudWatchClient) return;

    for (const agent of this.agents.values()) {
      if (agent.platform === 'ec2' && agent.instanceId) {
        try {
          // Get CPU utilization
          const cpuCommand = new GetMetricStatisticsCommand({
            Namespace: 'AWS/EC2',
            MetricName: 'CPUUtilization',
            Dimensions: [
              { Name: 'InstanceId', Value: agent.instanceId }
            ],
            StartTime: new Date(Date.now() - 300000), // 5 minutes ago
            EndTime: new Date(),
            Period: 300,
            Statistics: ['Average']
          });

          const cpuResponse = await this.cloudWatchClient.send(cpuCommand);
          if (cpuResponse.Datapoints && cpuResponse.Datapoints.length > 0) {
            agent.metrics.cpuUsage = cpuResponse.Datapoints[0].Average || 0;
          }

          // Update status based on CPU usage
          if (agent.metrics.cpuUsage > 70) {
            agent.status = 'busy';
          } else if (agent.metrics.cpuUsage < 20) {
            agent.status = 'idle';
          }
        } catch (error) {
          logger.error(`Error updating metrics for agent ${agent.id}:`, error);
        }
      }
    }

    this.emit('metrics-updated', Array.from(this.agents.values()));
  }

  /**
   * Update agent costs
   */
  async updateAgentCosts(): Promise<void> {
    if (!this.costExplorerClient) return;

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

      const command = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: startDate.toISOString().split('T')[0],
          End: endDate.toISOString().split('T')[0]
        },
        Granularity: 'DAILY',
        Metrics: ['BlendedCost'],
        GroupBy: [
          { Type: 'DIMENSION', Key: 'INSTANCE_TYPE' }
        ]
      });

      const response = await this.costExplorerClient.send(command);
      
      // Update costs for each agent based on instance type
      // This is simplified - in production you'd map specific instances to costs
      for (const agent of this.agents.values()) {
        if (agent.platform === 'ec2') {
          agent.cost = {
            hourly: 0.05,
            daily: 1.20,
            monthly: 36.00
          };
        } else if (agent.platform === 'ecs') {
          agent.cost = {
            hourly: 0.03,
            daily: 0.72,
            monthly: 21.60
          };
        } else if (agent.platform === 'batch') {
          agent.cost = {
            hourly: 0.02,
            daily: 0.48,
            monthly: 14.40
          };
        }
      }

      this.emit('costs-updated', Array.from(this.agents.values()));
    } catch (error) {
      logger.error('Error updating costs:', error);
    }
  }

  /**
   * Send message to an agent
   */
  async sendMessage(agentId: string, message: string, context?: any): Promise<AgentMessage> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const userMessage: AgentMessage = {
      id: `msg-${Date.now()}`,
      agentId,
      type: 'user',
      content: message,
      timestamp: new Date(),
      metadata: context
    };

    // Store message in conversation history
    const conversation = this.conversations.get(agentId) || [];
    conversation.push(userMessage);
    this.conversations.set(agentId, conversation);

    // Update agent status
    agent.status = 'busy';
    agent.currentTask = message;

    // Send message to agent based on platform
    let response: string;
    switch (agent.platform) {
      case 'ec2':
        response = await this.sendEC2Message(agent, message, context);
        break;
      case 'ecs':
        response = await this.sendECSMessage(agent, message, context);
        break;
      case 'batch':
        response = await this.sendBatchMessage(agent, message, context);
        break;
      default:
        // Simulate agent response for demo
        response = await this.simulateAgentResponse(agent, message);
    }

    const agentMessage: AgentMessage = {
      id: `msg-${Date.now() + 1}`,
      agentId,
      type: 'agent',
      content: response,
      timestamp: new Date()
    };

    conversation.push(agentMessage);
    
    // Update agent status
    setTimeout(() => {
      agent.status = 'idle';
      agent.currentTask = undefined;
      this.emit('agent-idle', agent);
    }, 5000);

    this.emit('message', agentMessage);
    this.broadcastToWebSockets('message', { conversation: agentId, message: agentMessage });

    return agentMessage;
  }

  /**
   * Send message to EC2 agent via SSM
   */
  private async sendEC2Message(agent: Agent, message: string, context?: any): Promise<string> {
    if (!this.ssmClient || !agent.instanceId) {
      return 'Cannot communicate with EC2 agent - SSM not available';
    }

    try {
      const command = new SendCommandCommand({
        InstanceIds: [agent.instanceId],
        DocumentName: 'AWS-RunShellScript',
        Parameters: {
          commands: [
            `echo '${JSON.stringify({ message, context })}' | python3 /opt/agent/process_message.py`
          ]
        },
        TimeoutSeconds: 60
      });

      const response = await this.ssmClient.send(command);
      const commandId = response.Command?.CommandId;

      if (commandId) {
        // Wait for command to complete
        await new Promise(resolve => setTimeout(resolve, 2000));

        const invocationCommand = new GetCommandInvocationCommand({
          CommandId: commandId,
          InstanceId: agent.instanceId
        });

        const invocationResponse = await this.ssmClient.send(invocationCommand);
        return invocationResponse.StandardOutputContent || 'Processing request...';
      }
    } catch (error) {
      logger.error('Error sending message to EC2 agent:', error);
    }

    return `EC2 agent received: "${message}"`;
  }

  /**
   * Send message to ECS agent
   */
  private async sendECSMessage(agent: Agent, message: string, context?: any): Promise<string> {
    // In production, communicate with ECS task via API or message queue
    return `ECS agent processing: "${message}"`;
  }

  /**
   * Send message to Batch agent
   */
  private async sendBatchMessage(agent: Agent, message: string, context?: any): Promise<string> {
    // Batch jobs are typically not interactive
    return `Batch job queued for: "${message}"`;
  }

  /**
   * Simulate agent response for demo mode
   */
  private async simulateAgentResponse(agent: Agent, message: string): Promise<string> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const responses: Record<string, string[]> = {
      architect: [
        `I've analyzed the requirements for "${message}". Here's my architectural recommendation...`,
        `Based on the system design principles, I suggest implementing this with a microservices approach...`,
        `The architecture for this should include: API Gateway, Lambda functions, and DynamoDB...`
      ],
      developer: [
        `I'll start implementing "${message}" right away. Setting up the development environment...`,
        `Code implementation in progress. I've created the necessary modules and tests...`,
        `Feature "${message}" has been implemented with full test coverage...`
      ],
      devops: [
        `Preparing deployment pipeline for "${message}". Configuring CI/CD...`,
        `Infrastructure provisioning complete. The service is now deployed to staging...`,
        `Monitoring and alerts have been set up for the new deployment...`
      ],
      qa: [
        `Starting comprehensive testing for "${message}". Running test suites...`,
        `Test results: 42 passed, 0 failed. All quality checks passed...`,
        `Performance testing complete. The feature meets all acceptance criteria...`
      ],
      manager: [
        `I've created tasks for "${message}" and assigned them to the appropriate agents...`,
        `Project status update: The feature is 75% complete. Estimated completion in 2 hours...`,
        `All team members have been notified about the new requirements...`
      ]
    };

    const agentResponses = responses[agent.type] || [`Processing "${message}"...`];
    return agentResponses[Math.floor(Math.random() * agentResponses.length)];
  }

  /**
   * Submit a task to an agent
   */
  async submitTask(request: TaskRequest): Promise<string> {
    const agent = this.agents.get(request.agentId);
    if (!agent) {
      throw new Error(`Agent ${request.agentId} not found`);
    }

    // Update agent status
    agent.status = 'busy';
    agent.currentTask = request.task;

    let taskId: string;

    // Submit based on platform
    switch (agent.platform) {
      case 'batch':
        taskId = await this.submitBatchTask(agent, request);
        break;
      case 'ecs':
        taskId = await this.submitECSTask(agent, request);
        break;
      case 'ec2':
        taskId = await this.submitEC2Task(agent, request);
        break;
      default:
        taskId = `task-${Date.now()}`;
        // Simulate task completion for demo
        setTimeout(() => {
          agent.status = 'idle';
          agent.currentTask = undefined;
          agent.metrics.tasksCompleted++;
          this.emit('task-completed', { agentId: agent.id, taskId, task: request.task });
        }, 5000 + Math.random() * 10000);
    }

    this.emit('task-submitted', { agentId: agent.id, taskId, task: request.task });
    this.broadcastToWebSockets('task-submitted', { agentId: agent.id, taskId, task: request.task });

    return taskId;
  }

  /**
   * Submit task to Batch
   */
  private async submitBatchTask(agent: Agent, request: TaskRequest): Promise<string> {
    if (!this.batchClient) {
      return `batch-demo-${Date.now()}`;
    }

    const command = new SubmitJobCommand({
      jobName: `task-${Date.now()}`,
      jobDefinition: `na-agent-${agent.type}`,
      jobQueue: request.priority === 'high' ? 'high-priority' : 'default',
      parameters: {
        task: request.task,
        context: JSON.stringify(request.context)
      },
      timeout: {
        attemptDurationSeconds: request.timeout || 3600
      }
    });

    const response = await this.batchClient.send(command);
    return response.jobId || 'unknown';
  }

  /**
   * Submit task to ECS
   */
  private async submitECSTask(agent: Agent, request: TaskRequest): Promise<string> {
    if (!this.ecsClient) {
      return `ecs-demo-${Date.now()}`;
    }

    const command = new RunTaskCommand({
      cluster: 'na-agents-cluster',
      taskDefinition: `na-agent-${agent.type}`,
      overrides: {
        containerOverrides: [{
          name: 'agent',
          environment: [
            { name: 'TASK', value: request.task },
            { name: 'CONTEXT', value: JSON.stringify(request.context) }
          ]
        }]
      }
    });

    const response = await this.ecsClient.send(command);
    return response.tasks?.[0]?.taskArn || 'unknown';
  }

  /**
   * Submit task to EC2 via SSM
   */
  private async submitEC2Task(agent: Agent, request: TaskRequest): Promise<string> {
    if (!this.ssmClient || !agent.instanceId) {
      return `ec2-demo-${Date.now()}`;
    }

    const command = new SendCommandCommand({
      InstanceIds: [agent.instanceId],
      DocumentName: 'AWS-RunShellScript',
      Parameters: {
        commands: [
          `echo '${JSON.stringify(request)}' | python3 /opt/agent/process_task.py`
        ]
      },
      TimeoutSeconds: request.timeout || 3600
    });

    const response = await this.ssmClient.send(command);
    return response.Command?.CommandId || 'unknown';
  }

  /**
   * Handle GitHub webhook events
   */
  async handleGitHubWebhook(event: string, payload: any): Promise<void> {
    logger.info(`Received GitHub event: ${event}`);

    switch (event) {
      case 'issues':
        await this.handleIssueEvent(payload);
        break;
      case 'issue_comment':
        await this.handleIssueComment(payload);
        break;
      case 'pull_request':
        await this.handlePullRequest(payload);
        break;
    }
  }

  /**
   * Handle GitHub issue events
   */
  private async handleIssueEvent(payload: any): Promise<void> {
    const { action, issue, repository } = payload;

    if (action === 'opened' || action === 'reopened') {
      // Store issue
      this.issues.set(issue.number, {
        number: issue.number,
        title: issue.title,
        body: issue.body,
        labels: issue.labels.map((l: any) => l.name),
        assignee: issue.assignee?.login,
        state: issue.state,
        repository: `${repository.owner.login}/${repository.name}`,
        createdAt: new Date(issue.created_at),
        updatedAt: new Date(issue.updated_at)
      });

      // Determine which agent should handle this
      const agentType = this.determineAgentForIssue(issue);
      const availableAgent = this.findAvailableAgent(agentType);

      if (availableAgent) {
        // Assign issue to agent
        const task = `Handle GitHub issue #${issue.number}: ${issue.title}`;
        await this.submitTask({
          agentId: availableAgent.id,
          task,
          context: {
            issueNumber: issue.number,
            repository: `${repository.owner.login}/${repository.name}`,
            labels: issue.labels.map((l: any) => l.name)
          },
          priority: this.getIssuePriority(issue),
          repository: `${repository.owner.login}/${repository.name}`,
          issueNumber: issue.number
        });

        // Add comment to issue
        if (this.octokit) {
          await this.octokit.issues.createComment({
            owner: repository.owner.login,
            repo: repository.name,
            issue_number: issue.number,
            body: `🤖 Issue assigned to **${availableAgent.name}** (${agentType} agent)\nStatus: Processing...`
          });
        }
      }
    }

    this.emit('github-issue', { action, issue });
    this.broadcastToWebSockets('github-issue', { action, issue });
  }

  /**
   * Handle issue comments
   */
  private async handleIssueComment(payload: any): Promise<void> {
    const { action, comment, issue } = payload;
    
    if (action === 'created' && comment.body.startsWith('/agent')) {
      const command = comment.body.split(' ')[1];
      
      switch (command) {
        case 'status':
          // Report agent status for this issue
          break;
        case 'reassign':
          // Reassign to different agent
          break;
      }
    }
  }

  /**
   * Handle pull request events
   */
  private async handlePullRequest(payload: any): Promise<void> {
    const { action, pull_request } = payload;
    
    if (action === 'opened') {
      // Assign to QA agent for review
      const qaAgent = this.findAvailableAgent('qa');
      if (qaAgent) {
        await this.submitTask({
          agentId: qaAgent.id,
          task: `Review PR #${pull_request.number}: ${pull_request.title}`,
          priority: 'high'
        });
      }
    }
  }

  /**
   * Determine which type of agent should handle an issue
   */
  private determineAgentForIssue(issue: any): Agent['type'] {
    const labels = issue.labels.map((l: any) => l.name.toLowerCase());
    const title = issue.title.toLowerCase();
    const body = (issue.body || '').toLowerCase();

    if (labels.includes('bug') || labels.includes('fix')) {
      return 'developer';
    }
    if (labels.includes('architecture') || labels.includes('design')) {
      return 'architect';
    }
    if (labels.includes('deployment') || labels.includes('infrastructure')) {
      return 'devops';
    }
    if (labels.includes('testing') || labels.includes('qa')) {
      return 'qa';
    }
    
    // Check content
    if (title.includes('deploy') || body.includes('deployment')) {
      return 'devops';
    }
    if (title.includes('test') || body.includes('testing')) {
      return 'qa';
    }
    if (title.includes('design') || body.includes('architecture')) {
      return 'architect';
    }

    return 'manager'; // Default to manager for triage
  }

  /**
   * Get issue priority based on labels
   */
  private getIssuePriority(issue: any): 'high' | 'medium' | 'low' {
    const labels = issue.labels.map((l: any) => l.name.toLowerCase());
    
    if (labels.includes('critical') || labels.includes('urgent')) {
      return 'high';
    }
    if (labels.includes('high-priority')) {
      return 'high';
    }
    if (labels.includes('low-priority')) {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * Find an available agent of specific type
   */
  private findAvailableAgent(type: Agent['type']): Agent | undefined {
    const agents = Array.from(this.agents.values());
    return agents.find(a => a.type === type && a.status === 'idle');
  }

  /**
   * Get agent capabilities
   */
  private getAgentCapabilities(agentType: string): string[] {
    const capabilities: Record<string, string[]> = {
      architect: ['system-design', 'api-design', 'database-design', 'documentation'],
      developer: ['coding', 'debugging', 'refactoring', 'testing', 'code-review'],
      devops: ['deployment', 'infrastructure', 'monitoring', 'ci-cd', 'aws-management'],
      qa: ['testing', 'test-automation', 'performance-testing', 'security-testing'],
      manager: ['task-assignment', 'progress-tracking', 'reporting', 'coordination']
    };

    return capabilities[agentType] || [];
  }

  /**
   * WebSocket connection handler
   */
  handleWebSocketConnection(ws: WebSocket, clientId: string): void {
    this.websockets.set(clientId, ws);

    // Send initial data
    ws.send(JSON.stringify({
      type: 'connected',
      data: {
        agents: Array.from(this.agents.values()),
        issues: Array.from(this.issues.values())
      }
    }));

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'send-message':
            const response = await this.sendMessage(
              message.agentId,
              message.content,
              message.context
            );
            ws.send(JSON.stringify({
              type: 'message-response',
              data: response
            }));
            break;
          
          case 'submit-task':
            const taskId = await this.submitTask(message.request);
            ws.send(JSON.stringify({
              type: 'task-submitted',
              data: { taskId }
            }));
            break;

          case 'get-conversation':
            const conversation = this.conversations.get(message.agentId) || [];
            ws.send(JSON.stringify({
              type: 'conversation',
              data: conversation
            }));
            break;

          case 'get-agents':
            ws.send(JSON.stringify({
              type: 'agents',
              data: Array.from(this.agents.values())
            }));
            break;
        }
      } catch (error) {
        logger.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    });

    ws.on('close', () => {
      this.websockets.delete(clientId);
    });
  }

  /**
   * Broadcast to all WebSocket clients
   */
  private broadcastToWebSockets(type: string, data: any): void {
    const message = JSON.stringify({ type, data });
    
    this.websockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Get all agents
   */
  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get specific agent
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get conversation history
   */
  getConversation(agentId: string): AgentMessage[] {
    return this.conversations.get(agentId) || [];
  }

  /**
   * Get all issues
   */
  getIssues(): GitHubIssue[] {
    return Array.from(this.issues.values());
  }

  /**
   * Get dashboard statistics
   */
  getStatistics(): any {
    const agents = Array.from(this.agents.values());
    const issues = Array.from(this.issues.values());

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'busy').length,
      idleAgents: agents.filter(a => a.status === 'idle').length,
      offlineAgents: agents.filter(a => a.status === 'offline').length,
      totalIssues: issues.length,
      openIssues: issues.filter(i => i.state === 'open').length,
      closedIssues: issues.filter(i => i.state === 'closed').length,
      totalTasksCompleted: agents.reduce((sum, a) => sum + a.metrics.tasksCompleted, 0),
      averageSuccessRate: agents.reduce((sum, a) => sum + a.metrics.successRate, 0) / agents.length || 0,
      totalCost: {
        hourly: agents.reduce((sum, a) => sum + (a.cost?.hourly || 0), 0),
        daily: agents.reduce((sum, a) => sum + (a.cost?.daily || 0), 0),
        monthly: agents.reduce((sum, a) => sum + (a.cost?.monthly || 0), 0)
      }
    };
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.costUpdateInterval) {
      clearInterval(this.costUpdateInterval);
    }
    
    this.websockets.forEach(ws => ws.close());
    this.websockets.clear();
  }
}

export default UnifiedAgentService;