export interface PolicyStats {
  totalAssessments: number;
  allowedOperations: number;
  deniedOperations: number;
  averageRiskLevel: number;
  averageComplianceLevel: number;
  lastAssessment: Date;
  riskDistribution: {
    low: number;    // Risk level 1-2
    medium: number; // Risk level 3
    high: number;   // Risk level 4-5
  };
  operationTypes: {
    [key: string]: {
      allowed: number;
      denied: number;
      averageRisk: number;
    };
  };
}

export interface PolicyAssessment {
  id: string;
  agentId: string;
  operation: string;
  riskLevel: number; // 1-5 scale
  complianceLevel: number; // 0-100 percentage
  operationalRisk: number;
  securityRisk: number;
  privacyRisk: number;
  allowed: boolean;
  reason: string;
  timestamp: Date;
  metadata: {
    operationType: string;
    resourceType?: string;
    environment?: string;
    severity?: 'low' | 'medium' | 'high';
  };
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  riskThreshold: number;
  operationTypes: string[];
  enabled: boolean;
  priority: number;
  conditions: {
    environment?: string[];
    agentTypes?: string[];
    timeRestrictions?: {
      allowedHours: number[];
      allowedDays: number[];
    };
  };
  actions: {
    allow: boolean;
    requireApproval?: boolean;
    notifyAdmins?: boolean;
  };
}

export interface PolicyAuditLog {
  id: string;
  timestamp: Date;
  eventType: 'assessment' | 'rule_change' | 'override' | 'violation';
  agentId?: string;
  ruleId?: string;
  operation?: string;
  result: 'allowed' | 'denied' | 'overridden';
  riskLevel?: number;
  adminUser?: string;
  details: string;
  metadata: Record<string, any>;
}

import { Agent } from '../types';

export interface LiveAgentMetrics extends Agent {
  policyCompliance: {
    score: number;
    recentViolations: number;
    lastAssessment: Date;
    riskProfile: 'low' | 'medium' | 'high';
  };
  activityPattern: {
    operationsPerHour: number;
    peakActivityTime: string;
    riskTrend: 'increasing' | 'stable' | 'decreasing';
  };
}
