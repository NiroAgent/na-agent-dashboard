import { Router } from 'express';
import { AgentManager } from '../services/AgentManager';

const router = Router();

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

export default router;