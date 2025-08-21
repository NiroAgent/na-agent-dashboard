/**
 * Enhanced Policy Engine for NA Agent Dashboard
 * Adapted from VF Agent Service enterprise features
 */

export interface PolicyAssessment {
  allowed: boolean;
  riskLevel: number; // 1-5 scale
  reason?: string;
  suggestions?: string[];
  categories: string[];
  complianceLevel: number;
  auditId: string;
}

export interface RiskFactor {
  type: 'content' | 'security' | 'privacy' | 'operational';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string;
}

export interface PolicyConfig {
  riskThreshold: number;
  auditLevel: 'none' | 'basic' | 'full';
  customRules?: CustomPolicyRule[];
}

export interface CustomPolicyRule {
  id: string;
  name: string;
  pattern: string | RegExp;
  action: 'warn' | 'deny';
  description: string;
}

export class AgentPolicyEngine {
  private config: PolicyConfig;
  private auditLog: PolicyAuditEntry[] = [];

  constructor(config: PolicyConfig = {
    riskThreshold: 3,
    auditLevel: 'basic'
  }) {
    this.config = config;
  }

  /**
   * Assess agent commands for policy compliance
   */
  async assessAgentCommand(
    command: string,
    agentId: string,
    action: 'start' | 'stop' | 'restart' | 'deploy' | 'logs' | 'status'
  ): Promise<PolicyAssessment> {
    const startTime = Date.now();
    const auditId = this.generateAuditId();

    try {
      const riskFactors = await this.analyzeCommandRisks(command, action);
      const riskLevel = this.calculateRiskLevel(riskFactors, action);
      const allowed = this.evaluateAllowance(riskLevel, action);
      
      const assessment: PolicyAssessment = {
        allowed,
        riskLevel,
        reason: allowed ? undefined : this.getDenialReason(riskFactors, action),
        suggestions: allowed ? undefined : this.getSuggestions(command, riskFactors, action),
        categories: this.extractCategories(riskFactors),
        complianceLevel: this.calculateComplianceLevel(riskFactors),
        auditId
      };

      // Log assessment
      await this.logAssessment(command, { agentId, action }, assessment, Date.now() - startTime);

      return assessment;
    } catch (error) {
      await this.logError(command, { agentId, action }, error as Error, auditId);
      throw new Error(`Policy assessment failed: ${(error as Error).message}`);
    }
  }

  /**
   * Analyze command-specific risks
   */
  private async analyzeCommandRisks(
    command: string,
    action: string
  ): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    // High-risk actions
    if (['deploy', 'restart'].includes(action)) {
      risks.push({
        type: 'operational',
        severity: 'medium',
        description: `${action} operation affects system state`,
        mitigation: 'Ensure proper monitoring during operation'
      });
    }

