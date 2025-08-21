# NA Agent Dashboard UI Design

## Overview
Complete UI implementation for the NA Agent Dashboard with real-time monitoring, chat/voice interface, and oversight capabilities.

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         Header Bar                              │
│  [Logo] NA Agent Dashboard    [Stats] [Costs] [Settings] [User] │
└─────────────────────────────────────────────────────────────────┘
┌──────────────┬──────────────────────────────┬──────────────────┐
│              │                              │                  │
│   Agent      │      Main Work Area          │   Chat/Voice     │
│   Sidebar    │                              │   Interface      │
│              │   - Agent Grid View          │                  │
│   [List]     │   - Terminal View            │   [Chat UI]      │
│   [Filter]   │   - Metrics Dashboard        │   [Voice Btn]    │
│   [Search]   │   - Issue Tracker            │   [History]      │
│              │                              │                  │
└──────────────┴──────────────────────────────┴──────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                      Status Bar                                 │
│ Connected: ✓ | Agents: 7 | Tasks: 12 | Cost: $0.45/hr          │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Header Bar
- **Logo & Title**: NA Agent Dashboard branding
- **Live Stats**: Real-time agent count, active tasks, success rate
- **Cost Monitor**: Current hourly/daily/monthly costs
- **Settings**: Configuration options (GitHub Copilot vs Bedrock toggle)
- **User Menu**: Profile, logout, preferences

### 2. Agent Sidebar
```tsx
interface AgentSidebar {
  agents: Agent[];
  selectedAgent: string | null;
  onSelectAgent: (agentId: string) => void;
  filters: {
    status: 'all' | 'idle' | 'busy' | 'offline';
    type: string[];
    platform: string[];
  };
}
```

Features:
- Live agent status indicators (green/yellow/red dots)
- Quick filters by type/status/platform
- Search agents by name/ID
- Drag to reorder/group agents

### 3. Main Work Area (Multi-View)

#### Agent Grid View
```tsx
interface AgentCard {
  agent: Agent;
  metrics: AgentMetrics;
  onMessage: () => void;
  onTask: () => void;
  onInterrupt: () => void;
}
```

Card Features:
- Agent avatar/icon based on type
- Live status (with animation for busy)
- Current task display
- Quick action buttons (Message, Task, Stop)
- Mini metrics (CPU, Memory, Tasks completed)
- Cost display

#### Terminal View
```tsx
interface TerminalView {
  agentId: string;
  logs: LogEntry[];
  onCommand: (cmd: string) => void;
  splitView: boolean;
}
```

Features:
- Real-time log streaming
- Command input with history
- Split view for multiple agents
- Color-coded output (info/warn/error)
- Copy/export logs

#### Metrics Dashboard
```tsx
interface MetricsDashboard {
  timeRange: '1h' | '24h' | '7d' | '30d';
  metrics: {
    cpu: TimeSeriesData;
    memory: TimeSeriesData;
    tasks: TimeSeriesData;
    costs: TimeSeriesData;
    successRate: TimeSeriesData;
  };
}
```

Charts:
- CPU/Memory usage over time (line chart)
- Task completion rate (bar chart)
- Cost breakdown by agent (pie chart)
- Success rate trends (area chart)
- GitHub issue resolution time (histogram)

#### Issue Tracker
```tsx
interface IssueTracker {
  issues: GitHubIssue[];
  assignments: Map<number, string>; // issueId -> agentId
  onAssign: (issueId: number, agentId: string) => void;
  onReassign: (issueId: number, newAgentId: string) => void;
}
```

Features:
- GitHub issues list with labels
- Drag & drop to assign to agents
- Status tracking (open/in-progress/resolved)
- Priority indicators
- Quick actions (reassign, close, comment)

### 4. Chat/Voice Interface Panel

```tsx
interface ChatVoicePanel {
  mode: 'chat' | 'voice';
  conversation: Message[];
  isListening: boolean;
  onSendMessage: (text: string) => void;
  onVoiceCommand: (audio: Blob) => void;
  onInterrupt: (agentId: string, command: string) => void;
}
```

Features:
- **Chat Mode**:
  - Message input with @ mentions for agents
  - Command shortcuts (/stop, /priority, /status)
  - Message history with timestamps
  - Agent responses with typing indicator

- **Voice Mode**:
  - Push-to-talk button
  - Voice activity detection
  - Speech-to-text display
  - Voice command confirmation

- **Oversight Controls**:
  - Emergency stop button (red, prominent)
  - Priority override selector
  - Interrupt current task button
  - Broadcast to all agents

