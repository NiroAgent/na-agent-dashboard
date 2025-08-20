import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Typography,
  IconButton,
  TextField,
  Button,
  Divider,
  Collapse,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  BugReport as IssueIcon,
  CheckCircle as ClosedIcon,
  RadioButtonUnchecked as OpenIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Label as LabelIcon,
  Person as AssigneeIcon,
  Schedule as TimeIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string; color: string }>;
  assignee?: { login: string };
  created_at: string;
  updated_at: string;
  repository: string;
}

const IssuePanel: React.FC = () => {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());
  const [filterRepo, setFilterRepo] = useState<string>('all');
  const [filterLabel, setFilterLabel] = useState<string>('agent-task');

  const repositories = [
    'all',
    'NiroSubs-V2',
    'VisualForgeMediaV2',
    'agent-dashboard'
  ];

  const fetchIssues = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/github/issues', {
        params: {
          repo: filterRepo === 'all' ? undefined : filterRepo,
          label: filterLabel
        }
      });
      setIssues(response.data);
    } catch (err) {
      setError('Failed to fetch issues');
      console.error('Error fetching issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchIssues, 30000);
    return () => clearInterval(interval);
  }, [filterRepo, filterLabel]);

  const toggleExpanded = (issueNumber: number) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(issueNumber)) {
      newExpanded.delete(issueNumber);
    } else {
      newExpanded.add(issueNumber);
    }
    setExpandedIssues(newExpanded);
  };

  const handleCreateIssue = () => {
    // This would open a dialog or redirect to GitHub to create an issue
    window.open(`https://github.com/stevesurles/${filterRepo}/issues/new?labels=${filterLabel}`, '_blank');
  };

  const getLabelColor = (label: string) => {
    switch (label) {
      case 'agent-task': return '#00ff88';
      case 'bug': return '#ff4444';
      case 'enhancement': return '#4fc3f7';
      case 'in-progress': return '#ffaa00';
      case 'completed': return '#00ff88';
      default: return '#666';
    }
  };

  const getIssuePriority = (labels: Array<{ name: string }>) => {
    if (labels.some(l => l.name === 'critical')) return 'critical';
    if (labels.some(l => l.name === 'high')) return 'high';
    if (labels.some(l => l.name === 'medium')) return 'medium';
    return 'low';
  };

  if (loading && issues.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress sx={{ color: '#00ff88' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <Button size="small" onClick={fetchIssues} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Filters and Controls */}
      <Box sx={{ p: 2, borderBottom: '1px solid #333' }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            select
            size="small"
            label="Repository"
            value={filterRepo}
            onChange={(e) => setFilterRepo(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ minWidth: 150 }}
          >
            {repositories.map(repo => (
              <option key={repo} value={repo}>{repo}</option>
            ))}
          </TextField>
          
          <TextField
            size="small"
            label="Label Filter"
            value={filterLabel}
            onChange={(e) => setFilterLabel(e.target.value)}
            sx={{ minWidth: 150 }}
          />
          
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleCreateIssue}
            sx={{ 
              borderColor: '#00ff88',
              color: '#00ff88',
              '&:hover': {
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                borderColor: '#00ff88'
              }
            }}
          >
            New Issue
          </Button>
          
          <IconButton onClick={fetchIssues} sx={{ color: '#00ff88' }}>
            <RefreshIcon />
          </IconButton>
        </Box>
        
        <Typography variant="caption" color="text.secondary">
          {issues.length} issues found · Last updated: {format(new Date(), 'HH:mm:ss')}
        </Typography>
      </Box>

      {/* Issues List */}
      <List sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
        {issues.map((issue) => {
          const isExpanded = expandedIssues.has(issue.number);
          const priority = getIssuePriority(issue.labels);
          
          return (
            <React.Fragment key={issue.number}>
              <ListItem
                sx={{
                  borderLeft: '3px solid',
                  borderLeftColor: issue.state === 'open' ? '#00ff88' : '#666',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 255, 136, 0.05)'
                  }
                }}
              >
                <ListItemIcon>
                  {issue.state === 'open' ? (
                    <OpenIcon sx={{ color: '#00ff88' }} />
                  ) : (
                    <ClosedIcon sx={{ color: '#666' }} />
                  )}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        #{issue.number} {issue.title}
                      </Typography>
                      {priority === 'critical' && (
                        <Chip 
                          label="CRITICAL" 
                          size="small" 
                          sx={{ 
                            backgroundColor: '#ff4444',
                            color: '#fff',
                            fontWeight: 'bold',
                            height: 20
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                        {issue.labels.map(label => (
                          <Chip
                            key={label.name}
                            label={label.name}
                            size="small"
                            sx={{
                              backgroundColor: `#${label.color}`,
                              color: '#000',
                              fontSize: '0.7rem',
                              height: 18
                            }}
                          />
                        ))}
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          <TimeIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                          {format(new Date(issue.created_at), 'MMM d, yyyy')}
                        </Typography>
                        
                        {issue.assignee && (
                          <Typography variant="caption" color="text.secondary">
                            <AssigneeIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                            {issue.assignee.login}
                          </Typography>
                        )}
                        
                        <Typography variant="caption" color="text.secondary">
                          <LabelIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                          {issue.repository}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                
                <IconButton 
                  size="small" 
                  onClick={() => toggleExpanded(issue.number)}
                  sx={{ color: '#666' }}
                >
                  {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                </IconButton>
              </ListItem>
              
              <Collapse in={isExpanded}>
                <Box sx={{ 
                  p: 2, 
                  pl: 8,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderBottom: '1px solid #333'
                }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      color: '#ccc'
                    }}
                  >
                    {issue.body || 'No description provided'}
                  </Typography>
                  
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => window.open(`https://github.com/stevesurles/${issue.repository}/issues/${issue.number}`, '_blank')}
                      sx={{ 
                        borderColor: '#333',
                        color: '#00ff88',
                        '&:hover': {
                          borderColor: '#00ff88',
                          backgroundColor: 'rgba(0, 255, 136, 0.1)'
                        }
                      }}
                    >
                      View on GitHub
                    </Button>
                    
                    {issue.state === 'open' && (
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ 
                          borderColor: '#333',
                          color: '#ffaa00',
                          '&:hover': {
                            borderColor: '#ffaa00',
                            backgroundColor: 'rgba(255, 170, 0, 0.1)'
                          }
                        }}
                      >
                        Assign to Agent
                      </Button>
                    )}
                  </Box>
                </Box>
              </Collapse>
              
              <Divider />
            </React.Fragment>
          );
        })}
        
        {issues.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <IssueIcon sx={{ fontSize: 48, color: '#333', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              No issues found with label "{filterLabel}"
            </Typography>
            <Button
              variant="text"
              startIcon={<AddIcon />}
              onClick={handleCreateIssue}
              sx={{ mt: 2, color: '#00ff88' }}
            >
              Create First Issue
            </Button>
          </Box>
        )}
      </List>
    </Box>
  );
};

export default IssuePanel;