import React from 'react';
import {
  Box,
  Grid,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as CpuIcon,
  NetworkCheck as NetworkIcon
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { SystemInfo } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SystemMetricsProps {
  data: SystemInfo | null;
}

const SystemMetrics: React.FC<SystemMetricsProps> = ({ data }) => {
  if (!data) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Loading system metrics...
        </Typography>
      </Box>
    );
  }

  const cpuChartData = {
    labels: data.cpuHistory?.map((_, i) => `${i}s`) || [],
    datasets: [
      {
        label: 'CPU Usage',
        data: data.cpuHistory || [],
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const memoryChartData = {
    labels: data.memoryHistory?.map((_, i) => `${i}s`) || [],
    datasets: [
      {
        label: 'Memory Usage',
        data: data.memoryHistory || [],
        borderColor: '#ff00ff',
        backgroundColor: 'rgba(255, 0, 255, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      x: {
        display: false
      },
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: (value: any) => `${value}%`,
          color: '#666'
        },
        grid: {
          color: '#333'
        }
      }
    }
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <Grid container spacing={2}>
      {/* CPU Metric */}
      <Grid item xs={12} md={6} lg={3}>
        <Card sx={{ 
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
          border: '1px solid #333'
        }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <CpuIcon sx={{ color: '#00ff88', mr: 1 }} />
              <Typography variant="h6">CPU</Typography>
            </Box>
            
            <Typography variant="h4" sx={{ color: '#00ff88', mb: 1 }}>
              {data.cpu.toFixed(1)}%
            </Typography>
            
            <LinearProgress 
              variant="determinate" 
              value={data.cpu}
              sx={{ 
                height: 6,
                backgroundColor: '#333',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: data.cpu > 80 ? '#ff4444' : '#00ff88'
                }
              }}
            />
            
            <Box sx={{ height: 80, mt: 2 }}>
              {data.cpuHistory && (
                <Line data={cpuChartData} options={chartOptions} />
              )}
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Cores: {data.cpuCores || 'N/A'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Memory Metric */}
      <Grid item xs={12} md={6} lg={3}>
        <Card sx={{ 
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
          border: '1px solid #333'
        }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <MemoryIcon sx={{ color: '#ff00ff', mr: 1 }} />
              <Typography variant="h6">Memory</Typography>
            </Box>
            
            <Typography variant="h4" sx={{ color: '#ff00ff', mb: 1 }}>
              {data.memory.toFixed(1)}%
            </Typography>
            
            <LinearProgress 
              variant="determinate" 
              value={data.memory}
              sx={{ 
                height: 6,
                backgroundColor: '#333',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: data.memory > 90 ? '#ff4444' : '#ff00ff'
                }
              }}
            />
            
            <Box sx={{ height: 80, mt: 2 }}>
              {data.memoryHistory && (
                <Line data={memoryChartData} options={chartOptions} />
              )}
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {formatBytes(data.memoryUsed)} / {formatBytes(data.memoryTotal)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Disk Metric */}
      <Grid item xs={12} md={6} lg={3}>
        <Card sx={{ 
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
          border: '1px solid #333'
        }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <StorageIcon sx={{ color: '#ffaa00', mr: 1 }} />
              <Typography variant="h6">Disk</Typography>
            </Box>
            
            <Typography variant="h4" sx={{ color: '#ffaa00', mb: 1 }}>
              {data.disk?.usage?.toFixed(1) || 0}%
            </Typography>
            
            <LinearProgress 
              variant="determinate" 
              value={data.disk?.usage || 0}
              sx={{ 
                height: 6,
                backgroundColor: '#333',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: (data.disk?.usage || 0) > 90 ? '#ff4444' : '#ffaa00'
                }
              }}
            />
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              {data.disk ? `${formatBytes(data.disk.used)} / ${formatBytes(data.disk.total)}` : 'N/A'}
            </Typography>
            
            <Typography variant="caption" color="text.secondary">
              Free: {data.disk ? formatBytes(data.disk.free) : 'N/A'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Network/System Info */}
      <Grid item xs={12} md={6} lg={3}>
        <Card sx={{ 
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
          border: '1px solid #333'
        }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <NetworkIcon sx={{ color: '#4fc3f7', mr: 1 }} />
              <Typography variant="h6">System</Typography>
            </Box>
            
            <Box sx={{ mb: 1 }}>
              <Chip 
                label={data.platform || 'Unknown'} 
                size="small" 
                sx={{ 
                  backgroundColor: '#333',
                  color: '#4fc3f7',
                  mr: 1
                }}
              />
              <Chip 
                label={data.arch || 'Unknown'} 
                size="small"
                sx={{ 
                  backgroundColor: '#333',
                  color: '#4fc3f7'
                }}
              />
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Uptime: {data.uptime ? `${Math.floor(data.uptime / 3600)}h ${Math.floor((data.uptime % 3600) / 60)}m` : 'N/A'}
            </Typography>
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Load Avg: {data.loadAvg?.map(l => l.toFixed(2)).join(', ') || 'N/A'}
            </Typography>
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Processes: {data.processes || 'N/A'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default SystemMetrics;