### 5. Status Bar
```tsx
interface StatusBar {
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  agentCount: { total: number; active: number; idle: number };
  taskCount: { pending: number; processing: number; completed: number };
  costRate: { hourly: number; daily: number };
  alerts: Alert[];
}
```

Features:
- WebSocket connection indicator
- Live counters with sparklines
- Cost rate with trend arrow
- Alert notifications (click to expand)

## Interactive Features

### 1. Real-time Updates
- WebSocket for live data
- Optimistic UI updates
- Reconnection handling
- Offline queue for commands

### 2. Drag & Drop
- Assign issues to agents
- Reorder agent priority
- Move tasks between agents
- Upload files to agents

### 3. Keyboard Shortcuts
```
Ctrl+K: Quick command palette
Ctrl+/: Focus chat input
Ctrl+Space: Voice activation
Ctrl+S: Emergency stop all
Ctrl+1-9: Switch to agent 1-9
Esc: Cancel current operation
```

### 4. Notifications
- Toast notifications for task completion
- Sound alerts for critical events
- Browser notifications (if permitted)
- Status bar alerts

## Theme & Styling

### Color Palette
```css
:root {
  --primary: #4F46E5; /* Indigo */
  --success: #10B981; /* Green */
  --warning: #F59E0B; /* Amber */
  --danger: #EF4444;  /* Red */
  --dark: #1F2937;    /* Gray-800 */
  --light: #F9FAFB;   /* Gray-50 */
  
  /* Agent Type Colors */
  --architect: #8B5CF6;  /* Purple */
  --developer: #3B82F6;  /* Blue */
  --devops: #14B8A6;     /* Teal */
  --qa: #F97316;         /* Orange */
  --security: #DC2626;   /* Red */
  --coordinator: #6366F1; /* Indigo */
  --chat-voice: #10B981; /* Green */
}
```

### Dark Mode
```css
[data-theme="dark"] {
  --bg-primary: #0F172A;
  --bg-secondary: #1E293B;
  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --border: #334155;
}
```

## Responsive Design

### Desktop (1920px+)
- Full layout with all panels
- Multi-column agent grid
- Split terminal views

### Laptop (1366px-1919px)
- Collapsible chat panel
- 3-column agent grid
- Single terminal view

### Tablet (768px-1365px)
- Slide-out agent sidebar
- 2-column agent grid
- Stacked metrics charts
- Bottom sheet for chat

### Mobile (320px-767px)
- Tab navigation
- Single column layout
- Swipe between views
- Floating action buttons

## Accessibility

### WCAG 2.1 AA Compliance
- Keyboard navigation for all features
- Screen reader announcements
- Focus indicators
- Color contrast ratios (4.5:1 minimum)
- ARIA labels and roles

### Keyboard Navigation
```
Tab: Next element
Shift+Tab: Previous element
Enter: Activate button/link
Space: Toggle checkbox/button
Arrow keys: Navigate lists/grids
Escape: Close modal/dropdown
```

## Performance Optimization

### Rendering
- Virtual scrolling for long lists
- React.memo for expensive components
- Lazy loading for charts
- Debounced search inputs

### Data Management
- Redux Toolkit for state
- RTK Query for caching
- WebSocket message batching
- Pagination for large datasets

### Code Splitting
```tsx
const AgentGrid = lazy(() => import('./components/AgentGrid'));
const MetricsDashboard = lazy(() => import('./components/MetricsDashboard'));
const ChatVoicePanel = lazy(() => import('./components/ChatVoicePanel'));
```

## Testing Requirements

### Unit Tests
- Component rendering
- Event handlers
- State updates
- Utility functions

### Integration Tests
- API communication
- WebSocket messages
- Agent interactions
- Issue assignments

### E2E Tests (Playwright)
- User workflows
- Real-time updates
- Error scenarios
- Performance metrics

## Implementation Checklist

- [ ] Header component with live stats
- [ ] Agent sidebar with filters
- [ ] Agent grid view with cards
- [ ] Terminal view with command input
- [ ] Metrics dashboard with charts
- [ ] Issue tracker with drag & drop
- [ ] Chat interface with message history
- [ ] Voice interface with speech recognition
- [ ] Oversight controls (interrupt, stop)
- [ ] Status bar with notifications
- [ ] Dark mode toggle
- [ ] Responsive layouts
- [ ] Keyboard shortcuts
- [ ] WebSocket integration
- [ ] Error handling
- [ ] Loading states
- [ ] Empty states
- [ ] Accessibility features
- [ ] Performance optimization
- [ ] Comprehensive testing