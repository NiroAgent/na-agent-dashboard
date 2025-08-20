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

export interface SystemInfo {
  cpu: number;
  cpuCores: number;
  cpuHistory?: number[];
  memory: number;
  memoryUsed: number;
  memoryTotal: number;
  memoryHistory?: number[];
  disk?: {
    usage: number;
    used: number;
    free: number;
    total: number;
  };
  platform: string;
  arch: string;
  uptime: number;
  loadAvg: number[];
  processes: number;
}

export interface TerminalData {
  agentId: string;
  data: string;
  timestamp: Date;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: Array<{
    name: string;
    color: string;
  }>;
  assignee?: {
    login: string;
    avatar_url?: string;
  };
  created_at: string;
  updated_at: string;
  repository: string;
  milestone?: {
    title: string;
    number: number;
  };
}

export interface AgentTask {
  id: string;
  agentId: string;
  issueNumber?: number;
  type: 'test' | 'deploy' | 'monitor' | 'remediate';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  output?: string;
  error?: string;
}

export interface DashboardConfig {
  refreshInterval: number;
  maxTerminalHistory: number;
  showSystemMetrics: boolean;
  showTerminals: boolean;
  showIssues: boolean;
  theme: 'dark' | 'light';
}