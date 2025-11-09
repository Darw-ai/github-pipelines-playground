# Complete Setup Guide

This guide will walk you through setting up the GitHub-native AI-powered SDLC platform from scratch.

## Prerequisites

Before you begin, ensure you have:

- [ ] GitHub account with repository access
- [ ] Cloud account (AWS, GCP, or Azure) - optional, for deployments
- [ ] AI API access (AWS Bedrock, OpenAI, or Anthropic)
- [ ] Node.js 18+ installed locally
- [ ] Git installed locally
- [ ] GitHub CLI (`gh`) installed (recommended)

## Part 1: GitHub App Setup

### Step 1: Create GitHub App

See [GITHUB_APP_SETUP.md](GITHUB_APP_SETUP.md) for detailed instructions.

Quick summary:

1. Go to https://github.com/settings/apps/new
2. Fill in:
   - **Name**: "My SDLC Platform"
   - **Homepage URL**: https://your-domain.com (or repo URL)
   - **Callback URL**: https://your-hub.vercel.app/api/auth/callback/github
   - **Webhook**: Uncheck "Active" (not needed)

3. Set permissions:
   - **Repository permissions**:
     - Contents: Read & Write
     - Issues: Read & Write
     - Pull requests: Read & Write
     - Workflows: Read & Write
   - **User permissions**:
     - Email: Read-only

4. Click "Create GitHub App"

5. **Save these values**:
   - App ID
   - Client ID
   - Client Secret (generate one)
   - Private Key (generate and download)

6. Install the app on your repository:
   - Go to "Install App" tab
   - Click "Install"
   - Select repositories

### Step 2: Store GitHub App Credentials

You'll need these for the Platform Hub:

```bash
export GITHUB_APP_ID=123456
export GITHUB_CLIENT_ID=Iv1.abc123
export GITHUB_CLIENT_SECRET=xyz789
export GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----"
```

## Part 2: Repository Setup

### Step 1: Clone This Repository

```bash
git clone https://github.com/YOUR-ORG/github-pipelines-playground.git
cd github-pipelines-playground
```

### Step 2: Copy Workflows to Your Project

```bash
# Navigate to your project
cd /path/to/your/project

# Copy workflows
cp -r /path/to/github-pipelines-playground/.github .
cp -r /path/to/github-pipelines-playground/scripts .

# Make scripts executable
chmod +x scripts/*.sh

# Install script dependencies
cd scripts
npm install
cd ..
```

### Step 3: Configure Repository Secrets

You need to add these secrets to your repository (Settings → Secrets and variables → Actions):

#### Required Secrets

```bash
# AI Configuration
gh secret set AI_API_KEY --body "your-ai-api-key-here"
gh secret set AI_MODEL --body "bedrock/amazon.nova-pro-v1:0"

# Optional: Custom AI endpoint
# gh secret set AI_ENDPOINT --body "https://bedrock-runtime.us-east-1.amazonaws.com"
```

#### For AWS Deployments (Optional)

```bash
# OIDC (recommended)
gh secret set AWS_OIDC_ROLE_ARN --body "arn:aws:iam::ACCOUNT_ID:role/GitHubActionsRole"
gh secret set AWS_REGION --body "us-east-1"
```

See [OIDC_SETUP.md](OIDC_SETUP.md) for OIDC configuration.

#### For Other Cloud Providers

