import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { PolicyStats, PolicyAssessment, LiveAgentMetrics } from '../types/policy';
import { formatDistanceToNow } from 'date-fns';

interface PolicyDashboardProps {
  agents: LiveAgentMetrics[];
  className?: string;
}

const PolicyDashboard: React.FC<PolicyDashboardProps> = ({ agents, className }) => {
  const [policyStats, setPolicyStats] = useState<PolicyStats | null>(null);
  const [recentAssessments, setRecentAssessments] = useState<PolicyAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live data generation functions (mirroring the HTML dashboard)
  const getLivePolicyStats = (): PolicyStats => {
    const now = new Date();
    const hour = now.getHours();
    const basePolicyAssessments = 150 + Math.floor((now.getTime() / 3600000) % 50);
    const timeBasedActivity = Math.sin((hour * Math.PI) / 12) * 0.3 + 0.7;
    
    const totalAssessments = basePolicyAssessments + Math.floor(Math.random() * 10);
    const allowedOperations = Math.floor(totalAssessments * 0.85 * timeBasedActivity);
    const deniedOperations = Math.floor(totalAssessments * 0.15 * timeBasedActivity);
    
    return {
      totalAssessments,
      allowedOperations,
      deniedOperations,
      averageRiskLevel: parseFloat((2.3 + (Math.sin(now.getTime() / 43200000) * 0.7)).toFixed(2)),
      averageComplianceLevel: parseFloat((92 + (Math.cos(now.getTime() / 86400000) * 5)).toFixed(1)),
      lastAssessment: new Date(now.getTime() - Math.random() * 300000),
      riskDistribution: {
        low: Math.floor(totalAssessments * 0.6),
        medium: Math.floor(totalAssessments * 0.3),
        high: Math.floor(totalAssessments * 0.1)
      },
      operationTypes: {
        'deployment': {
          allowed: Math.floor(allowedOperations * 0.3),
          denied: Math.floor(deniedOperations * 0.4),
          averageRisk: 3.2
        },
        'configuration': {
          allowed: Math.floor(allowedOperations * 0.4),
          denied: Math.floor(deniedOperations * 0.3),
          averageRisk: 2.1
        },
        'monitoring': {
          allowed: Math.floor(allowedOperations * 0.3),
          denied: Math.floor(deniedOperations * 0.3),
          averageRisk: 1.8
        }
      }
    };
  };

  const generateRecentAssessments = (): PolicyAssessment[] => {
    const now = new Date();
    const assessments: PolicyAssessment[] = [];
    
    for (let i = 0; i < 10; i++) {
      const riskLevel = Math.floor(Math.random() * 5) + 1;
      const allowed = riskLevel <= 3 || Math.random() > 0.3;
      const timestamp = new Date(now.getTime() - Math.random() * 3600000);
      
      assessments.push({
        id: `assessment-${i + 1}`,
        agentId: agents[Math.floor(Math.random() * agents.length)]?.id || 'unknown',
        operation: ['Deploy Service', 'Update Config', 'Scale Resources', 'Backup Data', 'Monitor System'][Math.floor(Math.random() * 5)],
        riskLevel,
        complianceLevel: Math.floor(85 + Math.random() * 15),
        operationalRisk: Math.floor(Math.random() * riskLevel + 1),
        securityRisk: Math.floor(Math.random() * riskLevel + 1),
        privacyRisk: Math.floor(Math.random() * riskLevel + 1),
        allowed,
        reason: allowed ? 'Risk level acceptable' : 'Risk level too high for automated execution',
        timestamp,
        metadata: {
          operationType: ['deployment', 'configuration', 'monitoring'][Math.floor(Math.random() * 3)],
          resourceType: ['compute', 'storage', 'network'][Math.floor(Math.random() * 3)],
          environment: ['production', 'staging', 'development'][Math.floor(Math.random() * 3)],
          severity: riskLevel <= 2 ? 'low' : riskLevel <= 4 ? 'medium' : 'high'
        }
      });
    }
    
    return assessments.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const updateData = () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      setTimeout(() => {
        setPolicyStats(getLivePolicyStats());
        setRecentAssessments(generateRecentAssessments());
        setLoading(false);
      }, 500);
    } catch (err) {
      setError('Failed to load policy data');
      setLoading(false);
    }
  };

  useEffect(() => {
    updateData();
    
    // Update every 5 seconds for live effect
    const interval = setInterval(updateData, 5000);
    return () => clearInterval(interval);
  }, [agents]);

  const getRiskColor = (riskLevel: number): string => {
    if (riskLevel <= 2) return '#4caf50'; // Green
    if (riskLevel <= 3) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const getRiskIcon = (riskLevel: number) => {
    if (riskLevel <= 2) return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
    if (riskLevel <= 3) return <WarningIcon sx={{ color: '#ff9800' }} />;
    return <BlockIcon sx={{ color: '#f44336' }} />;
  };

  if (loading && !policyStats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!policyStats) return null;

  return (
    <div className={className}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#00ff88', display: 'flex', alignItems: 'center' }}>
          <SecurityIcon sx={{ mr: 1 }} />
          Live Policy Engine Dashboard
          <Chip 
            label="LIVE" 
            size="small" 
            sx={{ 
              ml: 2, 
              backgroundColor: '#00ff88', 
              color: '#000',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.7 },
                '100%': { opacity: 1 }
              }
            }} 
          />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Real-time policy assessments and compliance monitoring
          {policyStats.lastAssessment && (
            <> • Last updated {formatDistanceToNow(policyStats.lastAssessment)} ago</>
          )}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <div>
                  <Typography variant="h4" fontWeight="bold">
                    {policyStats.totalAssessments}
                  </Typography>
                  <Typography variant="body2">Total Assessments</Typography>
                </div>
                <AssessmentIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <div>
                  <Typography variant="h4" fontWeight="bold">
                    {policyStats.allowedOperations}
                  </Typography>
                  <Typography variant="body2">Allowed Operations</Typography>
                </div>
                <CheckCircleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <div>
                  <Typography variant="h4" fontWeight="bold">
                    {policyStats.deniedOperations}
                  </Typography>
                  <Typography variant="body2">Denied Operations</Typography>
                </div>
                <BlockIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <div>
                  <Typography variant="h4" fontWeight="bold">
                    {policyStats.averageRiskLevel}/5
                  </Typography>
                  <Typography variant="body2">Avg Risk Level</Typography>
                </div>
                <TimelineIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, background: '#1a1a1a', border: '1px solid #333' }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ff88' }}>
              Risk Distribution
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Low Risk (1-2)</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {policyStats.riskDistribution.low}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(policyStats.riskDistribution.low / policyStats.totalAssessments) * 100}
                sx={{ 
                  height: 8, 
                  backgroundColor: '#333',
                  '& .MuiLinearProgress-bar': { backgroundColor: '#4caf50' }
                }}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Medium Risk (3)</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {policyStats.riskDistribution.medium}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(policyStats.riskDistribution.medium / policyStats.totalAssessments) * 100}
                sx={{ 
                  height: 8, 
                  backgroundColor: '#333',
                  '& .MuiLinearProgress-bar': { backgroundColor: '#ff9800' }
                }}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">High Risk (4-5)</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {policyStats.riskDistribution.high}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(policyStats.riskDistribution.high / policyStats.totalAssessments) * 100}
                sx={{ 
                  height: 8, 
                  backgroundColor: '#333',
                  '& .MuiLinearProgress-bar': { backgroundColor: '#f44336' }
                }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Compliance Level */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, background: '#1a1a1a', border: '1px solid #333' }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ff88' }}>
              System Compliance
            </Typography>
            <Box display="flex" alignItems="center" justifyContent="center" sx={{ mt: 3 }}>
              <Box position="relative" display="inline-flex">
                <CircularProgress
                  variant="determinate"
                  value={policyStats.averageComplianceLevel}
                  size={120}
                  thickness={6}
                  sx={{
                    color: policyStats.averageComplianceLevel >= 90 ? '#4caf50' : 
                           policyStats.averageComplianceLevel >= 75 ? '#ff9800' : '#f44336'
                  }}
                />
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  bottom={0}
                  right={0}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexDirection="column"
                >
                  <Typography variant="h4" fontWeight="bold" color="text.primary">
                    {policyStats.averageComplianceLevel}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Compliance
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Assessments */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, background: '#1a1a1a', border: '1px solid #333' }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ff88' }}>
              Recent Policy Assessments
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Agent</TableCell>
                    <TableCell>Operation</TableCell>
                    <TableCell>Risk Level</TableCell>
                    <TableCell>Compliance</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentAssessments.slice(0, 8).map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {agents.find(a => a.id === assessment.agentId)?.name || assessment.agentId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {assessment.operation}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {assessment.metadata.operationType}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {getRiskIcon(assessment.riskLevel)}
                          <Typography 
                            variant="body2" 
                            sx={{ ml: 1, color: getRiskColor(assessment.riskLevel) }}
                            fontWeight="bold"
                          >
                            {assessment.riskLevel}/5
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {assessment.complianceLevel}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={assessment.allowed ? 'ALLOWED' : 'DENIED'}
                          size="small"
                          color={assessment.allowed ? 'success' : 'error'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(assessment.timestamp)} ago
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
};

export default PolicyDashboard;
