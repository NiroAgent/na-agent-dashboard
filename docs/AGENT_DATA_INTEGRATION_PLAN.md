# Agent Data Integration Plan

## Current Status: MOCKED DATA IDENTIFIED

### Problem
The dashboard is currently displaying **mocked agent data** from `api_server.py`:
- Sequential agent IDs (`agent-1` to `agent-50`)
- Random values generated on each request
- No real agent connectivity

### Real Agent Sources Available

#### 1. AWS Infrastructure Agents
- **Location**: `api/src/services/LiveDataIntegration.ts`
- **Sources**: EC2 instances, ECS containers, CloudWatch metrics
- **Status**: Code available but not deployed

#### 2. Business Service Agents  
- **Location**: `/na-business-service/ai-agent-deployment/`
- **Types**: QA agents, Developer agents
- **Status**: Real agents performing actual work

#### 3. Autonomous System Agents
- **Location**: `/na-autonomous-system/`
- **Status**: Need to investigate

## Integration Plan

### Phase 1: Deploy Real TypeScript API
1. Fix TypeScript build issues
2. Configure AWS credentials
3. Deploy LiveDataIntegration service
4. Test real AWS agent discovery

### Phase 2: Connect Business Agents
1. Create agent registry endpoint
2. Implement heartbeat system for business agents
3. Aggregate data from multiple agent sources
4. Display real agent status and metrics

### Phase 3: Real-time Updates
1. Implement WebSocket connections
2. Real-time agent status updates
3. Live performance metrics
4. Alert system for agent failures

## Technical Implementation

### API Endpoints Needed
```typescript
GET /api/agents/real           // Real agents from all sources
GET /api/agents/aws            // AWS infrastructure agents
GET /api/agents/business       // Business service agents
GET /api/agents/heartbeat      // Agent health status
POST /api/agents/register      // Agent registration
```

### Data Structure
```typescript
interface RealAgent {
  id: string;
  name: string;
  type: 'aws-ec2' | 'aws-ecs' | 'business-qa' | 'business-dev';
  status: 'active' | 'idle' | 'error' | 'offline';
  lastHeartbeat: string;
  metrics: {
    cpu: number;
    memory: number;
    tasks: {
      completed: number;
      active: number;
      failed: number;
    };
  };
  source: string;
  location?: string;
  cost?: number;
}
```

## Next Steps
1. ✅ Document current mocked data issue
2. 🔄 Fix TypeScript API build
3. ⏳ Deploy real agent integration
4. ⏳ Test with actual agent sources
5. ⏳ Update frontend to display real data

---
*Status: In Progress - Real agent integration required*
