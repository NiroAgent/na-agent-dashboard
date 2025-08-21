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
  Badge,
  Tab,
  Tabs,
  Alert
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Memory as MemoryIcon,
  Terminal as TerminalIcon,
  GitHub as GitHubIcon,
  Refresh as RefreshIcon,
  PowerSettingsNew as PowerIcon,
  CloudUpload as DeployIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  Cloud as CloudIcon
} from '@mui/icons-material';
import { Toaster } from 'react-hot-toast';

import AgentGrid from './components/AgentGrid';
import EnhancedAgentGrid from './components/EnhancedAgentGrid';
import PolicyDashboard from './components/PolicyDashboard';
import ExternalDataStatus from './components/ExternalDataStatus';
import SystemMetrics from './components/SystemMetrics';
import TerminalView from './components/TerminalView';
import IssuePanel from './components/IssuePanel';
import { useSocket } from './hooks/useSocket';
import { useExternalData } from './hooks/useExternalData';
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
  const [activeTab, setActiveTab] = useState(0);
  
  const socket = useSocket();
  const { data: externalData, loading: externalLoading, error: externalError, refreshData, dataSourceStatus } = useExternalData();

  // Fetch agents data via HTTP
  const fetchAgents = async () => {
    try {
      const response = await fetch('http://localhost:4001/api/dashboard/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  // Fetch initial agents data
  useEffect(() => {
    fetchAgents();
    // Refresh every 5 seconds
    const interval = setInterval(fetchAgents, 5000);

    return () => clearInterval(interval);
  }, []);

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

  const handleStartAgent = async (agentId: string) => {
    try {
      const response = await fetch(`http://localhost:4001/api/dashboard/agents/${agentId}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'start' })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Agent started:', result);
        // Refresh agents list
        fetchAgents();
      } else {
        console.error('Failed to start agent:', await response.text());
      }
    } catch (error) {
      console.error('Error starting agent:', error);
    }
  };

  const handleStopAgent = async (agentId: string) => {
    try {
      const response = await fetch(`http://localhost:4001/api/dashboard/agents/${agentId}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'stop' })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Agent stopped:', result);
        // Refresh agents list
        fetchAgents();
      } else {
        console.error('Failed to stop agent:', await response.text());
      }
    } catch (error) {
      console.error('Error stopping agent:', error);
    }
  };

  const handleRestartAgent = async (agentId: string) => {
    try {
      const response = await fetch(`http://localhost:4001/api/dashboard/agents/${agentId}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'restart' })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Agent restarted:', result);
        // Refresh agents list
        fetchAgents();
      } else {
        console.error('Failed to restart agent:', await response.text());
      }
    } catch (error) {
      console.error('Error restarting agent:', error);
    }
  };

  const handleViewTerminal = (agentId: string) => {
    setSelectedAgent(agentId);
    setShowTerminal(true);
  };

  const handleDeployAllAgents = async () => {
    try {
      const response = await fetch('http://localhost:4001/api/dashboard/deploy-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('All agents deployed:', result);
        // Refresh agents list after deployment
        setTimeout(fetchAgents, 5000); // Wait 5 seconds for deployment to complete
      } else {
        console.error('Failed to deploy agents:', await response.text());
      }
    } catch (error) {
      console.error('Error deploying agents:', error);
    }
  };

  const runningAgents = (activeTab === 0 ? agents : externalData?.agents || []).filter((a: any) => a.status === 'idle' || a.status === 'busy' || a.status === 'running').length;
  const totalAgents = (activeTab === 0 ? agents : externalData?.agents || []).length;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

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
            
            <Tooltip title="Deploy All Agents">
              <IconButton 
                color="inherit" 
                onClick={handleDeployAllAgents}
                sx={{ color: '#ff8800' }}
              >
                <DeployIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Live Policy Dashboard">
              <IconButton 
                color="inherit"
                onClick={() => setActiveTab(activeTab === 1 ? 0 : 1)}
                sx={{ color: activeTab === 1 ? '#00ff88' : 'inherit' }}
              >
                <SecurityIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Refresh All">
              <IconButton 
                color="inherit" 
                onClick={() => {
                  if (activeTab === 0) {
                    window.location.reload();
                  } else {
                    refreshData();
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth={false} sx={{ mt: 3 }}>
          {/* Navigation Tabs */}
          <Paper sx={{ mb: 3, background: '#1a1a1a', border: '1px solid #333' }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              sx={{
                '& .MuiTab-root': {
                  color: '#999',
                  '&.Mui-selected': {
                    color: '#00ff88'
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#00ff88'
                }
              }}
            >
              <Tab 
                label="Standard Agents" 
                icon={<DashboardIcon />}
                iconPosition="start"
              />
              <Tab 
                label="External Live Data" 
                icon={<CloudIcon />}
                iconPosition="start"
              />
            </Tabs>
          </Paper>

          {/* Standard Dashboard */}
          {activeTab === 0 && (
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
          )}

          {/* External Live Data Dashboard */}
          {activeTab === 1 && (
            <Grid container spacing={3}>
              {/* External Data Sources Status */}
              <Grid item xs={12}>
                <ExternalDataStatus
                  dataSources={dataSourceStatus}
                  loading={externalLoading}
                  error={externalError}
                  onRefresh={refreshData}
                />
              </Grid>

              {/* External Data Alert */}
              {externalError && (
                <Grid item xs={12}>
                  <Alert severity="warning" sx={{ backgroundColor: '#2d1b1b', color: '#ff9800' }}>
                    <Typography variant="body2">
                      <strong>External Data Unavailable:</strong> {externalError}
                    </Typography>
                    <Typography variant="caption">
                      Showing fallback data. Check your AWS credentials and external service connections.
                    </Typography>
                  </Alert>
                </Grid>
              )}

              {/* Live System Metrics from External Sources */}
              {externalData?.systemMetrics && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, background: '#1a1a1a', border: '1px solid #333' }}>
                    <Typography variant="h6" gutterBottom sx={{ color: '#00ff88', display: 'flex', alignItems: 'center' }}>
                      <CloudIcon sx={{ mr: 1 }} />
                      Live System Metrics (External Sources)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', background: '#0a0a0a' }}>
                          <Typography variant="h4" color="primary">{externalData.systemMetrics.overallCpuUsage.toFixed(1)}%</Typography>
                          <Typography variant="caption">Overall CPU</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', background: '#0a0a0a' }}>
                          <Typography variant="h4" color="primary">{externalData.systemMetrics.overallMemoryUsage.toFixed(1)}%</Typography>
                          <Typography variant="caption">Overall Memory</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', background: '#0a0a0a' }}>
                          <Typography variant="h4" color="primary">{externalData.systemMetrics.activeInstances}</Typography>
                          <Typography variant="caption">Active Instances</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', background: '#0a0a0a' }}>
                          <Typography variant="h4" color="primary">${externalData.systemMetrics.totalCost.toFixed(2)}/hr</Typography>
                          <Typography variant="caption">Total Cost</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              )}

              {/* Policy Dashboard with External Data */}
              {externalData?.policies && (
                <Grid item xs={12}>
                  <PolicyDashboard agents={externalData.agents || []} />
                </Grid>
              )}

              {/* Enhanced Agent Grid with External Data */}
              <Grid item xs={12} lg={showTerminal ? 6 : 12}>
                <Paper sx={{ p: 2, background: '#1a1a1a', border: '1px solid #333' }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#00ff88', display: 'flex', alignItems: 'center' }}>
                    <AnalyticsIcon sx={{ mr: 1 }} />
                    Live Agents from External Sources ({runningAgents} running)
                  </Typography>
                  
                  {externalData?.agents && externalData.agents.length > 0 ? (
                    <EnhancedAgentGrid 
                      agents={externalData.agents}
                      onStart={handleStartAgent}
                      onStop={handleStopAgent}
                      onRestart={handleRestartAgent}
                      onViewTerminal={handleViewTerminal}
                    />
                  ) : (
                    <Alert severity="info" sx={{ backgroundColor: '#1a2a1a', color: '#4caf50' }}>
                      <Typography variant="body2">
                        No external agents found. Configure your AWS credentials and external services to see live data.
                      </Typography>
                      <Typography variant="caption">
                        Expected sources: AWS EC2 instances, ECS tasks, external policy engine
                      </Typography>
                    </Alert>
                  )}
                </Paper>
              </Grid>

              {/* Terminal View for External Data Tab */}
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
                      Terminal - {externalData?.agents?.find((a: any) => a.id === selectedAgent)?.name || 'Select Agent'}
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
            </Grid>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;