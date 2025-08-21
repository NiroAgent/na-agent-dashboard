import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Progress } from "./ui/progress";
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';

interface PolicyStatistics {
  totalAssessments: number;
  allowedOperations: number;
  deniedOperations: number;
  averageRiskLevel: number;
  averageComplianceLevel: number;
  lastAssessment: string | null;
}

interface PolicyAuditEntry {
  id: string;
  timestamp: string;
  command: string;
  context: {
    agentId: string;
    action: string;
  };
  assessment: {
    allowed: boolean;
    riskLevel: number;
    reason?: string;
    complianceLevel: number;
    categories: string[];
  };
  duration: number;
}

interface PolicyDashboardProps {
  className?: string;
}

export function PolicyDashboard({ className }: PolicyDashboardProps) {
  const [statistics, setStatistics] = useState<PolicyStatistics>({
    totalAssessments: 0,
    allowedOperations: 0,
    deniedOperations: 0,
    averageRiskLevel: 0,
    averageComplianceLevel: 100,
    lastAssessment: null
  });
  
  const [auditLog, setAuditLog] = useState<PolicyAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPolicyData();
    const interval = setInterval(fetchPolicyData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPolicyData = async () => {
    try {
      const [statsResponse, auditResponse] = await Promise.all([
        fetch('/api/dashboard/policy/stats'),
        fetch('/api/dashboard/policy/audit')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStatistics(statsData.policy || statistics);
      }

      if (auditResponse.ok) {
        const auditData = await auditResponse.json();
        setAuditLog(auditData.auditLog || []);
      }

      setError(null);
    } catch (err) {
      setError('Failed to fetch policy data');
      console.error('Policy data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: number): string => {
    if (level <= 2) return 'text-green-600';
    if (level <= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskLevelBadge = (level: number): string => {
    if (level <= 2) return 'bg-green-100 text-green-800';
    if (level <= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getComplianceColor = (level: number): string => {
    if (level >= 90) return 'text-green-600';
    if (level >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 animate-spin" />
              <span>Loading policy dashboard...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Policy Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Total Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalAssessments}</div>
            <p className="text-xs text-muted-foreground">
              Policy evaluations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Allowed Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.allowedOperations}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.totalAssessments > 0 
                ? `${Math.round((statistics.allowedOperations / statistics.totalAssessments) * 100)}% success rate`
                : 'No operations yet'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <XCircle className="h-4 w-4 mr-2 text-red-500" />
              Denied Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statistics.deniedOperations}</div>
            <p className="text-xs text-muted-foreground">
              Policy violations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Average Risk Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskLevelColor(statistics.averageRiskLevel)}`}>
              {statistics.averageRiskLevel.toFixed(1)}/5
            </div>
            <p className="text-xs text-muted-foreground">
              Risk assessment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Compliance Level
          </CardTitle>
          <CardDescription>
            Overall policy compliance across all operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Compliance Score</span>
              <span className={`text-sm font-bold ${getComplianceColor(statistics.averageComplianceLevel)}`}>
                {statistics.averageComplianceLevel.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={statistics.averageComplianceLevel} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              {statistics.lastAssessment 
                ? `Last assessment: ${new Date(statistics.lastAssessment).toLocaleString()}`
                : 'No assessments yet'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Operations</TabsTrigger>
          <TabsTrigger value="violations">Policy Violations</TabsTrigger>
        </TabsList>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Policy Assessments</CardTitle>
              <CardDescription>
                Latest operations evaluated by the policy engine
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditLog.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge className={getRiskLevelBadge(entry.assessment.riskLevel)}>
                          Risk {entry.assessment.riskLevel}
                        </Badge>
                        {entry.assessment.allowed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">{entry.context.action}</span>
                        <span className="text-sm text-muted-foreground">
                          Agent: {entry.context.agentId}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()} • 
                        {entry.duration}ms • 
                        Compliance: {entry.assessment.complianceLevel}%
                      </div>
                      {entry.assessment.reason && (
                        <div className="text-sm text-red-600">
                          {entry.assessment.reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {auditLog.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No policy assessments yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations">
          <Card>
            <CardHeader>
              <CardTitle>Policy Violations</CardTitle>
              <CardDescription>
                Operations that were denied by the policy engine
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditLog
                  .filter(entry => !entry.assessment.allowed)
                  .slice(0, 10)
                  .map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="font-medium">{entry.context.action}</span>
                          <Badge className="bg-red-100 text-red-800">
                            DENIED
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Agent: {entry.context.agentId}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                        <div className="text-sm text-red-600 font-medium">
                          {entry.assessment.reason}
                        </div>
                      </div>
                    </div>
                  ))}
                {auditLog.filter(entry => !entry.assessment.allowed).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    No policy violations detected
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