- **GCP**: See [OIDC_SETUP.md](OIDC_SETUP.md#google-cloud-platform)
- **Azure**: See [OIDC_SETUP.md](OIDC_SETUP.md#azure)

### Step 4: Test Workflows

```bash
# Commit and push
git add .github scripts
git commit -m "Add SDLC workflows"
git push

# Verify workflows appear in GitHub
gh workflow list

# You should see:
# - AI Project Scaffolder
# - AI-Powered SDLC Loop
```

## Part 3: AI Provider Setup

### Option A: AWS Bedrock (Recommended)

1. **Enable Amazon Nova Pro** in Bedrock console:
   ```bash
   # Go to AWS Console → Bedrock → Model Access
   # Enable "Amazon Nova Pro" for your region
   ```

2. **If using OIDC** (recommended), skip to [OIDC_SETUP.md](OIDC_SETUP.md)

3. **If using static credentials** (not recommended):
   ```bash
   aws configure
   # Enter access key and secret key
   ```

4. **Set AI configuration**:
   ```bash
   gh secret set AI_MODEL --body "bedrock/amazon.nova-pro-v1:0"
   # No AI_API_KEY needed for Bedrock with OIDC
   ```

### Option B: OpenAI

1. **Get API key** from https://platform.openai.com/api-keys

2. **Set configuration**:
   ```bash
   gh secret set AI_API_KEY --body "sk-..."
   gh secret set AI_MODEL --body "openai/gpt-4-turbo"
   ```

### Option C: Anthropic Claude

1. **Get API key** from https://console.anthropic.com/

2. **Set configuration**:
   ```bash
   gh secret set AI_API_KEY --body "sk-ant-..."
   gh secret set AI_MODEL --body "anthropic/claude-3-5-sonnet-20241022"
   ```

See [AI_PROVIDERS.md](AI_PROVIDERS.md) for more providers.

## Part 4: Platform Hub Deployment (Optional)

The Platform Hub provides a web UI and REST API. It's optional - you can use workflows directly via GitHub UI.

### Option A: Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   cd platform-hub
   npm install
   vercel
   ```

3. **Set environment variables**:
   ```bash
   vercel env add GITHUB_APP_ID
   vercel env add GITHUB_APP_PRIVATE_KEY
   vercel env add GITHUB_CLIENT_ID
   vercel env add GITHUB_CLIENT_SECRET
   vercel env add NEXTAUTH_SECRET
   ```

4. **Deploy to production**:
   ```bash
   vercel --prod
   ```

5. **Update GitHub App callback URL**:
   - Go to https://github.com/settings/apps/YOUR_APP
   - Set "Callback URL" to: `https://your-app.vercel.app/api/auth/callback/github`

### Option B: Docker

```bash
cd platform-hub

# Build
docker build -t platform-hub .

# Run
docker run -p 3000:3000 \
  -e GITHUB_APP_ID="$GITHUB_APP_ID" \
  -e GITHUB_APP_PRIVATE_KEY="$GITHUB_APP_PRIVATE_KEY" \
  -e GITHUB_CLIENT_ID="$GITHUB_CLIENT_ID" \
  -e GITHUB_CLIENT_SECRET="$GITHUB_CLIENT_SECRET" \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  platform-hub
```

### Option C: Skip Platform Hub

You can use the workflows directly:
- Via GitHub UI: Actions → Select workflow → "Run workflow"
- Via API: `gh workflow run scaffold.yml -f repo_name=my-project -f scaffold_prompt="..."`

## Part 5: Testing the Setup

### Test 1: Scaffold a Project

#### Via GitHub UI:

1. Go to your repository → Actions
2. Select "AI Project Scaffolder"
3. Click "Run workflow"
4. Fill in:
   - **repo_name**: `test-api`
   - **scaffold_prompt**: `Create a simple REST API with Express.js that has a /health endpoint`
5. Click "Run workflow"

#### Via API (if Platform Hub deployed):

```bash
curl -X POST https://your-hub.vercel.app/api/scaffold \
  -H "Content-Type: application/json" \
  -d '{
    "targetRepo": "YOUR-ORG/YOUR-REPO",
    "projectName": "test-api",
    "prompt": "Create a simple REST API with Express.js that has a /health endpoint"
  }'
```

#### Expected Result:

1. Issue created: `[Task] Scaffold: test-api`
2. Workflow runs (check Actions tab)
3. PR created with generated code
4. Issue updated with PR link

### Test 2: Run SDLC Cycle

1. **Create a simple project** (or use the scaffolded one):
   ```bash
   # Example: Create a simple SAM app
   mkdir test-app
   cd test-app
   cat > template.yaml <<EOF
   AWSTemplateFormatVersion: '2010-09-09'
   Transform: AWS::Serverless-2016-10-31

   Resources:
     HelloFunction:
       Type: AWS::Serverless::Function
       Properties:
         Runtime: nodejs20.x
         Handler: index.handler
         InlineCode: |
           exports.handler = async () => ({
             statusCode: 200,
             body: JSON.stringify({message: 'Hello World'})
           });

   Outputs:
     FunctionArn:
       Value: !GetAtt HelloFunction.Arn
   EOF

   git add template.yaml
   git commit -m "Add test SAM app"
   git push
   ```

2. **SDLC cycle runs automatically** on push to main

3. **Monitor**:
   - Go to Actions tab → "AI-Powered SDLC Loop"
   - See deploy → test → (fix if needed)

#### Expected Result:

1. Issue created: `[Task] SDLC Deploy: main`
2. Workflow runs:
   - ✅ Detect IaC type (SAM)
   - ✅ Deploy
   - ✅ Generate tests
   - ✅ Run tests
3. Issue updated with results

## Part 6: Verify Everything Works

### Checklist

- [ ] Workflows visible in Actions tab
- [ ] Secrets configured correctly
- [ ] GitHub App installed on repository
- [ ] AI provider accessible
- [ ] Cloud credentials configured (OIDC or static)
- [ ] Platform Hub deployed (if using)
- [ ] Test scaffold completed successfully
- [ ] Test SDLC cycle completed successfully

### Troubleshooting

If anything fails, check:

1. **Workflow logs** (Actions tab → Select run → View logs)
2. **Secret names** (must match exactly)
3. **GitHub App permissions** (must have write access)
4. **AI API key** (valid and not rate-limited)
5. **Cloud credentials** (OIDC role trust policy correct)

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed troubleshooting.

## Next Steps

✅ **Explore examples**: See [examples/](../examples/) for scaffold prompts and IaC projects

✅ **Customize workflows**: Edit `.github/workflows/*.yml` to fit your needs

✅ **Integrate with CI/CD**: Use the REST API in your existing pipelines

✅ **Set up monitoring**: Configure GitHub Actions notifications

✅ **Production hardening**: See [SECURITY.md](SECURITY.md)

## Support

- **Issues**: [GitHub Issues](https://github.com/YOUR-ORG/github-pipelines-playground/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR-ORG/github-pipelines-playground/discussions)
- **Docs**: [docs/](.)

---

**Congratulations! Your SDLC platform is now ready.** 🎉