    // Command injection detection
    const dangerousPatterns = [
      { pattern: /[;&|`$()]/g, type: 'Command injection' },
      { pattern: /rm\s+-rf/gi, type: 'Destructive command' },
      { pattern: /sudo|su\s/gi, type: 'Privilege escalation' },
      { pattern: /\b(curl|wget)\s+http/gi, type: 'External network access' }
    ];

    for (const { pattern, type } of dangerousPatterns) {
      if (pattern.test(command)) {
        risks.push({
          type: 'security',
          severity: 'high',
          description: `${type} detected in command`,
          mitigation: 'Use safe command alternatives or proper validation'
        });
      }
    }

    // Path traversal detection
    if (/\.\.\/|\.\.\\/.test(command)) {
      risks.push({
        type: 'security',
        severity: 'high',
        description: 'Path traversal attempt detected',
        mitigation: 'Use absolute paths and proper validation'
      });
    }

    // Resource consumption patterns
    const resourcePatterns = [
      /\b(stress|dd|yes|fork)\b/gi,
      /while\s+true/gi,
      /:(){ .*};:/gi // Fork bomb
    ];

    for (const pattern of resourcePatterns) {
      if (pattern.test(command)) {
        risks.push({
          type: 'operational',
          severity: 'critical',
          description: 'Resource exhaustion risk detected',
          mitigation: 'Implement resource limits and monitoring'
        });
      }
    }

    return risks;
  }

  /**
   * Calculate overall risk level (1-5 scale)
   */
  private calculateRiskLevel(risks: RiskFactor[], action: string): number {
    if (risks.length === 0) return 1;

    const severityWeights = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    };

    const totalWeight = risks.reduce((sum, risk) => sum + severityWeights[risk.severity], 0);
    const averageWeight = totalWeight / risks.length;

    // Adjust based on action type
    let adjustment = 0;
    if (['deploy', 'restart'].includes(action)) adjustment += 0.5;
    if (action === 'logs') adjustment -= 0.5; // Logs are generally safer

    const riskLevel = Math.min(5, Math.max(1, Math.ceil(averageWeight + adjustment)));
    return riskLevel;
  }

  /**
   * Evaluate if command is allowed
   */
  private evaluateAllowance(riskLevel: number, action: string): boolean {
    // Check against configured threshold
    if (riskLevel > this.config.riskThreshold) return false;

    // Critical operations require lower risk threshold
    if (['deploy'].includes(action) && riskLevel > 2) return false;

    return true;
  }

  /**
   * Get denial reason
   */
  private getDenialReason(risks: RiskFactor[], action: string): string {
    if (risks.length === 0) return `${action} operation violates security policy`;

    const highestRisk = risks.reduce((highest, current) => 
      this.getSeverityOrder(current.severity) > this.getSeverityOrder(highest.severity) 
        ? current 
        : highest
    );

    return `${highestRisk.description} (${action} operation)`;
  }

  /**
   * Get suggestions for improvement
   */
  private getSuggestions(
    command: string,
    risks: RiskFactor[],
    action: string
  ): string[] {
    const suggestions: string[] = [];

    for (const risk of risks) {
      suggestions.push(risk.mitigation);
    }

    // Add action-specific suggestions
    switch (action) {
      case 'deploy':
        suggestions.push('Review deployment configuration for security compliance');
        suggestions.push('Ensure proper backup procedures are in place');
        break;
      case 'restart':
        suggestions.push('Verify agent state before restart');
        suggestions.push('Monitor agent recovery process');
        break;
      default:
        suggestions.push('Review command for security best practices');
    }

    return Array.from(new Set(suggestions));
  }

  /**
   * Extract risk categories
   */
  private extractCategories(risks: RiskFactor[]): string[] {
    return Array.from(new Set(risks.map(risk => risk.type)));
  }

  /**
   * Calculate compliance level (0-100)
   */
  private calculateComplianceLevel(risks: RiskFactor[]): number {
    if (risks.length === 0) return 100;

    const criticalRisks = risks.filter(r => r.severity === 'critical').length;
    const highRisks = risks.filter(r => r.severity === 'high').length;

    if (criticalRisks > 0) return 0;
    if (highRisks > 2) return 25;
    if (highRisks > 0) return 50;

    return Math.max(75, 100 - (risks.length * 10));
  }

  /**
   * Generate audit ID
   */
  private generateAuditId(): string {
    return `agent_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log policy assessment
   */
  private async logAssessment(
    command: string,
    context: any,
    assessment: PolicyAssessment,
    duration: number
  ): Promise<void> {
    if (this.config.auditLevel === 'none') return;

    const entry: PolicyAuditEntry = {
      id: assessment.auditId,
      timestamp: new Date().toISOString(),
      command: this.config.auditLevel === 'full' ? command : this.hashContent(command),
      context,
      assessment,
      duration
    };

    this.auditLog.push(entry);

    // Keep only last 100 entries for dashboard
    if (this.auditLog.length > 100) {
      this.auditLog = this.auditLog.slice(-100);
    }

    // Log to console for development
    console.log('Policy Assessment:', {
      command: command.substring(0, 50),
      allowed: assessment.allowed,
      riskLevel: assessment.riskLevel,
      compliance: assessment.complianceLevel,
      duration: `${duration}ms`
    });
  }

  /**
   * Log error
   */
  private async logError(
    command: string,
    context: any,
    error: Error,
    auditId: string
  ): Promise<void> {
    console.error('Policy Engine Error:', {
      auditId,
      error: error.message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Hash content for privacy
   */
  private hashContent(content: string): string {
    return `hash_${content.length}_${content.charCodeAt(0) || 0}`;
  }

  /**
   * Get severity order for comparison
   */
  private getSeverityOrder(severity: string): number {
    const order = { low: 1, medium: 2, high: 3, critical: 4 };
    return order[severity as keyof typeof order] || 0;
  }

  /**
   * Get audit log for dashboard display
   */
  getAuditLog(): PolicyAuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Get policy statistics
   */
  getStatistics(): PolicyStatistics {
    const total = this.auditLog.length;
    const allowed = this.auditLog.filter(entry => entry.assessment.allowed).length;
    const denied = total - allowed;
    
    const avgRisk = total > 0 
      ? this.auditLog.reduce((sum, entry) => sum + entry.assessment.riskLevel, 0) / total 
      : 0;

    const avgCompliance = total > 0
      ? this.auditLog.reduce((sum, entry) => sum + entry.assessment.complianceLevel, 0) / total
      : 100;

    return {
      totalAssessments: total,
      allowedOperations: allowed,
      deniedOperations: denied,
      averageRiskLevel: Math.round(avgRisk * 10) / 10,
      averageComplianceLevel: Math.round(avgCompliance * 10) / 10,
      lastAssessment: total > 0 ? this.auditLog[total - 1].timestamp : null
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PolicyConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Supporting interfaces
interface PolicyAuditEntry {
  id: string;
  timestamp: string;
  command: string;
  context: any;
  assessment: PolicyAssessment;
  duration: number;
}

interface PolicyStatistics {
  totalAssessments: number;
  allowedOperations: number;
  deniedOperations: number;
  averageRiskLevel: number;
  averageComplianceLevel: number;
  lastAssessment: string | null;
}

// Default policy engine instance
export const defaultPolicyEngine = new AgentPolicyEngine({
  riskThreshold: 3,
  auditLevel: 'basic'
});
