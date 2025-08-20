import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Tooltip, TextField, Select, MenuItem, FormControl } from '@mui/material';
import {
  Clear as ClearIcon,
  ContentCopy as CopyIcon,
  Fullscreen as FullscreenIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon
} from '@mui/icons-material';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

interface TerminalViewProps {
  agentId: string;
  socket: any;
}

const TerminalView: React.FC<TerminalViewProps> = ({ agentId, socket }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const [fontSize, setFontSize] = useState(14);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!terminalRef.current || !socket) return;

    // Create terminal instance
    const term = new Terminal({
      theme: {
        background: '#0a0a0a',
        foreground: '#00ff88',
        cursor: '#00ff88',
        cursorAccent: '#0a0a0a',
        selection: 'rgba(0, 255, 136, 0.3)',
        black: '#000000',
        red: '#ff4444',
        green: '#00ff88',
        yellow: '#ffaa00',
        blue: '#4fc3f7',
        magenta: '#ff00ff',
        cyan: '#00ffff',
        white: '#ffffff',
        brightBlack: '#666666',
        brightRed: '#ff6666',
        brightGreen: '#88ff88',
        brightYellow: '#ffcc00',
        brightBlue: '#6fcff7',
        brightMagenta: '#ff88ff',
        brightCyan: '#88ffff',
        brightWhite: '#ffffff'
      },
      fontSize,
      fontFamily: 'Fira Code, monospace',
      lineHeight: 1.2,
      letterSpacing: 0,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      tabStopWidth: 4
    });

    // Add addons
    const fit = new FitAddon();
    const webLinks = new WebLinksAddon();
    
    term.loadAddon(fit);
    term.loadAddon(webLinks);
    
    // Open terminal in container
    term.open(terminalRef.current);
    fit.fit();

    // Store references
    terminalInstance.current = term;
    fitAddon.current = fit;

    // Subscribe to terminal output
    socket.emit('terminal:subscribe', agentId);

    // Handle incoming data
    const handleTerminalData = (data: { agentId: string; data: string }) => {
      if (data.agentId === agentId) {
        // Apply filter if set
        if (filter) {
          const lines = data.data.split('\n');
          const filtered = lines.filter(line => 
            line.toLowerCase().includes(filter.toLowerCase())
          );
          if (filtered.length > 0) {
            term.write(filtered.join('\n') + '\n');
          }
        } else {
          term.write(data.data);
        }
      }
    };

    socket.on('terminal:data', handleTerminalData);

    // Handle terminal input
    term.onData((data) => {
      socket.emit('terminal:input', { agentId, data });
    });

    // Handle window resize
    const handleResize = () => {
      if (fitAddon.current) {
        fitAddon.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);

    // Initial welcome message
    term.writeln(`\x1b[1;32m┌──────────────────────────────────────┐\x1b[0m`);
    term.writeln(`\x1b[1;32m│  Terminal: Agent ${agentId}          │\x1b[0m`);
    term.writeln(`\x1b[1;32m│  Status: Connected                   │\x1b[0m`);
    term.writeln(`\x1b[1;32m└──────────────────────────────────────┘\x1b[0m`);
    term.writeln('');

    return () => {
      socket.emit('terminal:unsubscribe', agentId);
      socket.off('terminal:data', handleTerminalData);
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [agentId, socket, filter]);

  useEffect(() => {
    // Update font size
    if (terminalInstance.current) {
      terminalInstance.current.options.fontSize = fontSize;
      if (fitAddon.current) {
        fitAddon.current.fit();
      }
    }
  }, [fontSize]);

  const handleClear = () => {
    if (terminalInstance.current) {
      terminalInstance.current.clear();
    }
  };

  const handleCopy = () => {
    if (terminalInstance.current) {
      const selection = terminalInstance.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
  };

  const handleFullscreen = () => {
    if (terminalRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        terminalRef.current.requestFullscreen();
      }
    }
  };

  const handleZoomIn = () => {
    setFontSize(prev => Math.min(prev + 2, 24));
  };

  const handleZoomOut = () => {
    setFontSize(prev => Math.max(prev - 2, 10));
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Terminal Controls */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 1,
        borderBottom: '1px solid #333'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Filter output..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            sx={{
              width: 200,
              '& .MuiOutlinedInput-root': {
                height: 32,
                backgroundColor: '#1a1a1a',
                '& fieldset': {
                  borderColor: '#333'
                },
                '&:hover fieldset': {
                  borderColor: '#00ff88'
                }
              }
            }}
          />
          
          <FormControl size="small">
            <Select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              sx={{
                height: 32,
                backgroundColor: '#1a1a1a',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#333'
                }
              }}
            >
              <MenuItem value={10}>10px</MenuItem>
              <MenuItem value={12}>12px</MenuItem>
              <MenuItem value={14}>14px</MenuItem>
              <MenuItem value={16}>16px</MenuItem>
              <MenuItem value={18}>18px</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box>
          <Tooltip title="Clear Terminal">
            <IconButton size="small" onClick={handleClear} sx={{ color: '#666' }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Copy Selection">
            <IconButton size="small" onClick={handleCopy} sx={{ color: '#666' }}>
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Zoom In">
            <IconButton size="small" onClick={handleZoomIn} sx={{ color: '#666' }}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Zoom Out">
            <IconButton size="small" onClick={handleZoomOut} sx={{ color: '#666' }}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Fullscreen">
            <IconButton size="small" onClick={handleFullscreen} sx={{ color: '#666' }}>
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Terminal Container */}
      <Box 
        ref={terminalRef}
        sx={{ 
          flexGrow: 1,
          backgroundColor: '#0a0a0a',
          p: 1,
          '& .xterm': {
            height: '100%'
          },
          '& .xterm-viewport': {
            backgroundColor: 'transparent !important'
          }
        }}
      />
    </Box>
  );
};

export default TerminalView;