# GitHub-Native AI-Powered SDLC Platform - Architecture

## Version: 2.0.0
**Last Updated**: November 2025
**Migration**: AWS (ECS/Lambda) → GitHub Actions + GitHub App

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Design Principles](#core-design-principles)
3. [System Architecture](#system-architecture)
4. [Component Details](#component-details)
5. [Security Architecture](#security-architecture)
6. [Data Flow](#data-flow)
7. [Deployment Model](#deployment-model)

---

## Executive Summary

This is a **GitHub-native AI-powered SDLC platform** that provides:

1. **AI Project Scaffolding**: Generate complete, compliant projects from prompts and specification documents
2. **SDLC Automation**: Deploy → Test → Fix cycle with AI-powered debugging
3. **Dual Access**: Web UI for humans, REST API for pipelines
4. **Enterprise Security**: GitHub OAuth, encrypted secrets, OIDC for cloud access

### Key Differentiators

- ✅ **100% GitHub-Native**: No external infrastructure required
- ✅ **AI-Driven**: Uses any AI API (Bedrock, OpenAI, Anthropic) via configurable endpoints
- ✅ **State in Issues**: Full audit trail, no external database
- ✅ **Multi-Cloud**: Supports AWS, GCP, Azure via OIDC federation
- ✅ **Secure by Design**: Least-privilege permissions, encrypted secrets

---

## Core Design Principles

### 1. GitHub-Native Computing

| Previous (AWS) | New (GitHub) |
|----------------|--------------|
| ECS Fargate Tasks | GitHub Actions Jobs |
| Lambda Functions | GitHub Actions Workflows |
| DynamoDB Table | GitHub Issues + Comments |
| S3 Artifacts | GitHub Artifacts |
| API Gateway | GitHub App (Vercel/Fly.io) |

### 2. Separation of Concerns

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Presentation (Platform Hub)                    │
│ - Web UI (React/Next.js)                               │
│ - REST API (Express.js)                                │
│ - GitHub OAuth Authentication                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Orchestration (GitHub Workflows)              │
│ - scaffold.yml (Project Generation)                     │
│ - sdlc-loop.yml (Deploy-Test-Fix)                      │
│ - Reusable Actions                                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Execution (Scripts & AI)                      │
│ - IaC Detection & Deployment                           │
│ - AI Integration (Test/Fix Generation)                 │
│ - Test Execution                                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 4: State Management (GitHub Issues)              │
│ - Session Tracking                                      │
│ - Audit Logs                                            │
│ - Status Updates                                        │
└─────────────────────────────────────────────────────────┘
```

### 3. AI Agnostic Design

All AI interactions go through a **unified AI client interface**:

```typescript
interface AIClient {
  generatePlan(prompt: string): Promise<ScaffoldPlan>;
  generateCode(filePrompt: string): Promise<string>;
  generateTests(codeContext: string, apiUrl: string): Promise<TestPlan>;
  generateFix(errorLog: string, codeContext: string): Promise<FixPatch>;
}
```

**Supported Providers** (via config):
- AWS Bedrock (Amazon Nova Pro, Claude)
- OpenAI (GPT-4, GPT-4 Turbo)
- Anthropic (Claude 3.5 Sonnet)
- Azure OpenAI
- Custom API endpoints

---

## System Architecture

### High-Level Overview

```
┌────────────────────────────────────────────────────────────────┐
│                         USERS                                  │
│  ┌──────────────┐              ┌──────────────┐               │
│  │  Web Browser │              │ CI/CD System │               │
│  │  (OAuth)     │              │  (API Token) │               │
│  └──────┬───────┘              └──────┬───────┘               │
│         │                             │                        │
└─────────┼─────────────────────────────┼────────────────────────┘
          │                             │
          ▼                             ▼
┌────────────────────────────────────────────────────────────────┐
│               PLATFORM HUB (GitHub App)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Next.js App (Vercel/Fly.io)                             │  │
│  │                                                          │  │
│  │ API Routes:                                             │  │
│  │  POST /api/scaffold     → Create Issue + Dispatch      │  │
│  │  POST /api/sdlc-deploy  → Create Issue + Dispatch      │  │
│  │  GET  /api/status/:id   → Query Issue                  │  │
│  │                                                          │  │
│  │ Web UI:                                                 │  │
│  │  /dashboard             → List all tasks               │  │
│  │  /scaffold              → New project form              │  │
│  │  /deploy                → Trigger SDLC                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
          │ (GitHub API)
          │ 1. Create Issue
          │ 2. Dispatch Workflow
          ▼
┌────────────────────────────────────────────────────────────────┐
│          GITHUB REPOSITORY (.github/workflows/)                │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ scaffold.yml                                            │  │
│  │  Jobs:                                                  │  │
│  │   1. generate-plan     → AI creates file structure     │  │
│  │   2. generate-code     → AI writes each file (matrix)  │  │
│  │   3. commit-scaffold   → PR with new code              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ sdlc-loop.yml                                           │  │
│  │  Jobs:                                                  │  │
│  │   1. deploy            → Detect IaC, run deployment    │  │
│  │   2. test              → AI generates & runs tests     │  │
│  │   3. fix (on failure)  → AI creates fix PR             │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Scripts (./scripts/)                                    │  │
│  │  - detect-iac.sh       → Identify deployment type      │  │
│  │  - run-deployment.sh   → Execute IaC tool              │  │
│  │  - ai-generate-tests.js → Call AI for test plan       │  │
│  │  - ai-generate-fix.js   → Call AI for fix patch       │  │
│  │  - execute-tests.js     → Run HTTP tests               │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
          │ (Update Progress)
          ▼
┌────────────────────────────────────────────────────────────────┐
│              STATE LAYER (GitHub Issues)                       │
│                                                                │
│  Issue #123: [Task] Scaffold: my-api                          │
│  ├─ Comment 1: 🤖 AI Scaffolding initiated...                 │
│  ├─ Comment 2: ✅ Plan generated (12 files)                   │
│  ├─ Comment 3: 📝 Generated src/index.ts                      │
│  ├─ Comment 4: 📝 Generated package.json                      │
│  └─ Comment 5: ✅ PR created: #124                            │
│                                                                │
│  Issue #125: [Task] SDLC Deploy: main                         │
│  ├─ Comment 1: 🚀 Deployment initiated...                     │
│  ├─ Comment 2: ✅ Deployed (API: https://...)                 │
│  ├─ Comment 3: 🧪 Running sanity tests...                     │
│  ├─ Comment 4: ❌ Test failed (500 error on /users)           │
│  └─ Comment 5: 🔧 Fix PR created: #126                        │
└────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### Component 1: Platform Hub (GitHub App)

**Technology Stack**: Next.js 14 (App Router), TypeScript, TailwindCSS

**Deployment**: Vercel (recommended) or Fly.io

**Purpose**:
- User authentication via GitHub OAuth
- Web UI for project scaffolding and SDLC management
- REST API for pipeline integration
- GitHub API client (creates issues, dispatches workflows)

**Directory Structure**:
```
platform-hub/
├── app/
│   ├── api/
│   │   ├── scaffold/route.ts       # POST /api/scaffold
│   │   ├── sdlc-deploy/route.ts    # POST /api/sdlc-deploy
│   │   └── status/[id]/route.ts    # GET /api/status/:id
│   ├── dashboard/page.tsx
│   ├── scaffold/page.tsx
│   └── layout.tsx
├── lib/
│   ├── github-client.ts            # GitHub API wrapper
│   ├── auth.ts                     # NextAuth.js config
│   └── types.ts
├── .env.example
└── package.json
```

**Key Files**:

1. **`lib/github-client.ts`** - GitHub API Client
```typescript
import { App } from '@octokit/app';

export class GitHubClient {
  private app: App;

  constructor() {
    this.app = new App({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
    });
  }

  async dispatchScaffold(repo: string, inputs: ScaffoldInputs) {
    const octokit = await this.getInstallationClient(repo);

    // 1. Create tracking issue
    const issue = await octokit.rest.issues.create({
      owner: inputs.owner,
      repo: inputs.repo,
      title: `[Task] Scaffold: ${inputs.projectName}`,
      body: `**Prompt**: ${inputs.prompt}\n\n**Status**: Pending`,
      labels: ['ai-scaffold', 'automated'],
    });

    // 2. Dispatch workflow
    await octokit.rest.actions.createWorkflowDispatch({
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

    return { sessionId: String(issue.data.number), issueUrl: issue.data.html_url };
  }
}
```

2. **`app/api/scaffold/route.ts`** - API Route
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { GitHubClient } from '@/lib/github-client';
import { getServerSession } from 'next-auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectName, prompt, targetRepo } = await req.json();

  // Validate inputs
  if (!projectName || !prompt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const client = new GitHubClient();
  const result = await client.dispatchScaffold(targetRepo, {
    owner: session.user.login,
    repo: targetRepo,
    projectName,
    prompt,
  });

  return NextResponse.json(result, { status: 202 });
}
```

**Security**:
- GitHub App permissions: `issues:write`, `contents:write`, `workflows:write`, `pull_requests:write`
- OAuth scopes: `read:user`, `repo`
- Rate limiting: 10 req/min per user (using Vercel Edge Config)
- Input validation: Regex patterns, max length limits

---

### Component 2: Scaffold Workflow

**File**: `.github/workflows/scaffold.yml`

**Purpose**: Generate a complete project from AI prompts

**Inputs**:
- `task_issue_number`: GitHub Issue ID for tracking
- `scaffold_prompt`: Full specification (product, security, compliance)
- `repo_name`: Name of the new project

**Jobs**:

1. **`generate-plan`**: Calls AI to create a project plan (file structure, dependencies)
   - Output: JSON with `files: [{path, prompt}]` and `dependencies`

2. **`generate-code`**: Matrix job that generates each file in parallel
   - Uses `strategy.matrix` from plan JSON
   - Each iteration calls AI for one file
   - Uploads files as artifacts

3. **`commit-scaffold`**: Combines all files, creates PR
   - Downloads all artifacts
   - Creates branch `ai-scaffold/{repo_name}`
   - Commits and pushes
   - Creates PR with summary
   - Updates tracking issue

**Security**:
- Permissions: `contents:write`, `pull-requests:write`, `issues:write` (least-privilege)
- AI API key: Stored in `secrets.AI_API_KEY` (encrypted at rest)
- Code review required: PR must be manually reviewed before merge

---

### Component 3: SDLC Loop Workflow

**File**: `.github/workflows/sdlc-loop.yml`

**Purpose**: Deploy → Test → Fix cycle

**Triggers**:
- `push` to `main` (after PR merge)
- `workflow_dispatch` (from Platform Hub)

**Jobs**:

1. **`deploy`**:
   - Detects IaC type (calls `scripts/detect-iac.sh`)
   - Configures cloud credentials (OIDC)
   - Runs deployment (calls `scripts/run-deployment.sh`)
   - Extracts outputs (API URL, resources)
   - Saves deployment log + outputs as artifacts
   - Updates tracking issue

2. **`test`** (needs: deploy):
   - Downloads deployment outputs
   - Scans codebase for API structure
   - Calls AI to generate test plan (calls `scripts/ai-generate-tests.js`)
   - Executes tests (calls `scripts/execute-tests.js`)
   - Saves test results
   - Updates tracking issue

3. **`fix`** (needs: [deploy, test], if: failure()):
   - Only runs if deploy or test fails
   - Downloads error logs
   - Calls AI to generate fix (calls `scripts/ai-generate-fix.js`)
   - Applies patch
   - Creates PR with fix
   - Updates tracking issue

**Concurrency Control**:
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Permissions**:
```yaml
permissions:
  contents: write        # To push fix branches
  pull-requests: write   # To create PRs
  issues: write          # To update tracking issue
  id-token: write        # For OIDC (cloud access)
```

---

### Component 4: Execution Scripts

**Location**: `scripts/`

#### 1. `detect-iac.sh`
```bash
#!/bin/bash
# Detects IaC type by scanning for marker files
# Outputs: sam|cdk|terraform|serverless|cloudformation|lambda

if [ -f "template.yaml" ] && grep -q "AWS::Serverless" template.yaml; then
  echo "sam"
elif [ -f "cdk.json" ]; then
  echo "cdk"
elif [ -f "serverless.yml" ] || [ -f "serverless.yaml" ]; then
  echo "serverless"
elif ls *.tf 1> /dev/null 2>&1; then
  echo "terraform"
elif [ -f "cloudformation.yaml" ] || [ -f "stack.yaml" ]; then
  echo "cloudformation"
elif [ -f "index.js" ] && [ -f "package.json" ]; then
  echo "lambda"
else
  echo "unknown"
  exit 1
fi
```

#### 2. `run-deployment.sh`
```bash
#!/bin/bash
set -e

IAC_TYPE=$(./scripts/detect-iac.sh)
STACK_NAME="sdlc-${GITHUB_RUN_ID}"

case $IAC_TYPE in
  sam)
    sam build
    sam deploy --stack-name $STACK_NAME --no-confirm-changeset --no-fail-on-empty-changeset
    ;;
  cdk)
    npm install
    npx cdk deploy --all --require-approval never
    ;;
  terraform)
    terraform init
    terraform apply -auto-approve
    ;;
  # ... other types
esac

# Extract outputs
./scripts/extract-outputs.sh $IAC_TYPE $STACK_NAME > outputs.json
```

#### 3. `ai-generate-tests.js`
```javascript
const fs = require('fs');
const { callAI } = require('./ai-client');

async function main() {
  const outputs = JSON.parse(fs.readFileSync('outputs.json'));
  const apiUrl = outputs.ApiUrl || outputs.api_url || outputs.endpoint;

  // Scan codebase for API structure
  const codeContext = await scanCodebase();

  // Call AI
  const testPlan = await callAI({
    model: process.env.AI_MODEL || 'bedrock/amazon.nova-pro-v1:0',
    prompt: `You are a test engineer. Based on this API structure:\n\n${codeContext}\n\nAnd this deployed API URL: ${apiUrl}\n\nGenerate a comprehensive sanity test plan in JSON format with this structure:\n{tests: [{name, description, steps: [{action, endpoint, method, body?, expectedStatus, storeVariables?}]}]}`,
    maxTokens: 8192,
  });

  fs.writeFileSync('sanity-tests.json', JSON.stringify(testPlan));
}

main();
```

#### 4. `execute-tests.js`
```javascript
const axios = require('axios');
const fs = require('fs');

async function main() {
  const tests = JSON.parse(fs.readFileSync('sanity-tests.json'));
  const outputs = JSON.parse(fs.readFileSync('outputs.json'));
  const apiUrl = outputs.ApiUrl || outputs.api_url;

  const variables = { apiUrl };
  let allPassed = true;

  for (const test of tests.tests) {
    console.log(`Running test: ${test.name}`);

    for (const step of test.steps) {
      const url = replaceVariables(step.endpoint, variables);
      const fullUrl = `${apiUrl}${url}`;

      try {
        const response = await axios({
          method: step.method,
          url: fullUrl,
          data: step.body,
        });

        if (response.status !== step.expectedStatus) {
          throw new Error(`Expected ${step.expectedStatus}, got ${response.status}`);
        }

        // Store variables for next steps
        if (step.storeVariables) {
          for (const [key, path] of Object.entries(step.storeVariables)) {
            variables[key] = getNestedValue(response.data, path);
          }
        }

        console.log(`✅ ${step.action} - PASSED`);
      } catch (error) {
        console.error(`❌ ${step.action} - FAILED: ${error.message}`);
        allPassed = false;
      }
    }
  }

  process.exit(allPassed ? 0 : 1);
}

main();
```

#### 5. `ai-generate-fix.js`
```javascript
const fs = require('fs');
const { callAI } = require('./ai-client');

async function main() {
  const errorLog = fs.readFileSync('./logs/deploy.log', 'utf-8');
  const codeContext = await scanCodebase();

  const fixPatch = await callAI({
    model: process.env.AI_MODEL || 'bedrock/amazon.nova-pro-v1:0',
    prompt: `You are a DevOps engineer. This deployment failed with this error:\n\n${errorLog}\n\nHere is the codebase:\n\n${codeContext}\n\nGenerate a git patch file to fix this error. Return ONLY the patch file contents, nothing else.`,
    maxTokens: 8192,
  });

  fs.writeFileSync('fix.patch', fixPatch);
}

main();
```

---

## Security Architecture

### 1. Authentication & Authorization

```
┌───────────────────────────────────────────────────────────┐
│ User Authentication Flow                                  │
│                                                           │
│ User → GitHub OAuth → Platform Hub → Session Cookie     │
│                                                           │
│ API Token Flow                                            │
│ Pipeline → API Token → Platform Hub → Validate Token    │
└───────────────────────────────────────────────────────────┘
```

**Platform Hub** (Next.js):
- Uses NextAuth.js with GitHub provider
- Session stored in encrypted JWT (httpOnly cookie)
- API tokens: GitHub Personal Access Tokens with `repo`, `workflow` scopes

**GitHub Actions**:
- Uses GITHUB_TOKEN (auto-generated, scoped to repo)
- No long-lived credentials in workflows

### 2. Secrets Management

| Secret | Storage | Access |
|--------|---------|--------|
| GitHub App Private Key | Vercel Environment Variables | Platform Hub only |
| AI API Keys | GitHub Repository Secrets | Workflows only |
| Cloud Credentials | OIDC (no static keys) | Workflows only |

**OIDC Configuration** (AWS example):
```yaml
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v3
  with:
    role-to-assume: arn:aws:iam::ACCOUNT:role/GitHubActionsRole
    aws-region: us-east-1
```

### 3. Network Security

- **Platform Hub**: HTTPS only (Vercel enforces TLS 1.3)
- **GitHub Actions**: Outbound only (no inbound connections)
- **AI API**: TLS 1.2+ required

### 4. Code Security

- **Input Validation**: All user inputs sanitized (regex, max length)
- **Dependency Scanning**: Dependabot enabled
- **Secret Scanning**: GitHub Advanced Security enabled
- **Code Review**: All PRs require approval (including AI-generated)

---

## Data Flow

### Scaffold Flow

```
1. User submits scaffold request
   ↓
2. Platform Hub creates Issue #123
   ↓
3. Platform Hub dispatches scaffold.yml
   ↓
4. Job 'generate-plan' → AI returns:
   {
     files: [
       {path: "src/index.ts", prompt: "Express server..."},
       {path: "package.json", prompt: "Dependencies..."}
     ],
     dependencies: {...}
   }
   ↓
5. Job 'generate-code' (matrix) → AI generates each file
   ↓
6. Job 'commit-scaffold' → Creates PR #124
   ↓
7. Updates Issue #123: "✅ PR created: #124"
```

### SDLC Flow

```
1. PR merged to main
   ↓
2. Workflow triggers automatically
   ↓
3. Job 'deploy' → Runs IaC tool → Outputs: {ApiUrl: "..."}
   ↓
4. Job 'test' → AI generates tests → Executes HTTP requests
   ↓
   ├─ ✅ All tests pass → Issue updated: "✅ SDLC complete"
   │
   └─ ❌ Test fails → Job 'fix' triggered
      ↓
      AI analyzes error → Generates patch → Creates PR #125
      ↓
      Issue updated: "🔧 Fix PR: #125"
```

---

## Deployment Model

### Platform Hub Deployment (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd platform-hub
vercel --prod

# Set environment variables
vercel env add GITHUB_APP_ID
vercel env add GITHUB_APP_PRIVATE_KEY
vercel env add NEXTAUTH_SECRET
```

### Repository Setup

```bash
# 1. Create repository
gh repo create my-sdlc-platform --public

# 2. Enable GitHub Actions
gh api repos/:owner/:repo/actions/permissions -X PUT -f enabled=true

# 3. Add secrets
gh secret set AI_API_KEY --body "..."
gh secret set AWS_OIDC_ROLE_ARN --body "arn:aws:iam::..."

# 4. Copy workflows
cp -r .github my-sdlc-platform/
cp -r scripts my-sdlc-platform/
```

---

## Monitoring & Observability

### Metrics

- **GitHub Actions**: Workflow run times, success rates (visible in Actions tab)
- **Platform Hub**: Request count, latency (Vercel Analytics)
- **Issues**: Track session count, average time to completion

### Logging

- **Workflow Logs**: All stdout/stderr captured in GitHub Actions logs
- **Issue Comments**: Human-readable progress updates
- **Artifacts**: Full logs available for download (30-day retention)

### Alerts

- **Workflow Failures**: GitHub notifications
- **Platform Hub Errors**: Vercel integrations (Slack, email)

---

## Cost Analysis

| Component | Monthly Cost |
|-----------|--------------|
| GitHub Actions | Free tier: 2,000 min/month (then $0.008/min) |
| Vercel (Platform Hub) | Free tier (Hobby) or $20/month (Pro) |
| AI API Calls | Variable ($0.01-0.10 per request) |
| **Total** | **$0-50/month** (vs. $40-70 for AWS) |

**Cost Optimization**:
- Use matrix jobs to parallelize (faster = cheaper)
- Cache dependencies (`actions/cache`)
- Use free AI tiers (AWS Bedrock free tier, OpenAI credits)

---

## Migration Path (AWS → GitHub)

For teams with the existing AWS system:

1. **Run in Parallel**: Deploy GitHub version to new repos, keep AWS for production
2. **Gradual Migration**: Move one workflow at a time (start with `deploy`, then `test`, then `fix`)
3. **Data Export**: Export DynamoDB sessions to GitHub Issues (migration script provided)
4. **Sunset AWS**: Once stable, run `cdk destroy` on AWS stack

---

## Next Steps

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for detailed setup instructions.
