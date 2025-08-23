import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface Agent {
  id: string;
  name: string;
  description: string;
  script: string;
  args: string[];
  status: 'running' | 'stopped' | 'error' | 'starting';
  pid?: number;
  startTime?: Date;
  lastError?: string;
  cpu?: number;
  memory?: number;
  repo?: string;
  service?: string;
  environment?: string;
}

export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private projectsDir = 'E:\\Projects\\NiroAgent';

  constructor() {
    this.initializeAgentDefinitions();
  }

  private initializeAgentDefinitions() {
    // Define real available agents discovered in the filesystem
    const agentConfigs: Agent[] = [
      {
        id: 'qa-agent-real',
        name: 'QA Agent (Real)',
        description: 'AI-powered quality assurance testing with real execution',
        script: 'na-business-service\\ai-agent-deployment\\ai-qa-agent-real.py',
        args: ['--live'],
        status: 'stopped',
        repo: 'na-business-service',
        service: 'qa'
      },
      {
        id: 'developer-agent-real',
        name: 'Developer Agent (Real)',
        description: 'AI-powered development assistant with real execution',
        script: 'na-business-service\\ai-agent-deployment\\ai-developer-agent-real.py',
        args: ['--live'],
        status: 'stopped',
        repo: 'na-business-service',
        service: 'developer'
      },
      {
        id: 'orchestrator-agent',
        name: 'Agent Orchestrator',
        description: 'Coordinates and manages other agents',
        script: 'na-autonomous-system\\orchestrator-agent.py',
        args: ['--monitor'],
        status: 'stopped',
        repo: 'na-autonomous-system',
        service: 'orchestrator'
      },
      {
        id: 'cost-monitor',
        name: 'Cost Monitor Agent',
        description: 'Monitors and optimizes system costs',
        script: 'na-autonomous-system\\cost-optimized-agent-deployment.py',
        args: ['--monitor'],
        status: 'stopped',
        repo: 'na-autonomous-system',
        service: 'cost-monitor'
      },
      {
        id: 'github-agent',
        name: 'GitHub Integration Agent',
        description: 'Handles GitHub issues and PR management',
        script: 'na-autonomous-system\\github-agent-dispatcher.py',
        args: ['--continuous'],
        status: 'stopped',
        repo: 'na-autonomous-system',
        service: 'github'
      }
    ];

    agentConfigs.forEach(agent => {
      this.agents.set(agent.id, agent);
    });
  }

  async initializeAgents() {
    // Check which agents are already running
    for (const agent of this.agents.values()) {
      // Check if process is running
      // This would check actual system processes
      agent.status = 'stopped';
    }
  }

  async startAgent(agentId: string): Promise<{ success: boolean; message: string }> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { success: false, message: 'Agent not found' };
    }

    if (agent.status === 'running') {
      return { success: false, message: 'Agent is already running' };
    }

    try {
      agent.status = 'starting';
      
      const scriptPath = path.join(this.projectsDir, agent.script);
      
      // Check if script exists
      if (!fs.existsSync(scriptPath)) {
        agent.status = 'error';
        agent.lastError = `Script not found: ${scriptPath}`;
        return { success: false, message: agent.lastError };
      }

      // Spawn Python process
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const proc = spawn(pythonCmd, [scriptPath, ...agent.args], {
        cwd: this.projectsDir,
        env: { ...process.env },
        shell: true
      });

      proc.on('error', (error) => {
        agent.status = 'error';
        agent.lastError = error.message;
        console.error(`Agent ${agentId} error:`, error);
      });

      proc.on('exit', (code) => {
        agent.status = 'stopped';
        if (code !== 0) {
          agent.lastError = `Process exited with code ${code}`;
        }
        this.processes.delete(agentId);
      });

      // Store process
      this.processes.set(agentId, proc);
      
      agent.status = 'running';
      agent.pid = proc.pid;
      agent.startTime = new Date();
      agent.lastError = undefined;

      return { success: true, message: `Agent ${agent.name} started` };

    } catch (error) {
      agent.status = 'error';
      agent.lastError = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: agent.lastError };
    }
  }

  async stopAgent(agentId: string): Promise<{ success: boolean; message: string }> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { success: false, message: 'Agent not found' };
    }

    const proc = this.processes.get(agentId);
    if (!proc) {
      agent.status = 'stopped';
      return { success: false, message: 'Agent process not found' };
    }

    try {
      // Kill the process
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', proc.pid!.toString(), '/f', '/t']);
      } else {
        proc.kill('SIGTERM');
      }

      agent.status = 'stopped';
      agent.pid = undefined;
      agent.startTime = undefined;
      this.processes.delete(agentId);

      return { success: true, message: `Agent ${agent.name} stopped` };

    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to stop agent' 
      };
    }
  }

  async restartAgent(agentId: string) {
    await this.stopAgent(agentId);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    return this.startAgent(agentId);
  }

  async stopAllAgents() {
    const promises = Array.from(this.agents.keys()).map(id => this.stopAgent(id));
    await Promise.all(promises);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getStatus(): { running: number; stopped: number; error: number } {
    const agents = this.getAllAgents();
    return {
      running: agents.filter(a => a.status === 'running').length,
      stopped: agents.filter(a => a.status === 'stopped').length,
      error: agents.filter(a => a.status === 'error').length
    };
  }

  getProcess(agentId: string): ChildProcess | undefined {
    return this.processes.get(agentId);
  }
}