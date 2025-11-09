/**
 * GitHub API client for the Platform Hub
 * Handles authentication and API calls to GitHub
 */

import { App, Octokit } from '@octokit/core';
import { createAppAuth } from '@octokit/auth-app';
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export interface ScaffoldInputs {
  owner: string;
  repo: string;
  projectName: string;
  prompt: string;
}

export interface SDLCInputs {
  owner: string;
  repo: string;
  branch?: string;
}

export class GitHubClient {
  private appId: string;
  private privateKey: string;

  constructor() {
    this.appId = process.env.GITHUB_APP_ID!;
    this.privateKey = process.env.GITHUB_APP_PRIVATE_KEY!;

    if (!this.appId || !this.privateKey) {
      throw new Error('GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be set');
    }
  }

  /**
   * Get an authenticated Octokit instance for a specific installation
   */
  private async getInstallationClient(owner: string, repo: string): Promise<InstanceType<typeof MyOctokit>> {
    const auth = createAppAuth({
      appId: this.appId,
      privateKey: this.privateKey,
    });

    // Get installation ID for this repo
    const appOctokit = new MyOctokit({ authStrategy: createAppAuth, auth: { appId: this.appId, privateKey: this.privateKey } });

    const { data: installation } = await appOctokit.request('GET /repos/{owner}/{repo}/installation', {
      owner,
      repo,
    });

    // Create installation-specific client
    const installationOctokit = new MyOctokit({
      authStrategy: createAppAuth,
      auth: {
        appId: this.appId,
        privateKey: this.privateKey,
        installationId: installation.id,
      },
    });

    return installationOctokit;
  }

  /**
   * Dispatch the scaffold workflow
   */
  async dispatchScaffold(inputs: ScaffoldInputs) {
    const octokit = await this.getInstallationClient(inputs.owner, inputs.repo);

    // 1. Create tracking issue
    const issue = await octokit.request('POST /repos/{owner}/{repo}/issues', {
      owner: inputs.owner,
      repo: inputs.repo,
      title: `[Task] Scaffold: ${inputs.projectName}`,
      body: `## 🤖 AI Project Scaffolding

**Project Name:** \`${inputs.projectName}\`

**Specification:**
\`\`\`
${inputs.prompt}
\`\`\`

---

**Status:** Pending
**Created:** ${new Date().toISOString()}

*This issue is automatically managed by the SDLC Platform.*`,
      labels: ['ai-scaffold', 'automated'],
    });

    console.log(`Created tracking issue #${issue.data.number}`);

    // 2. Dispatch workflow
    await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
      owner: inputs.owner,
      repo: inputs.repo,
      workflow_id: 'scaffold.yml',
      ref: 'main',
      inputs: {
        task_issue_number: String(issue.data.number),
        scaffold_prompt: inputs.prompt,
        repo_name: inputs.projectName,
      },
    });

    console.log('Dispatched scaffold workflow');

    return {
      sessionId: String(issue.data.number),
      issueNumber: issue.data.number,
      issueUrl: issue.data.html_url,
    };
  }

  /**
   * Dispatch the SDLC loop workflow
   */
  async dispatchSDLC(inputs: SDLCInputs) {
    const octokit = await this.getInstallationClient(inputs.owner, inputs.repo);

    const branch = inputs.branch || 'main';

    // 1. Create tracking issue
    const issue = await octokit.request('POST /repos/{owner}/{repo}/issues', {
      owner: inputs.owner,
      repo: inputs.repo,
      title: `[Task] SDLC Deploy: ${branch}`,
      body: `## 🚀 SDLC Deployment Cycle

**Repository:** ${inputs.owner}/${inputs.repo}
**Branch:** \`${branch}\`

---

**Status:** Pending
**Created:** ${new Date().toISOString()}

*This issue is automatically managed by the SDLC Platform.*`,
      labels: ['sdlc', 'automated'],
    });

    console.log(`Created tracking issue #${issue.data.number}`);

    // 2. Dispatch workflow
    await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
      owner: inputs.owner,
      repo: inputs.repo,
      workflow_id: 'sdlc-loop.yml',
      ref: branch,
      inputs: {
        task_issue_number: String(issue.data.number),
        branch: branch,
      },
    });

    console.log('Dispatched SDLC workflow');

    return {
      sessionId: String(issue.data.number),
      issueNumber: issue.data.number,
      issueUrl: issue.data.html_url,
    };
  }

  /**
   * Get status of a task by reading the issue
   */
  async getStatus(owner: string, repo: string, issueNumber: number) {
    const octokit = await this.getInstallationClient(owner, repo);

    const issue = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
      owner,
      repo,
      issue_number: issueNumber,
    });

    const comments = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner,
      repo,
      issue_number: issueNumber,
    });

    return {
      sessionId: String(issueNumber),
      status: issue.data.state,
      title: issue.data.title,
      labels: issue.data.labels.map((l: any) => (typeof l === 'string' ? l : l.name)),
      createdAt: issue.data.created_at,
      updatedAt: issue.data.updated_at,
      url: issue.data.html_url,
      comments: comments.data.map((c) => ({
        author: c.user?.login,
        body: c.body,
        createdAt: c.created_at,
      })),
    };
  }

  /**
   * List recent tasks (issues)
   */
  async listTasks(owner: string, repo: string, limit: number = 20) {
    const octokit = await this.getInstallationClient(owner, repo);

    const issues = await octokit.request('GET /repos/{owner}/{repo}/issues', {
      owner,
      repo,
      labels: 'automated',
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: limit,
    });

    return issues.data.map((issue) => ({
      sessionId: String(issue.number),
      issueNumber: issue.number,
      title: issue.title,
      status: issue.state,
      labels: issue.labels.map((l: any) => (typeof l === 'string' ? l : l.name)),
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      url: issue.html_url,
    }));
  }
}

export default GitHubClient;
