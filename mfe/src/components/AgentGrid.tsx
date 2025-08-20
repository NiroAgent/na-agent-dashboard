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
  LinearProgress
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RestartIcon,
  Terminal as TerminalIcon,
  Error as ErrorIcon,
  CheckCircle as RunningIcon,
  PauseCircle as StoppedIcon,
  HourglassEmpty as StartingIcon
} from '@mui/icons-material';
import { Agent } from '../types';

interface AgentGridProps {
  agents: Agent[];
  onStart: (agentId: string) => void;
  onStop: (agentId: string) => void;
  onRestart: (agentId: string) => void;
  onViewTerminal: (agentId: string) => void;
}

const AgentGrid: React.FC<AgentGridProps> = ({
  agents,
  onStart,
  onStop,
  onRestart,
  onViewTerminal
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
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
    switch (status) {
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

  const getAgentTypeColor = (agent: Agent) => {
    if (agent.id.startsWith('ns-')) return '#4fc3f7'; // Blue for NiroSubs
    if (agent.id.startsWith('vf-')) return '#ba68c8'; // Purple for VisualForge
    if (agent.id.includes('sdlc')) return '#66bb6a'; // Green for SDLC
    if (agent.id.includes('issue')) return '#ffa726'; // Orange for Issues
    return '#9e9e9e'; // Gray for others
  };

  return (
    <Grid container spacing={2}>
      {agents.map((agent) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={agent.id}>
          <Card 
            sx={{ 
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
              border: '1px solid',
              borderColor: agent.status === 'running' ? '#00ff88' : '#333',
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
                <Chip 
                  label={agent.status.toUpperCase()} 
                  size="small"
                  color={getStatusColor(agent.status) as any}
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              
              <Typography 
                variant="h6" 
                gutterBottom
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
                {agent.description}
              </Typography>

              {agent.status === 'running' && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    PID: {agent.pid || 'N/A'}
                  </Typography>
                  {agent.cpu !== undefined && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption">CPU: {agent.cpu.toFixed(1)}%</Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(agent.cpu, 100)}
                        sx={{ 
                          height: 4, 
                          backgroundColor: '#333',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: agent.cpu > 80 ? '#ff4444' : '#00ff88'
                          }
                        }}
                      />
                    </Box>
                  )}
                  {agent.memory !== undefined && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption">Memory: {agent.memory.toFixed(1)}%</Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(agent.memory, 100)}
                        sx={{ 
                          height: 4,
                          backgroundColor: '#333',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: agent.memory > 80 ? '#ff4444' : '#00ff88'
                          }
                        }}
                      />
                    </Box>
                  )}
                </Box>
              )}

              {agent.status === 'error' && agent.lastError && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  Error: {agent.lastError}
                </Typography>
              )}
            </CardContent>
            
            <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
              <Box>
                {agent.status === 'stopped' && (
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
                
                {agent.status === 'running' && (
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
                
                {(agent.status === 'running' || agent.status === 'error') && (
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
                  disabled={agent.status !== 'running'}
                  sx={{ color: agent.status === 'running' ? '#00ff88' : '#666' }}
                >
                  <TerminalIcon />
                </IconButton>
              </Tooltip>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default AgentGrid;