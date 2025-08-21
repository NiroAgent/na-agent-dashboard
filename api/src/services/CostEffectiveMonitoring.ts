import { Express } from 'express';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

interface AgentHeartbeat {
  agentId: string;
  timestamp: Date;
  status: 'running' | 'idle' | 'busy' | 'error';
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIn: number;
    networkOut: number;
    tasksCompleted: number;
    currentTasks: number;
  };
  cost?: {
    hourly: number;
    daily: number;
    monthly: number;
  };
  metadata?: {
    instanceId?: string;
    taskArn?: string;
    version?: string;
    capabilities?: string[];
  };
}

/**
 * Cost-Effective Agent Monitoring
 * Agents report their own metrics instead of expensive CloudWatch polling
 * Cost: $0/month vs $200/month
 */
export class CostEffectiveMonitoring {
  private heartbeats = new Map<string, AgentHeartbeat>();
  private heartbeatTimeout = 60000; // 1 minute timeout

  constructor(private app: Express) {
    this.setupRoutes();
    this.startCleanupTimer();
  }

  private setupRoutes() {
    // Agents POST their metrics here
    this.app.post('/api/agents/:agentId/heartbeat', (req, res) => {
      try {
        const { agentId } = req.params;
        const heartbeat: AgentHeartbeat = {
          agentId,
          timestamp: new Date(),
          status: req.body.status || 'running',
          metrics: {
            cpuUsage: req.body.metrics?.cpuUsage || 0,
            memoryUsage: req.body.metrics?.memoryUsage || 0,
            diskUsage: req.body.metrics?.diskUsage || 0,
            networkIn: req.body.metrics?.networkIn || 0,
            networkOut: req.body.metrics?.networkOut || 0,
            tasksCompleted: req.body.metrics?.tasksCompleted || 0,
            currentTasks: req.body.metrics?.currentTasks || 0,
          },
          cost: req.body.cost,
          metadata: req.body.metadata
        };

        this.heartbeats.set(agentId, heartbeat);
        logger.info(`Heartbeat received from agent ${agentId}`, { 
          status: heartbeat.status,
          cpu: heartbeat.metrics.cpuUsage,
          tasks: heartbeat.metrics.currentTasks
        });

        res.json({ 
          success: true, 
          message: 'Heartbeat recorded',
          nextHeartbeat: Date.now() + 30000 // Next expected in 30 seconds
        });

      } catch (error) {
        logger.error('Error processing heartbeat:', error);
        res.status(500).json({ error: 'Failed to process heartbeat' });
      }
    });

    // Get all active agents (replaces expensive AWS discovery)
    this.app.get('/api/agents/active', (req, res) => {
      const activeAgents = Array.from(this.heartbeats.values())
        .filter(hb => Date.now() - hb.timestamp.getTime() < this.heartbeatTimeout)
        .map(hb => ({
          id: hb.agentId,
          name: `Agent ${hb.agentId}`,
          status: hb.status,
          lastSeen: hb.timestamp,
          metrics: hb.metrics,
          cost: hb.cost,
          metadata: hb.metadata
        }));

      res.json({
        success: true,
        agents: activeAgents,
        totalActive: activeAgents.length,
        lastUpdated: new Date()
      });
    });

    // Lightweight AWS discovery for basic instance info only
    this.app.get('/api/aws/instances/basic', async (req, res) => {
      try {
        // Only get basic instance info (free API calls)
        const instances = await this.getBasicInstanceInfo();
        res.json({ success: true, instances });
      } catch (error) {
        logger.error('Error getting basic instance info:', error);
        res.status(500).json({ error: 'Failed to get instance info' });
      }
    });
  }

  private async getBasicInstanceInfo() {
    // This uses free AWS API calls - no CloudWatch metrics
    // Just gets instance ID, state, launch time from EC2 DescribeInstances
    try {
      const AWS = require('aws-sdk');
      const ec2 = new AWS.EC2();
      
      const result = await ec2.describeInstances({
        Filters: [
          { Name: 'tag:Type', Values: ['na-agent'] },
          { Name: 'instance-state-name', Values: ['running', 'stopped'] }
        ]
      }).promise();

      const instances = [];
      for (const reservation of result.Reservations || []) {
        for (const instance of reservation.Instances || []) {
          instances.push({
            instanceId: instance.InstanceId,
            state: instance.State?.Name,
            launchTime: instance.LaunchTime,
            instanceType: instance.InstanceType,
            tags: instance.Tags
          });
        }
      }

      return instances;
    } catch (error) {
      logger.error('Error getting basic instance info:', error);
      return [];
    }
  }

  private startCleanupTimer() {
    // Clean up stale heartbeats every 2 minutes
    setInterval(() => {
      const now = Date.now();
      const staleAgents = [];
      
      for (const [agentId, heartbeat] of this.heartbeats) {
        if (now - heartbeat.timestamp.getTime() > this.heartbeatTimeout * 2) {
          this.heartbeats.delete(agentId);
          staleAgents.push(agentId);
        }
      }

      if (staleAgents.length > 0) {
        logger.info(`Cleaned up ${staleAgents.length} stale agent heartbeats:`, staleAgents);
      }
    }, 120000); // Every 2 minutes
  }

  // Method to get current agent stats
  public getAgentStats() {
    const agents = Array.from(this.heartbeats.values());
    const activeCount = agents.filter(a => 
      Date.now() - a.timestamp.getTime() < this.heartbeatTimeout
    ).length;

    return {
      totalAgents: agents.length,
      activeAgents: activeCount,
      avgCpuUsage: agents.reduce((sum, a) => sum + a.metrics.cpuUsage, 0) / agents.length || 0,
      totalTasks: agents.reduce((sum, a) => sum + a.metrics.currentTasks, 0),
      totalCost: agents.reduce((sum, a) => sum + (a.cost?.hourly || 0), 0)
    };
  }
}

export default CostEffectiveMonitoring;
