import { useState, useEffect } from 'react';
import axios from 'axios';

export interface ExternalDataSource {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastUpdate: Date;
  responseTime: number;
  errorMessage?: string;
}

export interface LiveSystemData {
  agents: any[];
  systemMetrics: any;
  policies: any;
  lastUpdated: Date;
  dataSources: ExternalDataSource[];
}

interface UseExternalDataReturn {
  data: LiveSystemData | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  dataSourceStatus: ExternalDataSource[];
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:7778';

export const useExternalData = (): UseExternalDataReturn => {
  const [data, setData] = useState<LiveSystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSourceStatus, setDataSourceStatus] = useState<ExternalDataSource[]>([]);

  const fetchExternalData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching data from external sources...');

      // Fetch from real external data API
      const response = await axios.get(`${API_BASE_URL}/api/dashboard/live-data`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        console.log('✅ External data fetched successfully:', {
          agents: response.data.data.agents.length,
          sources: response.data.sources,
          timestamp: response.data.timestamp
        });

        setData({
          ...response.data.data,
          lastUpdated: new Date(response.data.data.lastUpdated)
        });

        // Also fetch data source status
        const statusResponse = await axios.get(`${API_BASE_URL}/api/dashboard/data-sources`);
        if (statusResponse.data.success) {
          setDataSourceStatus(statusResponse.data.dataSources.map((ds: any) => ({
            ...ds,
            lastUpdate: new Date(ds.lastUpdate)
          })));
        }
      } else {
        throw new Error(response.data.error || 'Failed to fetch external data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching external data';
      console.error('❌ Error fetching external data:', errorMessage);
      setError(errorMessage);
      
      // Set empty data with error indicators
      setData({
        agents: [],
        systemMetrics: {
          overallCpuUsage: 0,
          overallMemoryUsage: 0,
          activeInstances: 0,
          totalCost: 0,
          healthChecks: []
        },
        policies: {
          totalAssessments: 0,
          allowedOperations: 0,
          deniedOperations: 0,
          averageRiskLevel: 0,
          recentAssessments: []
        },
        lastUpdated: new Date(),
        dataSources: []
      });

      setDataSourceStatus([{
        name: 'API Connection',
        status: 'error',
        lastUpdate: new Date(),
        responseTime: 0,
        errorMessage
      }]);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async (): Promise<void> => {
    try {
      console.log('🔄 Manual refresh requested - forcing external data update...');
      
      // Force refresh external data sources
      await axios.post(`${API_BASE_URL}/api/dashboard/refresh`, {}, {
        timeout: 30000 // 30 second timeout for refresh
      });

      // Fetch updated data
      await fetchExternalData();
      
      console.log('✅ Manual refresh completed');
    } catch (err) {
      console.error('❌ Error during manual refresh:', err);
      setError('Failed to refresh external data sources');
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchExternalData();

    // Set up polling for live updates every 30 seconds
    const interval = setInterval(() => {
      console.log('🔄 Scheduled update from external sources...');
      fetchExternalData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    data,
    loading,
    error,
    refreshData,
    dataSourceStatus
  };
};
