# Client Workflow Examples

These are example wrapper workflows that client repositories can use to call the centralized SDLC platform workflows.

## 🚀 Quick Setup for Client Repositories

### Step 1: Copy Workflows to Your Repository

Copy the workflow files to your client repository:

```bash
# Create workflows directory if it doesn't exist
mkdir -p .github/workflows

# Copy the example workflows
cp examples/client-workflows/scaffold.yml .github/workflows/
cp examples/client-workflows/sdlc-loop.yml .github/workflows/
```

### Step 2: Configure Repository Secrets

Add these secrets to your repository (Settings → Secrets and variables → Actions):

#### Required for All Workflows

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `AI_API_KEY` | API key for your AI provider | `sk-ant-...` (Anthropic) or `sk-...` (OpenAI) |
| `AI_MODEL` | AI model identifier | `anthropic/claude-3-5-sonnet-20241022` |

#### Optional Secrets

| Secret Name | Description | When Needed |
|-------------|-------------|-------------|
| `AI_ENDPOINT` | Custom AI endpoint URL | Only if using custom endpoint |
| `AWS_OIDC_ROLE_ARN` | AWS IAM role for OIDC | For AWS deployments (recommended) |
| `AWS_REGION` | AWS region | For AWS deployments (default: us-east-1) |

### Step 3: Commit and Push

```bash
git add .github/workflows/
git commit -m "Add SDLC platform workflows"
git push
```

### Step 4: Test the Workflows

#### Test Scaffolding:
1. Go to Actions → "Scaffold New Project"
2. Click "Run workflow"
3. Fill in:
   - `repo_name`: "my-test-api"
   - `task_issue_number`: "1"
   - `scaffold_prompt`: "Create a simple REST API with Express.js"
4. Click "Run workflow"

#### Test SDLC Loop:
- Either push to main/develop branch
- Or manually trigger via Actions → "SDLC Deploy-Test-Fix"

---

## 📋 What This Setup Provides

### ✅ **Zero Code Duplication**
- No need to copy scripts or maintain them
- All logic is in the central SDLC platform repository
- Updates to the platform automatically apply to all clients

### ✅ **Minimal Client Setup**
- Only 2 small wrapper workflow files needed
- Just configure secrets once
- No scripts, no dependencies to manage

### ✅ **Automatic Updates**
- When the platform improves, all clients benefit
- Use `@main` for latest features
- Or pin to a specific version: `@v1.0.0`

---

## 🔧 Customization Options

### Pin to a Specific Version

For production stability, pin to a specific version:

```yaml
uses: Darw-ai/github-pipelines-playground/.github/workflows/scaffold.yml@v1.0.0
```

### Use Different Branches

```yaml
uses: Darw-ai/github-pipelines-playground/.github/workflows/scaffold.yml@develop
```

### Override Inputs

You can provide default values or modify inputs:

```yaml
with:
  repo_name: ${{ inputs.repo_name || 'default-project' }}
  task_issue_number: ${{ inputs.task_issue_number || github.event.issue.number }}
  scaffold_prompt: ${{ inputs.scaffold_prompt }}
```

---

## 🎯 Architecture

```
┌──────────────────────────────────────────────────────────┐
│  SDLC Platform (Darw-ai/github-pipelines-playground)     │
│  - Reusable workflows (.github/workflows/)               │
│  - Scripts (scripts/)                                    │
│  - Single source of truth                                │
└────────────┬─────────────────────────────────────────────┘
             │
             │ (workflow_call)
             │
    ┌────────┴────────┬─────────────┐
    ▼                 ▼             ▼
┌─────────┐      ┌─────────┐   ┌─────────┐
│ Client-1│      │ Client-2│   │ Client-3│
│ 2 files │      │ 2 files │   │ 2 files │
│ + secrets│     │ + secrets│  │ + secrets│
└─────────┘      └─────────┘   └─────────┘
```

**Each client only needs:**
1. Two workflow wrapper files (scaffold.yml, sdlc-loop.yml)
2. Repository secrets configured
3. That's it!

---

## 🆘 Troubleshooting

### Workflow not appearing in Actions tab
- Make sure the workflow files are in `.github/workflows/`
- Check that GitHub Actions is enabled in your repository settings
- Verify the YAML syntax is valid

### "Reusable workflow not found" error
- Check that the repository name is correct: `Darw-ai/github-pipelines-playground`
- Verify you have access to the SDLC platform repository
- Make sure the branch exists (`@main`)

### Secrets not being passed
- Verify secrets are configured in your repository (not the platform repo)
- Secret names must match exactly (case-sensitive)
- Use `secrets: inherit` if you want to pass all secrets automatically

### Permission errors
- Make sure the `permissions:` block in your wrapper matches the requirements
- For SDLC loop, `id-token: write` is required for AWS OIDC

---

## 📚 Further Reading

- [GitHub Reusable Workflows Documentation](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
- [Main SDLC Platform Documentation](../../README.md)
- [Setup Guide](../../docs/SETUP.md)

---

**Need help?** Open an issue in the [SDLC Platform Repository](https://github.com/Darw-ai/github-pipelines-playground/issues)
