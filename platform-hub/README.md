# Platform Hub - GitHub SDLC Platform

This is the **Platform Hub** - a Next.js application that serves as the API and Web UI for the GitHub-native AI-powered SDLC platform.

## Features

- 🔐 **GitHub OAuth Authentication**: Secure login via GitHub
- 🤖 **AI Project Scaffolding**: Generate new projects from prompts
- 🚀 **SDLC Automation**: Deploy → Test → Fix workflow management
- 📊 **Real-time Status**: Track progress via GitHub Issues
- 🔌 **REST API**: Integrate with external CI/CD pipelines

## Architecture

```
User/Pipeline → Platform Hub (Next.js) → GitHub API
                    ↓
              Dispatch Workflow
                    ↓
              GitHub Actions
                    ↓
              Update Issue (state)
```

## Setup

### Prerequisites

1. Node.js 18+ installed
2. A GitHub App created (see [GitHub App Setup Guide](../docs/GITHUB_APP_SETUP.md))
3. Repository with SDLC workflows configured

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your GitHub App credentials
nano .env.local
```

### Configuration

Edit `.env.local`:

```env
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_CLIENT_ID=Iv1.abc123
GITHUB_CLIENT_SECRET=your_secret

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

### Development

```bash
# Run development server
npm run dev

# Open browser
open http://localhost:3000
```

### Production Deployment

#### Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables
vercel env add GITHUB_APP_ID
vercel env add GITHUB_APP_PRIVATE_KEY
vercel env add GITHUB_CLIENT_ID
vercel env add GITHUB_CLIENT_SECRET
vercel env add NEXTAUTH_SECRET

# Deploy to production
vercel --prod
```

#### Docker

```bash
# Build image
docker build -t platform-hub .

# Run container
docker run -p 3000:3000 \
  -e GITHUB_APP_ID=123456 \
  -e GITHUB_APP_PRIVATE_KEY="..." \
  -e GITHUB_CLIENT_ID="..." \
  -e GITHUB_CLIENT_SECRET="..." \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET="..." \
  platform-hub
```

## API Reference

### Authentication

All API requests require authentication via NextAuth session (OAuth).

For pipeline integration, use a GitHub Personal Access Token with `repo` and `workflow` scopes.

### Endpoints

#### POST /api/scaffold

Initiate AI project scaffolding.

**Request:**
```json
{
  "targetRepo": "owner/repo",
  "projectName": "my-new-project",
  "prompt": "Create a REST API for managing todos..."
}
```

**Response:**
```json
{
  "sessionId": "123",
  "issueNumber": 123,
  "issueUrl": "https://github.com/owner/repo/issues/123",
  "status": "pending"
}
```

#### POST /api/sdlc-deploy

Initiate SDLC deployment cycle.

**Request:**
```json
{
  "targetRepo": "owner/repo",
  "branch": "main"
}
```

**Response:**
```json
{
  "sessionId": "124",
  "issueNumber": 124,
  "issueUrl": "https://github.com/owner/repo/issues/124",
  "status": "pending"
}
```

#### GET /api/status/[issueNumber]?repo=owner/repo

Get status of a task.

**Response:**
```json
{
  "sessionId": "123",
  "status": "closed",
  "title": "[Task] Scaffold: my-new-project",
  "labels": ["completed", "ai-scaffold"],
  "createdAt": "2025-11-09T00:00:00Z",
  "updatedAt": "2025-11-09T00:05:00Z",
  "url": "https://github.com/owner/repo/issues/123",
  "comments": [
    {
      "author": "github-actions[bot]",
      "body": "✅ Scaffolding complete! PR #124",
      "createdAt": "2025-11-09T00:05:00Z"
    }
  ]
}
```

## Security

### Production Checklist

- [ ] Use HTTPS only (enforced by Vercel)
- [ ] Set strong `NEXTAUTH_SECRET` (32+ random bytes)
- [ ] Rotate GitHub App private key regularly
- [ ] Enable rate limiting (TODO)
- [ ] Review GitHub App permissions (least-privilege)
- [ ] Enable Vercel logs retention
- [ ] Set up monitoring and alerts

### Security Headers

The app sets these security headers by default:
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `X-XSS-Protection`
- `Referrer-Policy`

## Troubleshooting

### "App not installed" error

Ensure the GitHub App is installed on the target repository:
1. Go to https://github.com/apps/YOUR_APP_NAME
2. Click "Install" or "Configure"
3. Select the repository

### "Permission denied" error

Check GitHub App permissions:
- `issues: write`
- `contents: write`
- `workflows: write`
- `pull_requests: write`

### Authentication issues

1. Verify `.env.local` has correct credentials
2. Check NEXTAUTH_URL matches your deployment URL
3. Ensure GitHub App callback URL is correct

## License

MIT
