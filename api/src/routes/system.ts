import { Router } from 'express';
import { SystemMonitor } from '../services/SystemMonitor';

const router = Router();

router.get('/metrics', async (req, res) => {
  const systemMonitor: SystemMonitor = req.app.locals.systemMonitor;
  const metrics = await systemMonitor.getMetrics();
  res.json(metrics);
});

router.get('/status', (req, res) => {
  const systemMonitor: SystemMonitor = req.app.locals.systemMonitor;
  const status = systemMonitor.getStatus();
  res.json(status);
});

router.get('/detailed', async (req, res) => {
  const systemMonitor: SystemMonitor = req.app.locals.systemMonitor;
  const detailed = await systemMonitor.getDetailedMetrics();
  res.json(detailed);
});

export default router;