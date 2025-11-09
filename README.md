# GitHub-Native AI-Powered SDLC Platform

> **Version 2.1** - Centralized Reusable Workflows Architecture

A fully automated **Software Development Lifecycle (SDLC) platform** powered by AI, running natively on **GitHub Actions** and **GitHub Apps**. No external infrastructure required.

**✨ Now with Reusable Workflows** - Client repositories only need 2 tiny wrapper files + secrets. No code duplication!

## 🚀 Features

### 1. **AI Project Scaffolding** ✨ NEW
Generate complete, production-ready projects from natural language prompts:
- Accepts specifications (product requirements, security policies, compliance docs)
- AI generates full project structure, code, configs, and documentation
- Creates PR for review before merge
- Supports any language/framework

### 2. **SDLC Automation**
Automated Deploy → Test → Fix cycle:
- **Deploy**: Detects IaC type (SAM, CDK, Terraform, Serverless, CloudFormation) and deploys automatically
- **Test**: AI generates and executes sanity tests
- **Fix**: On failure, AI analyzes errors and creates fix PRs

### 3. **Dual Access**
- **Web UI**: Human-friendly interface for managing projects
- **REST API**: Integrate with existing CI/CD pipelines

### 4. **Enterprise-Ready Security**
- GitHub OAuth authentication
- OIDC for cloud access (no static credentials!)
- Encrypted secrets management
- Full audit trail via GitHub Issues

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Components](#components)
- [Setup Guide](#setup-guide)
- [Usage](#usage)
- [Documentation](#documentation)

---

## ⚡ Quick Start (For Client Repositories)

### Prerequisites

1. **GitHub Account** with a repository
2. **AI API Access** (AWS Bedrock, OpenAI, or Anthropic)
3. **Cloud Account** (AWS/GCP/Azure) - optional, only for deployments

### 1. Copy Wrapper Workflows (2 files!)

```bash
# Create workflows directory
mkdir -p .github/workflows

# Copy the example wrapper workflows
curl -o .github/workflows/scaffold.yml https://raw.githubusercontent.com/Darw-ai/github-pipelines-playground/main/examples/client-workflows/scaffold.yml
curl -o .github/workflows/sdlc-loop.yml https://raw.githubusercontent.com/Darw-ai/github-pipelines-playground/main/examples/client-workflows/sdlc-loop.yml

# Commit
git add .github/workflows/
git commit -m "Add SDLC platform workflows"
git push
```

**That's it! No scripts to maintain, no dependencies to install.** 🎉

### 2. Configure Secrets

Add these secrets to **your repository** (Settings → Secrets and variables → Actions):

**For Anthropic (Claude):**
```bash
gh secret set AI_API_KEY --body "sk-ant-your-api-key"
gh secret set AI_MODEL --body "anthropic/claude-3-5-sonnet-20241022"
```

**For OpenAI:**
```bash
gh secret set AI_API_KEY --body "sk-your-api-key"
gh secret set AI_MODEL --body "openai/gpt-4-turbo"
```

**For AWS Bedrock:**
```bash
gh secret set AI_MODEL --body "bedrock/amazon.nova-pro-v1:0"
gh secret set AWS_OIDC_ROLE_ARN --body "arn:aws:iam::ACCOUNT:role/GitHubActionsRole"
gh secret set AWS_REGION --body "us-east-1"
```

### 3. Deploy Platform Hub (Optional)

If you want the web UI:

```bash
cd platform-hub
npm install
cp .env.example .env.local
# Edit .env.local with your GitHub App credentials

# Deploy to Vercel
vercel --prod
```

### 4. Test It!

**Option A: Via API**
```bash
curl -X POST https://your-platform-hub.vercel.app/api/scaffold \
  -H "Content-Type: application/json" \
  -d '{
    "targetRepo": "YOUR-ORG/YOUR-REPO",
    "projectName": "my-api",
    "prompt": "Create a REST API for managing todos with user authentication"
  }'
```

**Option B: Via Workflow Dispatch** (GitHub UI)
1. Go to Actions → `AI Project Scaffolder`
2. Click "Run workflow"
3. Fill in inputs
4. Watch the magic happen! ✨

---

## 🏗️ Architecture

### Centralized Reusable Workflows (New in v2.1!)

```
┌──────────────────────────────────────────────────────────┐
│  SDLC Platform (Darw-ai/github-pipelines-playground)     │
│  - Reusable workflows (.github/workflows/)               │
│  - Scripts (scripts/)                                    │
│  - Single source of truth                                │
│  - No client maintenance needed                          │
└────────────┬─────────────────────────────────────────────┘
             │
             │ (workflow_call - calls centralized workflows)
             │
    ┌────────┴────────┬─────────────┬─────────────┐
    ▼                 ▼             ▼             ▼
┌─────────┐      ┌─────────┐   ┌─────────┐   ┌─────────┐
│ Client-1│      │ Client-2│   │ Client-3│   │ Client-N│
│         │      │         │   │         │   │         │
│ 2 files │      │ 2 files │   │ 2 files │   │ 2 files │
│ + secrets│     │ + secrets│  │ + secrets│  │ + secrets│
│         │      │         │   │         │   │         │
│ NO      │      │ NO      │   │ NO      │   │ NO      │
│ scripts!│      │ scripts!│   │ scripts!│   │ scripts!│
└─────────┘      └─────────┘   └─────────┘   └─────────┘

Client repositories only need:
  ✅ .github/workflows/scaffold.yml (10 lines)
  ✅ .github/workflows/sdlc-loop.yml (10 lines)
  ✅ Repository secrets
  ❌ No scripts to copy
  ❌ No dependencies to install
  ❌ No maintenance overhead
```

### Traditional Architecture (Platform Hub - Optional)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS                                   │
│   Web Browser  │  API Client  │  GitHub UI                     │
└────────┬────────────────┬──────────────┬───────────────────────┘
         │                │              │
         ▼                ▼              ▼
┌────────────────────────────────────────────────────────────────┐
│              Platform Hub (Next.js on Vercel)                  │
│  - GitHub OAuth                                                │
│  - REST API: /api/scaffold, /api/sdlc-deploy                  │
│  - Dispatch workflows via GitHub API                           │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
                  Calls Reusable Workflows
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│               GitHub Issues (State Management)                 │
│  Issue #123: [Task] Scaffold: my-api                          │
│  Issue #124: [Task] SDLC Deploy: main                         │
└────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Centralized Platform**: Single source of truth, no code duplication
2. **100% GitHub-Native**: No external databases, queues, or servers (except optional Platform Hub)
3. **AI-Agnostic**: Works with any AI provider (Bedrock, OpenAI, Anthropic, Azure)
4. **Secure by Default**: OIDC, encrypted secrets, least-privilege permissions
5. **Observable**: Full audit trail via GitHub Issues
6. **Zero Maintenance**: Clients automatically get platform updates
7. **Cost-Effective**: Pay only for GitHub Actions minutes (~$0-50/month)

---

## 🧩 Components

### 1. Workflows (`.github/workflows/`)

| Workflow | Purpose | Triggers |
|----------|---------|----------|
| `scaffold.yml` | AI project generation | `workflow_dispatch` |
| `sdlc-loop.yml` | Deploy→Test→Fix cycle | `push`, `workflow_dispatch` |

### 2. Scripts (`scripts/`)

| Script | Purpose |
|--------|---------|
| `detect-iac.sh` | Detects IaC type (SAM, CDK, Terraform, etc.) |
| `run-deployment.sh` | Executes deployment based on IaC type |
| `extract-outputs.sh` | Extracts API URLs and outputs from deployed stack |
| `ai-client.js` | Universal AI client (Bedrock, OpenAI, Anthropic) |
| `ai-generate-plan.js` | Generates scaffold plan |
| `ai-generate-file.js` | Generates individual file via AI |
| `ai-generate-tests.js` | Generates sanity tests |
| `ai-generate-fix.js` | Generates fix patch |
| `execute-tests.js` | Runs HTTP tests |

### 3. Platform Hub (`platform-hub/`)

Next.js application providing:
- Web UI for scaffolding and SDLC management
- REST API for pipeline integration
- GitHub OAuth authentication
- GitHub API client

---

## 📚 Setup Guide

See detailed guides in `docs/`:

1. [**SETUP.md**](docs/SETUP.md) - Complete setup instructions
2. [**GITHUB_APP_SETUP.md**](docs/GITHUB_APP_SETUP.md) - GitHub App configuration
3. [**OIDC_SETUP.md**](docs/OIDC_SETUP.md) - Cloud OIDC configuration (AWS/GCP/Azure)
4. [**AI_PROVIDERS.md**](docs/AI_PROVIDERS.md) - AI provider configuration

Quick summary:

```bash
# 1. Create GitHub App
# See: docs/GITHUB_APP_SETUP.md

# 2. Install workflows
cp -r .github YOUR_REPO/.github
cp -r scripts YOUR_REPO/scripts

# 3. Configure secrets
gh secret set AI_API_KEY --body "..."
gh secret set AI_MODEL --body "bedrock/amazon.nova-pro-v1:0"
gh secret set AWS_OIDC_ROLE_ARN --body "arn:aws:..."

# 4. Deploy Platform Hub (optional)
cd platform-hub
vercel --prod

# 5. Test!
# Trigger workflow via GitHub UI or API
```

---

## 🎯 Usage

### Scaffold a New Project

**Via API:**
```bash
curl -X POST https://platform-hub.vercel.app/api/scaffold \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -d '{
    "targetRepo": "myorg/myrepo",
    "projectName": "user-management-api",
    "prompt": "Create a secure REST API for user management with:\n- User registration and login\n- JWT authentication\n- PostgreSQL database\n- Docker support\n- Comprehensive tests"
  }'
```

**Via GitHub UI:**
1. Go to Actions → `AI Project Scaffolder`
2. Click "Run workflow"
3. Fill in:
   - Project name: `user-management-api`
   - Prompt: `Create a secure REST API...`
4. Submit

**Result:**
- Issue #123 created for tracking
- AI generates 15-20 files
- PR #124 created with all code
- Review and merge!

### Run SDLC Cycle

**Via API:**
```bash
curl -X POST https://platform-hub.vercel.app/api/sdlc-deploy \
  -H "Content-Type: application/json" \
  -d '{
    "targetRepo": "myorg/myrepo",
    "branch": "main"
  }'
```

**Via Push:**
```bash
git push origin main
# SDLC cycle runs automatically
```

**What happens:**
1. **Deploy**: Detects IaC, runs `sam deploy` / `cdk deploy` / etc.
2. **Test**: AI scans code, generates HTTP tests, executes them
3. **Fix** (on failure): AI analyzes logs, creates fix PR

### Monitor Progress

**Via API:**
```bash
curl https://platform-hub.vercel.app/api/status/123?repo=myorg/myrepo
```

**Via GitHub:**
1. Go to Issues → #123
2. See real-time comments from workflows
3. Check linked PRs

---

## 📖 Documentation

### Core Docs

- [**ARCHITECTURE.md**](ARCHITECTURE.md) - System architecture and design
- [**SETUP.md**](docs/SETUP.md) - Setup and installation
- [**API.md**](docs/API.md) - API reference
- [**TROUBLESHOOTING.md**](docs/TROUBLESHOOTING.md) - Common issues

### Guides

- [**GITHUB_APP_SETUP.md**](docs/GITHUB_APP_SETUP.md) - Creating a GitHub App
- [**OIDC_SETUP.md**](docs/OIDC_SETUP.md) - Configuring OIDC (AWS/GCP/Azure)
- [**AI_PROVIDERS.md**](docs/AI_PROVIDERS.md) - AI provider setup
- [**SECURITY.md**](docs/SECURITY.md) - Security best practices

### Examples

- [**examples/scaffold-prompts/**](examples/scaffold-prompts/) - Example scaffold prompts
- [**examples/iac-projects/**](examples/iac-projects/) - Example IaC projects

---

## 🔒 Security

### Current Security Features

✅ **Authentication**: GitHub OAuth
✅ **Authorization**: GitHub App permissions (least-privilege)
✅ **Secrets**: Encrypted GitHub Secrets
✅ **Cloud Access**: OIDC (no static credentials)
✅ **Audit Trail**: All actions logged in GitHub Issues
✅ **Code Review**: All AI-generated code requires PR approval

### Production Checklist

- [x] HTTPS only (enforced by Vercel/GitHub)
- [x] Encrypted secrets
- [x] OIDC for cloud access
- [x] Security headers set
- [ ] Rate limiting (TODO)
- [ ] DDoS protection (use Cloudflare/Vercel)
- [ ] Regular security audits

---

## 📊 Cost Comparison

| Component | Old (AWS) | New (GitHub) |
|-----------|-----------|--------------|
| Compute | ECS Fargate: $20-30/mo | GitHub Actions: Free tier (2000 min) |
| API | API Gateway: $3-5/mo | Vercel Free tier |
| Database | DynamoDB: $5/mo | GitHub Issues: Free |
| Networking | NAT Gateway: $30-40/mo | N/A |
| **Total** | **$60-80/mo** | **$0-20/mo** |

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

- AWS Bedrock team for Amazon Nova Pro
- GitHub Actions team
- Vercel for amazing DX

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/YOUR-ORG/github-pipelines-playground/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR-ORG/github-pipelines-playground/discussions)
- **Docs**: [docs/](docs/)

---

**Built with ❤️ by developers, for developers.**
