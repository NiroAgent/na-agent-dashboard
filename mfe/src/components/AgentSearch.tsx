import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
  Tooltip,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { LiveAgentMetrics } from '../types/policy';

interface AgentSearchProps {
  agents: LiveAgentMetrics[];
  onFilteredAgents: (agents: LiveAgentMetrics[]) => void;
}

const AgentSearch: React.FC<AgentSearchProps> = ({ agents, onFilteredAgents }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // Get unique values for filters
  const uniqueStatuses = ['all', ...Array.from(new Set(agents.map(agent => agent.status)))];
  const uniqueTypes = ['all', ...Array.from(new Set(agents.map(agent => agent.type)))];
  const uniquePlatforms = ['all', ...Array.from(new Set(agents.map(agent => agent.platform)))];

  // Filter agents based on search criteria
  useEffect(() => {
    let filtered = agents;

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(agent => 
        agent.name.toLowerCase().includes(query) ||
        agent.type.toLowerCase().includes(query) ||
        agent.id.toLowerCase().includes(query) ||
        agent.platform.toLowerCase().includes(query) ||
        (agent.capabilities && agent.capabilities.some(cap => 
          cap.toLowerCase().includes(query)
        ))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(agent => agent.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(agent => agent.type === typeFilter);
    }

    // Platform filter
    if (platformFilter !== 'all') {
      filtered = filtered.filter(agent => agent.platform === platformFilter);
    }

    onFilteredAgents(filtered);
  }, [searchQuery, statusFilter, typeFilter, platformFilter, agents, onFilteredAgents]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPlatformFilter('all');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (statusFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (platformFilter !== 'all') count++;
    return count;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'busy':
        return '#00ff88';
      case 'idle':
        return '#ffaa00';
      case 'error':
        return '#ff4444';
      case 'offline':
        return '#666';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 2, 
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
        border: '1px solid #333'
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center">
          <SearchIcon sx={{ color: '#00ff88', mr: 1 }} />
          <Typography variant="h6" sx={{ color: '#00ff88' }}>
            Agent Search & Filter
          </Typography>
        </Box>
        <Box display="flex" alignItems="center">
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            {agents.length} total agents
          </Typography>
          {getActiveFiltersCount() > 0 && (
            <Tooltip title="Clear all filters">
              <IconButton onClick={handleClearSearch} size="small">
                <ClearIcon sx={{ color: '#ff4444' }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
        {/* Search Input */}
        <Box flex={1} minWidth="250px">
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Search agents by name, type, ID, platform, or capability..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#666' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery('')}
                    sx={{ color: '#666' }}
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#333',
                  },
                  '&:hover fieldset': {
                    borderColor: '#00ff88',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#00ff88',
                  },
                }
              }
            }}
            sx={{ '& .MuiInputBase-input': { color: 'white' } }}
          />
        </Box>

        {/* Status Filter */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel sx={{ color: '#666', '&.Mui-focused': { color: '#00ff88' } }}>
            Status
          </InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
            sx={{
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#333',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#00ff88',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#00ff88',
              },
              '& .MuiSelect-icon': {
                color: '#666',
              }
            }}
          >
            {uniqueStatuses.map(status => (
              <MenuItem key={status} value={status}>
                <Box display="flex" alignItems="center">
                  {status !== 'all' && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(status),
                        mr: 1
                      }}
                    />
                  )}
                  {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Type Filter */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel sx={{ color: '#666', '&.Mui-focused': { color: '#00ff88' } }}>
            Type
          </InputLabel>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            label="Type"
            sx={{
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#333',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#00ff88',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#00ff88',
              },
              '& .MuiSelect-icon': {
                color: '#666',
              }
            }}
          >
            {uniqueTypes.map(type => (
              <MenuItem key={type} value={type}>
                {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Platform Filter */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel sx={{ color: '#666', '&.Mui-focused': { color: '#00ff88' } }}>
            Platform
          </InputLabel>
          <Select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            label="Platform"
            sx={{
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#333',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#00ff88',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#00ff88',
              },
              '& .MuiSelect-icon': {
                color: '#666',
              }
            }}
          >
            {uniquePlatforms.map(platform => (
              <MenuItem key={platform} value={platform}>
                {platform === 'all' ? 'All Platforms' : platform.charAt(0).toUpperCase() + platform.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Active Filters Display */}
      {getActiveFiltersCount() > 0 && (
        <Box mt={2} display="flex" gap={1} flexWrap="wrap" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Active filters:
          </Typography>
          {searchQuery && (
            <Chip
              label={`Search: "${searchQuery}"`}
              size="small"
              onDelete={() => setSearchQuery('')}
              sx={{ 
                backgroundColor: '#00ff88', 
                color: 'black',
                '& .MuiChip-deleteIcon': { color: 'black' }
              }}
            />
          )}
          {statusFilter !== 'all' && (
            <Chip
              label={`Status: ${statusFilter}`}
              size="small"
              onDelete={() => setStatusFilter('all')}
              sx={{ 
                backgroundColor: getStatusColor(statusFilter), 
                color: 'white',
                '& .MuiChip-deleteIcon': { color: 'white' }
              }}
            />
          )}
          {typeFilter !== 'all' && (
            <Chip
              label={`Type: ${typeFilter}`}
              size="small"
              onDelete={() => setTypeFilter('all')}
              sx={{ 
                backgroundColor: '#ffaa00', 
                color: 'black',
                '& .MuiChip-deleteIcon': { color: 'black' }
              }}
            />
          )}
          {platformFilter !== 'all' && (
            <Chip
              label={`Platform: ${platformFilter}`}
              size="small"
              onDelete={() => setPlatformFilter('all')}
              sx={{ 
                backgroundColor: '#4fc3f7', 
                color: 'black',
                '& .MuiChip-deleteIcon': { color: 'black' }
              }}
            />
          )}
        </Box>
      )}
    </Paper>
  );
};

export default AgentSearch;