import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitHubIssue {
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

export class GitHubService {
  private owner = 'stevesurles';
  private repositories = [
    'NiroSubs-V2',
    'VisualForgeMediaV2',
    'agent-dashboard'
  ];

  async getIssues(repo?: string, label?: string): Promise<GitHubIssue[]> {
    try {
      const repos = repo ? [repo] : this.repositories;
      const allIssues: GitHubIssue[] = [];

      for (const repoName of repos) {
        const labelFilter = label ? `--label "${label}"` : '';
        const command = `gh issue list --repo ${this.owner}/${repoName} ${labelFilter} --state all --json number,title,body,state,labels,assignee,createdAt,updatedAt --limit 100`;
        
        try {
          const { stdout } = await execAsync(command);
          const issues = JSON.parse(stdout || '[]');
          
          // Add repository name to each issue
          const mappedIssues = issues.map((issue: any) => ({
            number: issue.number,
            title: issue.title,
            body: issue.body,
            state: issue.state.toLowerCase(),
            labels: issue.labels,
            assignee: issue.assignee,
            created_at: issue.createdAt,
            updated_at: issue.updatedAt,
            repository: repoName
          }));
          
          allIssues.push(...mappedIssues);
        } catch (error) {
          console.error(`Error fetching issues for ${repoName}:`, error);
        }
      }

      // Sort by created date (newest first)
      allIssues.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return allIssues;
    } catch (error) {
      console.error('Error fetching GitHub issues:', error);
      return [];
    }
  }

  async createIssue(
    repo: string,
    title: string,
    body: string,
    labels: string[]
  ): Promise<{ success: boolean; issueNumber?: number; error?: string }> {
    try {
      const labelStr = labels.length > 0 ? `--label "${labels.join(',')}"` : '';
      const command = `gh issue create --repo ${this.owner}/${repo} --title "${title}" --body "${body}" ${labelStr}`;
      
      const { stdout } = await execAsync(command);
      
      // Extract issue number from output
      const match = stdout.match(/\/issues\/(\d+)/);
      const issueNumber = match ? parseInt(match[1]) : undefined;
      
      return {
        success: true,
        issueNumber
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create issue'
      };
    }
  }

  async closeIssue(repo: string, issueNumber: number): Promise<{ success: boolean; error?: string }> {
    try {
      const command = `gh issue close ${issueNumber} --repo ${this.owner}/${repo}`;
      await execAsync(command);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close issue'
      };
    }
  }

  async addComment(
    repo: string,
    issueNumber: number,
    comment: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const command = `gh issue comment ${issueNumber} --repo ${this.owner}/${repo} --body "${comment}"`;
      await execAsync(command);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add comment'
      };
    }
  }

  async assignIssue(
    repo: string,
    issueNumber: number,
    assignee: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const command = `gh issue edit ${issueNumber} --repo ${this.owner}/${repo} --add-assignee "${assignee}"`;
      await execAsync(command);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign issue'
      };
    }
  }

  async addLabel(
    repo: string,
    issueNumber: number,
    label: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const command = `gh issue edit ${issueNumber} --repo ${this.owner}/${repo} --add-label "${label}"`;
      await execAsync(command);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add label'
      };
    }
  }

  async getRepositoryInfo(repo: string) {
    try {
      const command = `gh repo view ${this.owner}/${repo} --json name,description,defaultBranchRef,isPrivate,diskUsage,createdAt,updatedAt`;
      const { stdout } = await execAsync(command);
      
      return JSON.parse(stdout);
    } catch (error) {
      console.error(`Error fetching repo info for ${repo}:`, error);
      return null;
    }
  }

  async getPullRequests(repo: string, state: 'open' | 'closed' | 'all' = 'open') {
    try {
      const command = `gh pr list --repo ${this.owner}/${repo} --state ${state} --json number,title,state,author,createdAt,updatedAt,labels --limit 50`;
      const { stdout } = await execAsync(command);
      
      return JSON.parse(stdout || '[]');
    } catch (error) {
      console.error(`Error fetching PRs for ${repo}:`, error);
      return [];
    }
  }

  async getWorkflowRuns(repo: string, limit: number = 10) {
    try {
      const command = `gh run list --repo ${this.owner}/${repo} --json databaseId,name,status,conclusion,createdAt --limit ${limit}`;
      const { stdout } = await execAsync(command);
      
      return JSON.parse(stdout || '[]');
    } catch (error) {
      console.error(`Error fetching workflow runs for ${repo}:`, error);
      return [];
    }
  }
}