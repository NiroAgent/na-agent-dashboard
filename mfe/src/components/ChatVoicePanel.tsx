import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Send as SendIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Stop as StopIcon,
  Chat as ChatIcon,
  RecordVoiceOver as VoiceIcon,
  Warning as WarningIcon,
  BroadcastOnPersonal as BroadcastIcon,
  PriorityHigh as PriorityIcon,
  Person as PersonIcon,
  SmartToy as BotIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

interface Message {
  id: string;
  type: 'user' | 'agent' | 'system';
  agentId?: string;
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface ChatVoicePanelProps {
  agents: any[];
  onSendMessage: (agentId: string, message: string) => void;
  onInterrupt: (agentId: string, command: string) => void;
  onEmergencyStop: () => void;
  onBroadcast: (message: string) => void;
}

const ChatVoicePanel: React.FC<ChatVoicePanelProps> = ({
  agents,
  onSendMessage,
  onInterrupt,
  onEmergencyStop,
  onBroadcast
}) => {
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setSpeechTranscript(prev => prev + finalTranscript);
          handleVoiceCommand(finalTranscript.trim());
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsRecording(false);
      };
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, message]);

    // Check for commands
    if (inputMessage.startsWith('/')) {
      handleCommand(inputMessage);
    } else if (selectedAgent) {
      onSendMessage(selectedAgent, inputMessage);
      
      // Simulate agent response
      setTimeout(() => {
        const response: Message = {
          id: `msg-${Date.now() + 1}`,
          type: 'agent',
          agentId: selectedAgent,
          content: `Processing: "${inputMessage}"`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, response]);
      }, 1000);
    } else if (inputMessage.startsWith('@')) {
      // Handle @ mentions
      const parts = inputMessage.split(' ');
      const agentMention = parts[0].substring(1);
      const agent = agents.find(a => a.name.toLowerCase().includes(agentMention.toLowerCase()));
      
      if (agent) {
        onSendMessage(agent.id, parts.slice(1).join(' '));
      }
    } else {
      // Broadcast to all agents
      onBroadcast(inputMessage);
    }

    setInputMessage('');
  };

  const handleCommand = (command: string) => {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case '/stop':
        if (parts[1] === 'all') {
          onEmergencyStop();
          addSystemMessage('🛑 EMERGENCY STOP - All agents halted');
        } else if (parts[1]) {
          const agent = agents.find(a => a.id === parts[1] || a.name.toLowerCase().includes(parts[1]));
          if (agent) {
            onInterrupt(agent.id, 'stop');
            addSystemMessage(`⏸️ Stopped agent: ${agent.name}`);
          }
        }
        break;

      case '/priority':
        if (parts[1] && parts[2]) {
          const agent = agents.find(a => a.id === parts[1] || a.name.toLowerCase().includes(parts[1]));
          if (agent) {
            onInterrupt(agent.id, `priority:${parts[2]}`);
            addSystemMessage(`📌 Set priority ${parts[2]} for ${agent.name}`);
          }
        }
        break;

      case '/status':
        addSystemMessage(`📊 Active agents: ${agents.filter(a => a.status === 'busy').length}/${agents.length}`);
        break;

      case '/help':
        addSystemMessage(`
📚 Available commands:
/stop [agent|all] - Stop agent(s)
/priority [agent] [high|medium|low] - Set priority
/status - Show agent status
/broadcast [message] - Send to all agents
@[agent] [message] - Send to specific agent
        `);
        break;

      case '/broadcast':
        onBroadcast(parts.slice(1).join(' '));
        addSystemMessage(`📢 Broadcast sent to all agents`);
        break;

      default:
        addSystemMessage(`❓ Unknown command: ${cmd}`);
    }
  };

  const handleVoiceCommand = (transcript: string) => {
    const lower = transcript.toLowerCase();

    // Emergency commands
    if (lower.includes('stop all agents') || lower.includes('emergency stop')) {
      onEmergencyStop();
      addSystemMessage('🛑 VOICE: Emergency stop activated');
      return;
    }

    // Agent-specific commands
    const agentKeywords = ['developer', 'architect', 'devops', 'qa', 'security', 'coordinator'];
    for (const keyword of agentKeywords) {
      if (lower.includes(keyword)) {
        const agent = agents.find(a => a.type === keyword);
        if (agent) {
          if (lower.includes('stop')) {
            onInterrupt(agent.id, 'stop');
            addSystemMessage(`⏸️ VOICE: Stopped ${agent.name}`);
          } else if (lower.includes('pause')) {
            onInterrupt(agent.id, 'pause');
            addSystemMessage(`⏸️ VOICE: Paused ${agent.name}`);
          } else if (lower.includes('resume')) {
            onInterrupt(agent.id, 'resume');
            addSystemMessage(`▶️ VOICE: Resumed ${agent.name}`);
          } else {
            // Send as message
            onSendMessage(agent.id, transcript);
            addSystemMessage(`🎤 VOICE → ${agent.name}: ${transcript}`);
          }
          return;
        }
      }
    }

    // Default: broadcast to all
    onBroadcast(transcript);
    addSystemMessage(`📢 VOICE broadcast: ${transcript}`);
  };

  const addSystemMessage = (content: string) => {
    const message: Message = {
      id: `sys-${Date.now()}`,
      type: 'system',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setIsRecording(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
      setIsRecording(true);
      setSpeechTranscript('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Mode Toggle */}
      <Box sx={{ p: 2, borderBottom: '1px solid #333' }}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, newMode) => newMode && setMode(newMode)}
          size="small"
          fullWidth
        >
          <ToggleButton value="chat">
            <ChatIcon sx={{ mr: 1 }} />
            Chat
          </ToggleButton>
          <ToggleButton value="voice">
            <VoiceIcon sx={{ mr: 1 }} />
            Voice
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Oversight Controls */}
      <Box sx={{ p: 2, borderBottom: '1px solid #333', display: 'flex', gap: 1 }}>
        <Tooltip title="Emergency Stop All Agents">
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<StopIcon />}
            onClick={onEmergencyStop}
            sx={{ flex: 1 }}
          >
            STOP ALL
          </Button>
        </Tooltip>
        
        <Tooltip title="Broadcast to All">
          <IconButton
            color="primary"
            onClick={() => {
              const msg = prompt('Broadcast message:');
              if (msg) onBroadcast(msg);
            }}
          >
            <BroadcastIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Set Priority">
          <IconButton color="warning">
            <PriorityIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Agent Selector */}
      <Box sx={{ p: 1, borderBottom: '1px solid #333' }}>
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
          <Chip
            label="All Agents"
            onClick={() => setSelectedAgent(null)}
            color={!selectedAgent ? 'primary' : 'default'}
            variant={!selectedAgent ? 'filled' : 'outlined'}
          />
          {agents.map(agent => (
            <Chip
              key={agent.id}
              label={agent.name}
              onClick={() => setSelectedAgent(agent.id)}
              color={selectedAgent === agent.id ? 'primary' : 'default'}
              variant={selectedAgent === agent.id ? 'filled' : 'outlined'}
              icon={
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: agent.status === 'busy' ? '#f59e0b' : 
                            agent.status === 'idle' ? '#10b981' : '#ef4444'
                  }}
                />
              }
            />
          ))}
        </Box>
      </Box>

      {/* Messages Area */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <List>
          {messages.map((message) => (
            <ListItem key={message.id} alignItems="flex-start">
              <ListItemAvatar>
                <Avatar sx={{ 
                  bgcolor: message.type === 'user' ? '#3b82f6' : 
                          message.type === 'agent' ? '#10b981' : '#6b7280' 
                }}>
                  {message.type === 'user' ? <PersonIcon /> :
                   message.type === 'agent' ? <BotIcon /> : <WarningIcon />}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">
                      {message.type === 'agent' && message.agentId
                        ? agents.find(a => a.id === message.agentId)?.name || 'Agent'
                        : message.type === 'user' ? 'You' : 'System'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(message.timestamp), 'HH:mm:ss')}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Typography>
                }
              />
            </ListItem>
          ))}
          <div ref={messagesEndRef} />
        </List>
      </Box>

      {/* Input Area */}
      <Box sx={{ p: 2, borderTop: '1px solid #333' }}>
        {mode === 'chat' ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              multiline
              maxRows={3}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                selectedAgent 
                  ? `Message to ${agents.find(a => a.id === selectedAgent)?.name}...`
                  : "Type / for commands, @ to mention agents..."
              }
              variant="outlined"
              size="small"
            />
            <IconButton 
              color="primary" 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
            >
              <SendIcon />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            {isRecording && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Listening...
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {speechTranscript || '...'}
                </Typography>
              </Box>
            )}
            <IconButton
              size="large"
              onClick={toggleListening}
              sx={{
                width: 80,
                height: 80,
                bgcolor: isRecording ? '#ef4444' : '#10b981',
                '&:hover': {
                  bgcolor: isRecording ? '#dc2626' : '#059669'
                }
              }}
            >
              {isRecording ? <MicOffIcon sx={{ fontSize: 40 }} /> : <MicIcon sx={{ fontSize: 40 }} />}
            </IconButton>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              {isRecording ? 'Click to stop' : 'Click to speak'}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ChatVoicePanel;