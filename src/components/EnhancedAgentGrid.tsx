/**
 * Enhanced AgentGrid with Policy Integration
 * Shows how to integrate policy information into the existing UI
 */

import React, { useState, useEffect } from 'react';
import { AgentCard } from './AgentCard';
import { PolicyIndicator } from './PolicyIndicator';

interface PolicyStats {
  totalAssessments: number;
  allowedOperations: number;
  deniedOperations: number;
  averageRiskLevel: number;
  averageComplianceLevel: number;
}

export function EnhancedAgentGrid() {
  const [agents, setAgents] = useState([]);
  const [policyStats, setPolicyStats] = useState<PolicyStats>({
    totalAssessments: 0,
    allowedOperations: 0,
    deniedOperations: 0,
    averageRiskLevel: 0,
    averageComplianceLevel: 100
  });

  useEffect(() => {
    // Fetch agents and policy stats
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Enhanced API calls with policy data
      const [agentsResponse, policyResponse] = await Promise.all([
        fetch('/api/dashboard/agents'),
        fetch('/api/dashboard/policy/stats')
      ]);

      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setAgents(agentsData.agents);
      }

      if (policyResponse.ok) {
        const policyData = await policyResponse.json();
        setPolicyStats(policyData.policy);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAgentControl = async (agentId: string, action: string) => {
    try {
      // Enhanced control with policy assessment
      const response = await fetch(`/api/dashboard/agents/${agentId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Policy-approved operation:', result);
        
        // Show policy assessment in UI
        if (result.policyAssessment) {
          showPolicyNotification(result.policyAssessment);
        }
        
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        console.error('Operation denied:', error);
        showPolicyError(error.error);
      }
    } catch (error) {
      console.error('Control error:', error);
    }
  };

  const showPolicyNotification = (assessment: any) => {
    // Show policy assessment result
    const message = `Operation approved (Risk: ${assessment.riskLevel}/5, Compliance: ${assessment.complianceLevel}%)`;
    // Add notification to UI
  };

  const showPolicyError = (error: string) => {
    // Show policy denial reason
    // Add error notification to UI
  };

  return (
    <div className="space-y-6">
      {/* Policy Compliance Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Security & Compliance Status</h2>
          <PolicyIndicator complianceLevel={policyStats.averageComplianceLevel} />
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {policyStats.allowedOperations}
            </div>
            <div className="text-sm text-gray-500">Approved Operations</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {policyStats.deniedOperations}
            </div>
            <div className="text-sm text-gray-500">Policy Violations</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {policyStats.averageRiskLevel.toFixed(1)}/5
            </div>
            <div className="text-sm text-gray-500">Average Risk Level</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {policyStats.averageComplianceLevel.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Compliance Score</div>
          </div>
        </div>
      </div>

      {/* Enhanced Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent: any) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onControl={handleAgentControl}
            showPolicyInfo={true} // New prop for policy features
          />
        ))}
      </div>
    </div>
  );
}

export default EnhancedAgentGrid;
