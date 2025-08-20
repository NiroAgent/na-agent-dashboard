import React, { useState, useEffect } from 'react';
import { 
  Box, 
  CssBaseline, 
  ThemeProvider, 
  createTheme,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Memory as MemoryIcon,
  Terminal as TerminalIcon,
  GitHub as GitHubIcon,
  Refresh as RefreshIcon,
  PowerSettingsNew as PowerIcon
} from '@mui/icons-material';
import { Toaster } from 'react-hot-toast';

import AgentGrid from './components/AgentGrid';
import SystemMetrics from './components/SystemMetrics';
import TerminalView from './components/TerminalView';
import IssuePanel from './components/IssuePanel';
import { useSocket } from './hooks/useSocket';
import { Agent, SystemInfo } from './types';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff88',
    },
    secondary: {
      main: '#ff00ff',
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
  },
  typography: {
    fontFamily: '"Fira Code", "Roboto Mono", monospace',
  },
});

function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('agents:status', (data: Agent[]) => {
      setAgents(data);
    });

    socket.on('system:metrics', (data: SystemInfo) => {
      setSystemInfo(data);
    });

    return () => {
      socket.off('agents:status');
      socket.off('system:metrics');
    };
  }, [socket]);

  const handleStartAgent = (agentId: string) => {
    if (socket) {
      socket.emit('agent:start', agentId);
    }
  };

  const handleStopAgent = (agentId: string) => {
    if (socket) {
      socket.emit('agent:stop', agentId);
    }
  };

  const handleRestartAgent = (agentId: string) => {
    if (socket) {
      socket.emit('agent:restart', agentId);
    }
  };

  const handleViewTerminal = (agentId: string) => {
    setSelectedAgent(agentId);
    setShowTerminal(true);
  };

  const runningAgents = agents.filter(a => a.status === 'running').length;
  const totalAgents = agents.length;

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Toaster position="top-right" />
      
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" elevation={0} sx={{ 
          background: 'linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 100%)',
          borderBottom: '1px solid #00ff88'
        }}>
          <Toolbar>
            <DashboardIcon sx={{ mr: 2, color: '#00ff88' }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Agent Orchestrator Dashboard
            </Typography>
            
            <Tooltip title="System Resources">
              <IconButton color="inherit">
                <Badge badgeContent={systemInfo?.cpu.toFixed(0) + '%'} color="secondary">
                  <MemoryIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Running Agents">
              <IconButton color="inherit">
                <Badge badgeContent={`${runningAgents}/${totalAgents}`} color="primary">
                  <PowerIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Tooltip title="View Terminals">
              <IconButton 
                color="inherit" 
                onClick={() => setShowTerminal(!showTerminal)}
                sx={{ color: showTerminal ? '#00ff88' : 'inherit' }}
              >
                <TerminalIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="GitHub Issues">
              <IconButton 
                color="inherit"
                onClick={() => setShowIssues(!showIssues)}
                sx={{ color: showIssues ? '#00ff88' : 'inherit' }}
              >
                <GitHubIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Refresh All">
              <IconButton color="inherit" onClick={() => window.location.reload()}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth={false} sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            {/* System Metrics */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, background: '#1a1a1a', border: '1px solid #333' }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#00ff88' }}>
                  System Resources
                </Typography>
                <SystemMetrics data={systemInfo} />
              </Paper>
            </Grid>

            {/* Agent Grid */}
            <Grid item xs={12} lg={showTerminal || showIssues ? 6 : 12}>
              <Paper sx={{ p: 2, background: '#1a1a1a', border: '1px solid #333' }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#00ff88' }}>
                  Agents ({runningAgents} running)
                </Typography>
                <AgentGrid 
                  agents={agents}
                  onStart={handleStartAgent}
                  onStop={handleStopAgent}
                  onRestart={handleRestartAgent}
                  onViewTerminal={handleViewTerminal}
                />
              </Paper>
            </Grid>

            {/* Terminal View */}
            {showTerminal && (
              <Grid item xs={12} lg={6}>
                <Paper sx={{ 
                  p: 2, 
                  background: '#0a0a0a', 
                  border: '1px solid #00ff88',
                  height: '600px',
                  overflow: 'hidden'
                }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#00ff88' }}>
                    Terminal - {agents.find(a => a.id === selectedAgent)?.name || 'Select Agent'}
                  </Typography>
                  {selectedAgent && (
                    <TerminalView 
                      agentId={selectedAgent} 
                      socket={socket}
                    />
                  )}
                </Paper>
              </Grid>
            )}

            {/* GitHub Issues Panel */}
            {showIssues && !showTerminal && (
              <Grid item xs={12} lg={6}>
                <Paper sx={{ 
                  p: 2, 
                  background: '#1a1a1a', 
                  border: '1px solid #333',
                  height: '600px',
                  overflow: 'auto'
                }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#00ff88' }}>
                    GitHub Issues (agent-task)
                  </Typography>
                  <IssuePanel />
                </Paper>
              </Grid>
            )}
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;