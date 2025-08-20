import { Router } from 'express';
import { GitHubService } from '../services/GitHubService';

const router = Router();

router.get('/issues', async (req, res) => {
  const githubService: GitHubService = req.app.locals.githubService;
  const { repo, label } = req.query;
  
  const issues = await githubService.getIssues(
    repo as string | undefined,
    label as string | undefined
  );
  
  res.json(issues);
});

router.post('/issues', async (req, res) => {
  const githubService: GitHubService = req.app.locals.githubService;
  const { repo, title, body, labels } = req.body;
  
  if (!repo || !title) {
    return res.status(400).json({ error: 'Repository and title are required' });
  }
  
  const result = await githubService.createIssue(repo, title, body || '', labels || []);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json(result);
});

router.post('/issues/:repo/:number/close', async (req, res) => {
  const githubService: GitHubService = req.app.locals.githubService;
  const { repo, number } = req.params;
  
  const result = await githubService.closeIssue(repo, parseInt(number));
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json(result);
});

router.post('/issues/:repo/:number/comment', async (req, res) => {
  const githubService: GitHubService = req.app.locals.githubService;
  const { repo, number } = req.params;
  const { comment } = req.body;
  
  if (!comment) {
    return res.status(400).json({ error: 'Comment is required' });
  }
  
  const result = await githubService.addComment(repo, parseInt(number), comment);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json(result);
});

router.post('/issues/:repo/:number/assign', async (req, res) => {
  const githubService: GitHubService = req.app.locals.githubService;
  const { repo, number } = req.params;
  const { assignee } = req.body;
  
  if (!assignee) {
    return res.status(400).json({ error: 'Assignee is required' });
  }
  
  const result = await githubService.assignIssue(repo, parseInt(number), assignee);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json(result);
});

router.post('/issues/:repo/:number/label', async (req, res) => {
  const githubService: GitHubService = req.app.locals.githubService;
  const { repo, number } = req.params;
  const { label } = req.body;
  
  if (!label) {
    return res.status(400).json({ error: 'Label is required' });
  }
  
  const result = await githubService.addLabel(repo, parseInt(number), label);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json(result);
});

router.get('/repos/:repo', async (req, res) => {
  const githubService: GitHubService = req.app.locals.githubService;
  const { repo } = req.params;
  
  const info = await githubService.getRepositoryInfo(repo);
  
  if (!info) {
    return res.status(404).json({ error: 'Repository not found' });
  }
  
  res.json(info);
});

router.get('/repos/:repo/pulls', async (req, res) => {
  const githubService: GitHubService = req.app.locals.githubService;
  const { repo } = req.params;
  const { state } = req.query;
  
  const pulls = await githubService.getPullRequests(
    repo,
    (state as 'open' | 'closed' | 'all') || 'open'
  );
  
  res.json(pulls);
});

router.get('/repos/:repo/runs', async (req, res) => {
  const githubService: GitHubService = req.app.locals.githubService;
  const { repo } = req.params;
  const { limit } = req.query;
  
  const runs = await githubService.getWorkflowRuns(
    repo,
    limit ? parseInt(limit as string) : 10
  );
  
  res.json(runs);
});

export default router;