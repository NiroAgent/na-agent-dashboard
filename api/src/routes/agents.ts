import { Router } from 'express';
import { AgentManager } from '../services/AgentManager';
import { RealAgentDiscovery } from '../services/RealAgentDiscovery';

const router = Router();
const realAgentDiscovery = new RealAgentDiscovery();

router.get('/', (req, res) => {
  const agentManager: AgentManager = req.app.locals.agentManager;
  const agents = agentManager.getAllAgents();
  res.json(agents);
});

router.get('/:id', (req, res) => {
  const agentManager: AgentManager = req.app.locals.agentManager;
  const agent = agentManager.getAgent(req.params.id);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  return res.json(agent);
});

router.post('/:id/start', async (req, res) => {
  const agentManager: AgentManager = req.app.locals.agentManager;
  const result = await agentManager.startAgent(req.params.id);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  return res.json(result);
});

router.post('/:id/stop', async (req, res) => {
  const agentManager: AgentManager = req.app.locals.agentManager;
  const result = await agentManager.stopAgent(req.params.id);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  return res.json(result);
});

router.post('/:id/restart', async (req, res) => {
  const agentManager: AgentManager = req.app.locals.agentManager;
  const result = await agentManager.restartAgent(req.params.id);
  return res.json(result);
});

router.get('/status/summary', (req, res) => {
  const agentManager: AgentManager = req.app.locals.agentManager;
  const status = agentManager.getStatus();
  res.json(status);
});

// Real Agent Discovery Routes
router.get('/real', async (req, res) => {
  try {
    const agents = await realAgentDiscovery.getAgents();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get real agents', details: error });
  }
});

router.get('/dashboard/agents', async (req, res) => {
  try {
    const dashboardData = await realAgentDiscovery.getDashboardData();
    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dashboard data', details: error });
  }
});

router.get('/dashboard/live-data', async (req, res) => {
  try {
    const liveData = await realAgentDiscovery.getLiveData();
    res.json(liveData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get live data', details: error });
  }
});

router.get('/dashboard/data-sources', async (req, res) => {
  try {
    const dataSources = await realAgentDiscovery.getDataSources();
    res.json(dataSources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get data sources', details: error });
  }
});

router.post('/dashboard/refresh', async (req, res) => {
  try {
    const result = await realAgentDiscovery.refreshAgents();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh agents', details: error });
  }
});

export default router;