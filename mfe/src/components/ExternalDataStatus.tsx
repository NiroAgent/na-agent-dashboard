import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as ConnectedIcon,
  Error as ErrorIcon,
  Warning as DisconnectedIcon,
  Refresh as RefreshIcon,
  Cloud as CloudIcon,
  Api as ApiIcon,
  Storage as DatabaseIcon,
  Monitor as MonitorIcon
} from '@mui/icons-material';
import { ExternalDataSource } from '../hooks/useExternalData';
import { formatDistanceToNow } from 'date-fns';

interface ExternalDataStatusProps {
  dataSources: ExternalDataSource[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}

const ExternalDataStatus: React.FC<ExternalDataStatusProps> = ({
  dataSources,
  loading,
  error,
  onRefresh
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <ConnectedIcon sx={{ color: '#4caf50' }} />;
      case 'disconnected':
        return <DisconnectedIcon sx={{ color: '#ff9800' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#f44336' }} />;
      default:
        return <DisconnectedIcon sx={{ color: '#666' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'disconnected':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getSourceIcon = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('aws') || nameLower.includes('ec2') || nameLower.includes('ecs')) {
      return <CloudIcon sx={{ fontSize: 16, mr: 1 }} />;
    }
    if (nameLower.includes('api') || nameLower.includes('policy')) {
      return <ApiIcon sx={{ fontSize: 16, mr: 1 }} />;
    }
    if (nameLower.includes('database') || nameLower.includes('redis')) {
      return <DatabaseIcon sx={{ fontSize: 16, mr: 1 }} />;
    }
    if (nameLower.includes('monitor') || nameLower.includes('health')) {
      return <MonitorIcon sx={{ fontSize: 16, mr: 1 }} />;
    }
    return <ApiIcon sx={{ fontSize: 16, mr: 1 }} />;
  };

  const connectedCount = dataSources.filter(ds => ds.status === 'connected').length;
  const totalCount = dataSources.length;

  return (
    <Paper sx={{ p: 3, background: '#1a1a1a', border: '1px solid #333' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" sx={{ color: '#00ff88', display: 'flex', alignItems: 'center' }}>
          <CloudIcon sx={{ mr: 1 }} />
          External Data Sources
          <Chip 
            label={`${connectedCount}/${totalCount} Connected`}
            size="small"
            color={connectedCount === totalCount ? 'success' : connectedCount > 0 ? 'warning' : 'error'}
            sx={{ ml: 2 }}
          />
        </Typography>
        
        <Tooltip title="Refresh All External Sources">
          <IconButton 
            onClick={onRefresh}
            disabled={loading}
            sx={{ color: '#00ff88' }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {loading && (
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Refreshing external data sources...
          </Typography>
          <LinearProgress sx={{ 
            backgroundColor: '#333',
            '& .MuiLinearProgress-bar': { backgroundColor: '#00ff88' }
          }} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, backgroundColor: '#2d1b1b', color: '#ff6b6b' }}>
          <Typography variant="body2">
            <strong>External Data Error:</strong> {error}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            The dashboard is showing limited functionality. Check your external service connections.
          </Typography>
        </Alert>
      )}

      {dataSources.length === 0 ? (
        <Alert severity="warning" sx={{ backgroundColor: '#2d2416', color: '#ffb74d' }}>
          <Typography variant="body2">
            No external data sources configured. The dashboard is running in standalone mode.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Configure AWS credentials and external API endpoints to enable live data.
          </Typography>
        </Alert>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#00ff88', fontWeight: 'bold' }}>Source</TableCell>
                <TableCell sx={{ color: '#00ff88', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: '#00ff88', fontWeight: 'bold' }}>Response Time</TableCell>
                <TableCell sx={{ color: '#00ff88', fontWeight: 'bold' }}>Last Update</TableCell>
                <TableCell sx={{ color: '#00ff88', fontWeight: 'bold' }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dataSources.map((source, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {getSourceIcon(source.name)}
                      <Typography variant="body2" fontWeight="bold">
                        {source.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {getStatusIcon(source.status)}
                      <Chip 
                        label={source.status.toUpperCase()}
                        size="small"
                        color={getStatusColor(source.status) as any}
                        sx={{ ml: 1, fontWeight: 'bold' }}
                      />
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {source.responseTime}ms
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDistanceToNow(source.lastUpdate)} ago
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    {source.errorMessage ? (
                      <Tooltip title={source.errorMessage}>
                        <Typography 
                          variant="caption" 
                          color="error"
                          sx={{ 
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block'
                          }}
                        >
                          {source.errorMessage.length > 30 
                            ? source.errorMessage.substring(0, 30) + '...' 
                            : source.errorMessage
                          }
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {source.status === 'connected' ? 'Active' : 'No data'}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box mt={2}>
        <Typography variant="caption" color="text.secondary">
          📡 Real-time data from: AWS EC2, AWS ECS, CloudWatch, External Policy Engine, Health Monitoring APIs
        </Typography>
      </Box>
    </Paper>
  );
};

export default ExternalDataStatus;
