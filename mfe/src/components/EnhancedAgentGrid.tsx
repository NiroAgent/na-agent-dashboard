import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  IconButton,
  Tooltip,
  LinearProgress,
  Badge
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RestartIcon,
  Terminal as TerminalIcon,
  Error as ErrorIcon,
  CheckCircle as RunningIcon,
  PauseCircle as StoppedIcon,
  HourglassEmpty as StartingIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { LiveAgentMetrics } from '../types/policy';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedAgentGridProps {
  agents: LiveAgentMetrics[];
  onStart: (agentId: string) => void;
  onStop: (agentId: string) => void;
  onRestart: (agentId: string) => void;
  onViewTerminal: (agentId: string) => void;
}

const EnhancedAgentGrid: React.FC<EnhancedAgentGridProps> = ({
  agents,
  onStart,
  onStop,
  onRestart,
  onViewTerminal
}) => {
  // Helper function to provide default values for agent data
  const normalizeAgent = (agent: any): LiveAgentMetrics => ({
    ...agent,
    policyCompliance: agent.policyCompliance || {
      score: 85,
      recentViolations: 0,
      lastAssessment: new Date(),
      riskProfile: 'low' as const
    },
    activityPattern: agent.activityPattern || {
      operationsPerHour: 0,
      peakActivityTime: 'N/A',
      riskTrend: 'stable' as const
    }
  });

  // Map backend status to frontend status
  const mapStatus = (backendStatus: string): 'running' | 'stopped' | 'error' | 'starting' => {
    switch (backendStatus) {
      case 'idle':
        return 'running';
      case 'busy':
        return 'running';
      case 'offline':
        return 'stopped';
      case 'error':
        return 'error';
      case 'starting':
        return 'starting';
      default:
        return 'stopped';
    }
  };

  const getStatusIcon = (status: string) => {
    const mappedStatus = mapStatus(status);
    switch (mappedStatus) {
      case 'running':
        return <RunningIcon sx={{ color: '#00ff88' }} />;
      case 'stopped':
        return <StoppedIcon sx={{ color: '#666' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#ff4444' }} />;
      case 'starting':
        return <StartingIcon sx={{ color: '#ffaa00' }} />;
      default:
        return <StoppedIcon sx={{ color: '#666' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    const mappedStatus = mapStatus(status);
    switch (mappedStatus) {
      case 'running':
        return 'success';
      case 'stopped':
        return 'default';
      case 'error':
        return 'error';
      case 'starting':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getAgentTypeColor = (agent: LiveAgentMetrics) => {
    if (agent.id.startsWith('ns-')) return '#4fc3f7'; // Blue for NiroSubs
    if (agent.id.startsWith('vf-')) return '#ba68c8'; // Purple for VisualForge
    if (agent.id.includes('sdlc')) return '#66bb6a'; // Green for SDLC
    if (agent.id.includes('issue')) return '#ffa726'; // Orange for Issues
    return '#9e9e9e'; // Gray for others
  };

  const getRiskProfileColor = (riskProfile: string) => {
    switch (riskProfile) {
      case 'low':
        return '#4caf50'; // Green
      case 'medium':
        return '#ff9800'; // Orange
      case 'high':
        return '#f44336'; // Red
      default:
        return '#9e9e9e'; // Gray
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUpIcon sx={{ color: '#f44336', fontSize: 16 }} />;
      case 'decreasing':
        return <TrendingDownIcon sx={{ color: '#4caf50', fontSize: 16 }} />;
      case 'stable':
        return <TrendingFlatIcon sx={{ color: '#ff9800', fontSize: 16 }} />;
      default:
        return <TrendingFlatIcon sx={{ color: '#9e9e9e', fontSize: 16 }} />;
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return '#4caf50'; // Green
    if (score >= 75) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  return (
    <Grid container spacing={2}>
      {agents.map((agentData) => {
        const agent = normalizeAgent(agentData);
        return (
        <Grid item xs={12} sm={6} md={4} lg={3} key={agent.id}>
          <Card 
            data-testid="agent-card"
            sx={{ 
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
              border: '1px solid',
              borderColor: mapStatus(agent.status) === 'running' ? '#00ff88' : '#333',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 20px rgba(0, 255, 136, 0.3)'
              }
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                {getStatusIcon(agent.status)}
                <Box display="flex" gap={1}>
                  <Chip 
                    label={mapStatus(agent.status).toUpperCase()} 
                    size="small"
                    data-testid="agent-status"
                    color={getStatusColor(agent.status) as any}
                    sx={{ fontWeight: 'bold' }}
                  />
                  {agent.policyCompliance?.recentViolations > 0 && (
                    <Badge badgeContent={agent.policyCompliance.recentViolations} color="error">
                      <WarningIcon sx={{ color: '#ff9800', fontSize: 18 }} />
                    </Badge>
                  )}
                </Box>
              </Box>
              
              <Typography 
                variant="h6" 
                gutterBottom
                data-testid="agent-name"
                sx={{ 
                  color: getAgentTypeColor(agent),
                  fontWeight: 'bold',
                  fontSize: '1rem'
                }}
              >
                {agent.name}
              </Typography>
              
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ mb: 1, minHeight: '40px' }}
              >
                {agent.name} - {agent.type} agent ({agent.platform})
              </Typography>

              {/* Policy Compliance Section */}
              <Box sx={{ mb: 2, p: 1, backgroundColor: '#0a0a0a', borderRadius: 1 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Box display="flex" alignItems="center">
                    <SecurityIcon sx={{ fontSize: 16, mr: 0.5, color: '#00ff88' }} />
                    <Typography variant="caption" sx={{ color: '#00ff88' }}>
                      Policy Compliance
                    </Typography>
                  </Box>
                  <Chip
                    label={agent.policyCompliance.riskProfile.toUpperCase()}
                    size="small"
                    sx={{ 
                      backgroundColor: getRiskProfileColor(agent.policyCompliance.riskProfile),
                      color: 'white',
                      fontSize: '0.7rem',
                      height: 18
                    }}
                  />
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="caption">
                    Score: {agent.policyCompliance.score}%
                  </Typography>
                  <Box display="flex" alignItems="center">
                    {getTrendIcon(agent.activityPattern.riskTrend)}
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                      {agent.activityPattern.riskTrend}
                    </Typography>
                  </Box>
                </Box>
                
                <LinearProgress 
                  variant="determinate" 
                  value={agent.policyCompliance.score}
                  sx={{ 
                    height: 6, 
                    backgroundColor: '#333',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getComplianceColor(agent.policyCompliance.score)
                    }
                  }}
                />
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Last check: {formatDistanceToNow(agent.policyCompliance.lastAssessment)} ago
                </Typography>
              </Box>

              {/* Performance Metrics */}
              {mapStatus(agent.status) === 'running' && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Instance: {agent.instanceId || agent.taskArn?.split('/').pop() || agent.jobId || 'N/A'}
                  </Typography>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="caption">
                      CPU: {agent.metrics?.cpuUsage?.toFixed(1) || 0}%
                    </Typography>
                    <Typography variant="caption">
                      Ops/hr: {agent.activityPattern.operationsPerHour}
                    </Typography>
                  </Box>
                  
                  {agent.metrics?.cpuUsage !== undefined && (
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(agent.metrics.cpuUsage, 100)}
                      sx={{ 
                        height: 4, 
                        backgroundColor: '#333',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: agent.metrics.cpuUsage > 80 ? '#ff4444' : '#00ff88'
                        }
                      }}
                    />
                  )}
                  
                  {agent.metrics?.memoryUsage !== undefined && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption">Memory: {agent.metrics.memoryUsage.toFixed(1)}%</Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(agent.metrics.memoryUsage, 100)}
                        sx={{ 
                          height: 4,
                          backgroundColor: '#333',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: agent.metrics.memoryUsage > 80 ? '#ff4444' : '#00ff88'
                          }
                        }}
                      />
                    </Box>
                  )}
                  
                  {agent.cost && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Cost: ${agent.cost.hourly.toFixed(2)}/hr
                    </Typography>
                  )}
                </Box>
              )}

              {mapStatus(agent.status) === 'error' && agent.lastError && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  Error: {agent.lastError}
                </Typography>
              )}
            </CardContent>
            
            <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
              <Box>
                {mapStatus(agent.status) === 'stopped' && (
                  <Tooltip title="Start Agent">
                    <IconButton 
                      size="small" 
                      onClick={() => onStart(agent.id)}
                      sx={{ color: '#00ff88' }}
                    >
                      <PlayIcon />
                    </IconButton>
                  </Tooltip>
                )}
                
                {mapStatus(agent.status) === 'running' && (
                  <Tooltip title="Stop Agent">
                    <IconButton 
                      size="small" 
                      onClick={() => onStop(agent.id)}
                      sx={{ color: '#ff4444' }}
                    >
                      <StopIcon />
                    </IconButton>
                  </Tooltip>
                )}
                
                {(mapStatus(agent.status) === 'running' || mapStatus(agent.status) === 'error') && (
                  <Tooltip title="Restart Agent">
                    <IconButton 
                      size="small" 
                      onClick={() => onRestart(agent.id)}
                      sx={{ color: '#ffaa00' }}
                    >
                      <RestartIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              
              <Tooltip title="View Terminal">
                <IconButton 
                  size="small" 
                  onClick={() => onViewTerminal(agent.id)}
                  disabled={mapStatus(agent.status) !== 'running'}
                  sx={{ color: mapStatus(agent.status) === 'running' ? '#00ff88' : '#666' }}
                >
                  <TerminalIcon />
                </IconButton>
              </Tooltip>
            </CardActions>
          </Card>
        </Grid>
        );
      })}
    </Grid>
  );
};

export default EnhancedAgentGrid;
