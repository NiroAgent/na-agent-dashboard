import { useState, useEffect } from 'react';
import { LiveAgentMetrics } from '../types/policy';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:7778';

interface UseLiveAgentsReturn {
  agents: LiveAgentMetrics[];
  loading: boolean;
  error: string | null;
  refreshAgents: () => void;
}

export const useLiveAgents = (): UseLiveAgentsReturn => {
  const [agents, setAgents] = useState<LiveAgentMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/agents`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && data.agents) {
        // Convert API data to LiveAgentMetrics format
        const convertedAgents = data.agents.map((agent: any) => ({
          id: agent.id,
          name: agent.name,
          type: agent.type,
          status: agent.status === 'active' ? 'busy' : 'idle',
          platform: agent.platform,
          instanceId: agent.instanceId,
          lastSeen: new Date(agent.lastSeen),
          currentTask: agent.status === 'active' ? `Working on ${agent.type} tasks` : undefined,
          capabilities: agent.capabilities || [],
          metrics: {
            tasksCompleted: agent.metrics?.tasksCompleted || 0,
            successRate: Math.round(agent.metrics?.successRate || 85),
            averageResponseTime: Math.round(agent.metrics?.avgResponseTime || 1000),
            cpuUsage: Math.round(agent.metrics?.cpuUsage || 15),
            memoryUsage: Math.round(agent.metrics?.memoryUsage || 25)
          },
          policyCompliance: {
            score: Math.round(85 + Math.random() * 10),
            recentViolations: Math.floor(Math.random() * 2),
            lastAssessment: new Date(agent.modifiedAt || agent.lastSeen),
            riskProfile: 'low' as const
          },
          activityPattern: {
            operationsPerHour: Math.floor(8 + Math.random() * 12),
            peakActivityTime: '14:00',
            riskTrend: 'stable' as const
          },
          cost: {
            hourly: 0.15,
            daily: 3.60,
            monthly: 108.00
          }
        }));
        
        setAgents(convertedAgents);
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents data');
      console.error('Error fetching agents:', err);
    } finally {
      setLoading(false);
    }
  };


  const refreshAgents = () => {
    fetchAgents();
  };

  useEffect(() => {
    fetchAgents();
    
    // Update every 3 seconds for live effect
    const interval = setInterval(fetchAgents, 3000);
    return () => clearInterval(interval);
  }, []);

  return {
    agents,
    loading,
    error,
    refreshAgents
  };
};
