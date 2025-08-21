/**
 * Agent Configuration with AI Provider Options
 * Supports both Amazon Bedrock and GitHub Copilot CLI
 */

export interface AgentAIConfig {
  provider: 'bedrock' | 'github-copilot' | 'anthropic-direct';
  model?: string;
  maxTokens?: number;
  temperature?: number;
  costPerRequest?: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  type: string;
  aiConfig: AgentAIConfig;
  capabilities: string[];
  platform: string;
  priority: number;
}

// Agent configurations with AI provider preferences
export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  // Coordinator/Chat agents use Bedrock (better for conversation)
  'coordinator-agent': {
    id: 'coordinator-1',
    name: 'Coordinator Agent',
    type: 'coordinator',
    aiConfig: {
      provider: 'bedrock',
      model: 'anthropic.claude-3-sonnet-20240229-v1:0',
      maxTokens: 4096,
      temperature: 0.7,
      costPerRequest: 0.015 // Bedrock pricing
    },
    capabilities: ['oversight', 'coordination', 'planning', 'interrupt-handling'],
    platform: 'bedrock',
    priority: 1
  },
  
  'chat-voice-agent': {
    id: 'chat-voice-1',
    name: 'Chat/Voice Interface Agent',
    type: 'chat-voice',
    aiConfig: {
      provider: 'bedrock',
      model: 'anthropic.claude-3-sonnet-20240229-v1:0',
      maxTokens: 2048,
      temperature: 0.8,
      costPerRequest: 0.010
    },
    capabilities: ['chat', 'voice', 'nlp', 'real-time-response'],
    platform: 'bedrock',
    priority: 1
  },

  // Developer agents use GitHub Copilot CLI (cheaper for code tasks)
  'developer-agent': {
    id: 'developer-1',
    name: 'Developer Agent',
    type: 'developer',
    aiConfig: {
      provider: 'github-copilot',
      model: 'claude-sonnet-4', // GitHub Copilot with Sonnet
      maxTokens: 8192,
      temperature: 0.5,
      costPerRequest: 0.002 // Much cheaper via GitHub Copilot
    },
    capabilities: ['code-generation', 'bug-fixing', 'refactoring', 'pr-creation'],
    platform: 'ec2',
    priority: 2
  },

  'qa-agent': {
    id: 'qa-1',
    name: 'QA Test Agent',
    type: 'qa',
    aiConfig: {
      provider: 'github-copilot',
      model: 'claude-sonnet-4',
      maxTokens: 4096,
      temperature: 0.3,
      costPerRequest: 0.002
    },
    capabilities: ['test-generation', 'test-execution', 'regression-testing', 'validation'],
    platform: 'batch',
    priority: 2
  },

  // DevOps can use either based on task complexity
  'devops-agent': {
    id: 'devops-1',
    name: 'DevOps Agent',
    type: 'devops',
    aiConfig: {
      provider: 'github-copilot', // Default to cheaper option
      model: 'claude-sonnet-4',
      maxTokens: 4096,
      temperature: 0.4,
      costPerRequest: 0.002
    },
    capabilities: ['deployment', 'infrastructure', 'monitoring', 'cost-optimization'],
    platform: 'fargate',
    priority: 2
  },

  // Architect uses Bedrock for complex reasoning
  'architect-agent': {
    id: 'architect-1',
    name: 'Architect Agent',
    type: 'architect',
    aiConfig: {
      provider: 'bedrock',
      model: 'anthropic.claude-3-opus-20240229-v1:0', // Opus for complex architecture
      maxTokens: 8192,
      temperature: 0.6,
      costPerRequest: 0.075 // Higher cost but better for architecture decisions
    },
    capabilities: ['system-design', 'architecture-review', 'pattern-recommendation'],
    platform: 'fargate',
    priority: 1
  },

  // Security uses GitHub Copilot for code scanning
  'security-agent': {
    id: 'security-1',
    name: 'Security Agent',
    type: 'security',
    aiConfig: {
      provider: 'github-copilot',
      model: 'claude-sonnet-4',
      maxTokens: 4096,
      temperature: 0.2, // Low temperature for security accuracy
      costPerRequest: 0.002
    },
    capabilities: ['vulnerability-scanning', 'compliance-checking', 'security-review'],
    platform: 'fargate',
    priority: 1
  }
};

// Cost optimization settings
export const COST_OPTIMIZATION = {
  // Master switch: Use GitHub Copilot for ALL tasks (most cost-effective)
  useGitHubCopilotForAll: process.env.USE_GITHUB_COPILOT_FOR_ALL === 'true' || false,
  
  // When not using Copilot for all, these preferences apply
  preferGitHubCopilot: [
    'code-generation',
    'bug-fixing', 
    'test-generation',
    'code-review',
    'documentation'
  ],
  
  preferBedrock: [
    'architecture-design',
    'complex-reasoning',
    'conversation',
    'planning',
    'oversight'
  ],
  
  // Monthly budget limits
  budgetLimits: {
    bedrock: 100, // $100/month for Bedrock
    githubCopilot: 50, // $50/month for GitHub Copilot (10x cheaper!)
    total: 150
  },
  
  // Automatic fallback if budget exceeded
  enableFallback: true,
  fallbackProvider: 'github-copilot' // Always fallback to cheaper option
};

// Helper function to get AI provider for an agent
export function getAIProvider(agentType: string): 'github-copilot' | 'bedrock' {
  // If master switch is on, use GitHub Copilot for everything
  if (COST_OPTIMIZATION.useGitHubCopilotForAll) {
    return 'github-copilot';
  }
  
  // Otherwise use the configured provider for the agent
  const agent = Object.values(AGENT_CONFIGS).find(a => a.type === agentType);
  return agent?.aiConfig.provider === 'bedrock' ? 'bedrock' : 'github-copilot';
}

// Provider configuration
export const AI_PROVIDERS = {
  bedrock: {
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN
    },
    models: {
      'claude-3-sonnet': 'anthropic.claude-3-sonnet-20240229-v1:0',
      'claude-3-opus': 'anthropic.claude-3-opus-20240229-v1:0',
      'claude-3-haiku': 'anthropic.claude-3-haiku-20240307-v1:0'
    }
  },
  
  githubCopilot: {
    command: 'gh copilot',
    model: 'claude-sonnet-4',
    token: process.env.GITHUB_TOKEN,
    timeout: 30000, // 30 seconds timeout
    retries: 3
  },
  
  anthropicDirect: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-sonnet-20240229'
  }
};